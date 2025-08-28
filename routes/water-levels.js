import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create a new water level reading (can be called by sensor or authenticated user)
router.post('/', async (req, res) => {
  try {
    // Pour les capteurs, on s'attend à une distance en cm
    const { siteId, distance, source = 'ultrasonic_sensor' } = req.body;
    
    // Validation des données
    if (!siteId || distance === undefined) {
      return res.status(400).json({ error: 'siteId et distance sont requis' });
    }
    
    // Convertir la distance en niveau d'eau (à ajuster selon votre configuration)
    // Par défaut, on suppose que le capteur est à 100cm du fond du réservoir
    // et que la distance mesurée est la distance entre le capteur et la surface de l'eau
    const MAX_DISTANCE = 100; // en cm, à ajuster selon votre installation
    const distanceFromBottom = MAX_DISTANCE - parseFloat(distance);
    const level = Math.max(0, distanceFromBottom); // Éviter les valeurs négatives
    
    // Vérifier si le site existe
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, reservoirCapacity: true }
    });
    
    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    // Créer l'enregistrement du niveau d'eau
    const waterLevel = await prisma.waterLevel.create({
      data: {
        siteId,
        level: level,
        source,
        metadata: {
          distance: parseFloat(distance),
          maxDistance: MAX_DISTANCE
        }
      },
      include: {
        site: true
      }
    });

    // Mettre à jour le niveau actuel du site
    await prisma.site.update({
      where: { id: siteId },
      data: { 
        currentLevel: level,
        // Mettre à jour la date de dernière mise à jour
        updatedAt: new Date()
      }
    });
    
    // Log pour le débogage
    console.log(`Niveau d'eau mis à jour pour le site ${siteId}: ${level} (distance: ${distance}cm)`);

    // TODO: Add alert logic if level is below threshold

    res.status(201).json(waterLevel);
  } catch (error) {
    console.error('Error creating water level:', error);
    res.status(500).json({ error: 'Failed to record water level' });
  }
});

// Get water level history for a site
router.get('/:siteId', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { limit = 100, skip = 0 } = req.query;

    const waterLevels = await prisma.waterLevel.findMany({
      where: { siteId },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      skip: parseInt(skip)
    });

    res.json(waterLevels);
  } catch (error) {
    console.error('Error fetching water levels:', error);
    res.status(500).json({ error: 'Failed to fetch water levels' });
  }
});

// Get current water level for a site
router.get('/:siteId/current', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;

    const currentLevel = await prisma.waterLevel.findFirst({
      where: { siteId },
      orderBy: { timestamp: 'desc' },
      select: { level: true, timestamp: true }
    });

    if (!currentLevel) {
      return res.status(404).json({ error: 'No water level data found' });
    }

    res.json(currentLevel);
  } catch (error) {
    console.error('Error fetching current water level:', error);
    res.status(500).json({ error: 'Failed to fetch current water level' });
  }
});

// Exporter le routeur pour une utilisation dans d'autres fichiers
export default router;
