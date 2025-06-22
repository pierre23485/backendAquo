import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, requireSectorAccess } from '../middleware/auth.js';
import { publishMessage } from '../services/mqttService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all sites (admin) or user's sites (sector manager)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const whereClause = req.user.role === 'ADMIN' 
      ? {} 
      : { sectorManagerId: req.user.id };

    const sites = await prisma.site.findMany({
      where: whereClause,
      include: {
        sectorManager: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        households: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            contact: true,
            address: true
          }
        },
        waterLevels: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        _count: {
          select: {
            households: { where: { isActive: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(sites);
  } catch (error) {
    console.error('Erreur lors de la récupération des sites:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des sites' });
  }
});

// Get single site
router.get('/:id', authenticateToken, requireSectorAccess, async (req, res) => {
  try {
    const site = await prisma.site.findUnique({
      where: { id: req.params.id },
      include: {
        sectorManager: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        households: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        },
        waterLevels: {
          orderBy: { timestamp: 'desc' },
          take: 30 // Last 30 readings
        },
        notifications: {
          orderBy: { sentAt: 'desc' },
          take: 10
        },
        maintenances: {
          orderBy: { scheduledAt: 'desc' },
          take: 5
        }
      }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    res.json(site);
  } catch (error) {
    console.error('Erreur lors de la récupération du site:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du site' });
  }
});

// Create new site (admin only)
router.post('/', authenticateToken, requireRole(['ADMIN']), [
  body('name').trim().isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères'),
  body('address').trim().isLength({ min: 5 }).withMessage('L\'adresse doit contenir au moins 5 caractères'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
  body('reservoirCapacity').isInt({ min: 1 }).withMessage('La capacité doit être un nombre positif'),
  body('currentLevel').isInt({ min: 0 }).withMessage('Le niveau actuel doit être un nombre positif'),
  body('sectorManagerId').notEmpty().withMessage('ID du chef de secteur requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      address,
      latitude,
      longitude,
      reservoirCapacity,
      currentLevel,
      sectorManagerId
    } = req.body;

    // Verify sector manager exists and has correct role
    const sectorManager = await prisma.user.findUnique({
      where: { id: sectorManagerId },
      select: { id: true, role: true, isActive: true }
    });

    if (!sectorManager || sectorManager.role !== 'SECTOR_MANAGER' || !sectorManager.isActive) {
      return res.status(400).json({ error: 'Chef de secteur invalide' });
    }

    // Check if current level doesn't exceed capacity
    if (currentLevel > reservoirCapacity) {
      return res.status(400).json({ error: 'Le niveau actuel ne peut pas dépasser la capacité' });
    }

    const site = await prisma.site.create({
      data: {
        name,
        address,
        latitude,
        longitude,
        reservoirCapacity,
        currentLevel,
        sectorManagerId,
        lastRefill: new Date()
      },
      include: {
        sectorManager: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Create initial water level record
    await prisma.waterLevel.create({
      data: {
        siteId: site.id,
        level: currentLevel,
        source: 'manual'
      }
    });

    // Publier la création du site sur MQTT
    await publishMessage('water/sites/new', {
      siteId: site.id,
      name: site.name,
      location: { latitude, longitude },
      capacity: site.reservoirCapacity
    });

    res.status(201).json({
      message: 'Site créé avec succès',
      site
    });
  } catch (error) {
    console.error('Erreur lors de la création du site:', error);
    res.status(500).json({ error: 'Erreur lors de la création du site' });
  }
});

// Update site
router.put('/:id', authenticateToken, requireRole(['ADMIN']), [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères'),
  body('address').optional().trim().isLength({ min: 5 }).withMessage('L\'adresse doit contenir au moins 5 caractères'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
  body('reservoirCapacity').optional().isInt({ min: 1 }).withMessage('La capacité doit être un nombre positif'),
  body('currentLevel').optional().isInt({ min: 0 }).withMessage('Le niveau actuel doit être un nombre positif'),
  body('sectorManagerId').optional().notEmpty().withMessage('ID du chef de secteur requis'),
  body('status').optional().isIn(['ACTIVE', 'MAINTENANCE', 'EMERGENCY', 'INACTIVE']).withMessage('Statut invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const siteId = req.params.id;
    const updateData = { ...req.body };

    // Verify site exists
    const existingSite = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!existingSite) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    // If updating sector manager, verify they exist and have correct role
    if (updateData.sectorManagerId) {
      const sectorManager = await prisma.user.findUnique({
        where: { id: updateData.sectorManagerId },
        select: { id: true, role: true, isActive: true }
      });

      if (!sectorManager || sectorManager.role !== 'SECTOR_MANAGER' || !sectorManager.isActive) {
        return res.status(400).json({ error: 'Chef de secteur invalide' });
      }
    }

    // Check capacity vs current level
    const capacity = updateData.reservoirCapacity || existingSite.reservoirCapacity;
    const currentLevel = updateData.currentLevel || existingSite.currentLevel;
    
    if (currentLevel > capacity) {
      return res.status(400).json({ error: 'Le niveau actuel ne peut pas dépasser la capacité' });
    }

    const site = await prisma.site.update({
      where: { id: siteId },
      data: updateData,
      include: {
        sectorManager: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        households: {
          where: { isActive: true }
        }
      }
    });

    // If current level was updated, create a new water level record
    if (updateData.currentLevel && updateData.currentLevel !== existingSite.currentLevel) {
      await prisma.waterLevel.create({
        data: {
          siteId: site.id,
          level: updateData.currentLevel,
          source: 'manual'
        }
      });
    }

    // Publier la mise à jour sur MQTT
    await publishMessage('water/sites/update', {
      siteId: site.id,
      name: site.name,
      location: { latitude: site.latitude, longitude: site.longitude },
      capacity: site.reservoirCapacity
    });

    res.json({
      message: 'Site mis à jour avec succès',
      site
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du site:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du site' });
  }
});

// Delete site (admin only)
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const siteId = req.params.id;

    // Check if site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        households: true,
        notifications: true,
        waterLevels: true,
        maintenances: true
      }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    // Delete related records first (due to foreign key constraints)
    await prisma.$transaction([
      prisma.waterLevel.deleteMany({ where: { siteId } }),
      prisma.maintenance.deleteMany({ where: { siteId } }),
      prisma.notification.deleteMany({ where: { siteId } }),
      prisma.household.deleteMany({ where: { siteId } }),
      prisma.site.delete({ where: { id: siteId } })
    ]);

    // Publier la suppression sur MQTT
    await publishMessage('water/sites/delete', {
      siteId: siteId
    });

    res.json({ message: 'Site supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du site:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du site' });
  }
});

// Get water level history for a site
router.get('/:id/water-levels', authenticateToken, requireSectorAccess, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const siteId = req.params.id;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const waterLevels = await prisma.waterLevel.findMany({
      where: {
        siteId,
        timestamp: {
          gte: startDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    res.json(waterLevels);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des niveaux:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
});

// Update water level (for IoT sensors or manual updates)
router.post('/:id/water-level', authenticateToken, requireSectorAccess, [
  body('level').isInt({ min: 0 }).withMessage('Le niveau doit être un nombre positif'),
  body('source').optional().isIn(['sensor', 'manual', 'estimated']).withMessage('Source invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const siteId = req.params.id;
    const { level, source = 'manual' } = req.body;

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, reservoirCapacity: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    // Check if level doesn't exceed capacity
    if (level > site.reservoirCapacity) {
      return res.status(400).json({ error: 'Le niveau ne peut pas dépasser la capacité du réservoir' });
    }

    // Update site current level and create water level record
    const [updatedSite, waterLevel] = await prisma.$transaction([
      prisma.site.update({
        where: { id: siteId },
        data: { currentLevel: level }
      }),
      prisma.waterLevel.create({
        data: {
          siteId,
          level,
          source
        }
      })
    ]);

    // Calculer le pourcentage de remplissage
    const levelPercentage = (level / site.reservoirCapacity) * 100;

    // Publier la mise à jour du niveau sur MQTT
    await publishMessage(`water/level/${site.id}`, {
      siteId: site.id,
      level: level,
      percentage: levelPercentage,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Niveau d\'eau mis à jour avec succès',
      site: updatedSite,
      waterLevel
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du niveau d\'eau:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du niveau d\'eau' });
  }
});

export default router;