import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware pour vérifier le rôle ADMIN
function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

// Récupérer tous les paramètres système
router.get('/system', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await prisma.systemSettings.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Organiser par catégorie
    const organizedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push({
        ...setting,
        value: JSON.parse(setting.value)
      });
      return acc;
    }, {});

    res.json(organizedSettings);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres système:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres système' });
  }
});

// Récupérer un paramètre système spécifique
router.get('/system/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await prisma.systemSettings.findUnique({
      where: { key },
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Paramètre non trouvé' });
    }

    res.json({
      ...setting,
      value: JSON.parse(setting.value)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du paramètre:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du paramètre' });
  }
});

// Créer ou mettre à jour un paramètre système
router.post('/system', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key, value, description, category } = req.body;
    const userId = req.user.id;

    // Validation
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Clé et valeur requises' });
    }

    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: {
        value: JSON.stringify(value),
        description,
        category: category || 'general',
        updatedById: userId,
        updatedAt: new Date()
      },
      create: {
        key,
        value: JSON.stringify(value),
        description,
        category: category || 'general',
        updatedById: userId
      },
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      ...setting,
      value: JSON.parse(setting.value)
    });
  } catch (error) {
    console.error('Erreur lors de la création/mise à jour du paramètre:', error);
    res.status(500).json({ error: 'Erreur lors de la création/mise à jour du paramètre' });
  }
});

// Supprimer un paramètre système
router.delete('/system/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    
    await prisma.systemSettings.update({
      where: { key },
      data: { isActive: false }
    });

    res.status(204).end();
  } catch (error) {
    console.error('Erreur lors de la suppression du paramètre:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du paramètre' });
  }
});

// Récupérer les paramètres d'un site
router.get('/site/:siteId', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;
    
    // Vérifier que l'utilisateur a accès au site
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, sectorManagerId: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    // Seuls les admins et les gestionnaires du site peuvent voir les paramètres
    if (req.user.role !== 'ADMIN' && req.user.id !== site.sectorManagerId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const settings = await prisma.siteSettings.findMany({
      where: { 
        siteId,
        isActive: true 
      },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Organiser par catégorie
    const organizedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push({
        ...setting,
        value: JSON.parse(setting.value)
      });
      return acc;
    }, {});

    res.json(organizedSettings);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres du site:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres du site' });
  }
});

// Créer ou mettre à jour un paramètre de site
router.post('/site/:siteId', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { key, value, description, category } = req.body;
    const userId = req.user.id;

    // Vérifier que l'utilisateur a accès au site
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, sectorManagerId: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    // Seuls les admins et les gestionnaires du site peuvent modifier les paramètres
    if (req.user.role !== 'ADMIN' && req.user.id !== site.sectorManagerId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Validation
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Clé et valeur requises' });
    }

    const setting = await prisma.siteSettings.upsert({
      where: { 
        siteId_key: {
          siteId,
          key
        }
      },
      update: {
        value: JSON.stringify(value),
        description,
        category: category || 'site',
        updatedById: userId,
        updatedAt: new Date()
      },
      create: {
        siteId,
        key,
        value: JSON.stringify(value),
        description,
        category: category || 'site',
        updatedById: userId
      },
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      ...setting,
      value: JSON.parse(setting.value)
    });
  } catch (error) {
    console.error('Erreur lors de la création/mise à jour du paramètre de site:', error);
    res.status(500).json({ error: 'Erreur lors de la création/mise à jour du paramètre de site' });
  }
});

// Récupérer les seuils d'alerte globaux
router.get('/alerts/thresholds', authenticateToken, async (req, res) => {
  try {
    const thresholds = await prisma.systemSettings.findMany({
      where: {
        category: 'alerts',
        isActive: true,
        key: {
          startsWith: 'threshold_'
        }
      }
    });

    const organizedThresholds = thresholds.reduce((acc, setting) => {
      const key = setting.key.replace('threshold_', '');
      acc[key] = JSON.parse(setting.value);
      return acc;
    }, {});

    res.json(organizedThresholds);
  } catch (error) {
    console.error('Erreur lors de la récupération des seuils d\'alerte:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des seuils d\'alerte' });
  }
});

// Mettre à jour les seuils d'alerte globaux
router.post('/alerts/thresholds', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const thresholds = req.body;
    const userId = req.user.id;
    const results = [];

    for (const [key, value] of Object.entries(thresholds)) {
      const setting = await prisma.systemSettings.upsert({
        where: { key: `threshold_${key}` },
        update: {
          value: JSON.stringify(value),
          updatedById: userId,
          updatedAt: new Date()
        },
        create: {
          key: `threshold_${key}`,
          value: JSON.stringify(value),
          category: 'alerts',
          description: `Seuil d'alerte pour ${key}`,
          updatedById: userId
        }
      });
      results.push(setting);
    }

    res.json({ 
      message: 'Seuils d\'alerte mis à jour avec succès',
      updatedCount: results.length 
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des seuils d\'alerte:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des seuils d\'alerte' });
  }
});

// Récupérer les paramètres saisonniers
router.get('/seasonal', authenticateToken, async (req, res) => {
  try {
    const seasonalSettings = await prisma.systemSettings.findMany({
      where: {
        category: 'seasonal',
        isActive: true
      },
      orderBy: { key: 'asc' }
    });

    const organizedSettings = seasonalSettings.reduce((acc, setting) => {
      acc[setting.key] = JSON.parse(setting.value);
      return acc;
    }, {});

    res.json(organizedSettings);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres saisonniers:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres saisonniers' });
  }
});

// Mettre à jour les paramètres saisonniers
router.post('/seasonal', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const seasonalSettings = req.body;
    const userId = req.user.id;
    const results = [];

    for (const [key, value] of Object.entries(seasonalSettings)) {
      const setting = await prisma.systemSettings.upsert({
        where: { key },
        update: {
          value: JSON.stringify(value),
          category: 'seasonal',
          updatedById: userId,
          updatedAt: new Date()
        },
        create: {
          key,
          value: JSON.stringify(value),
          category: 'seasonal',
          description: `Paramètre saisonnier: ${key}`,
          updatedById: userId
        }
      });
      results.push(setting);
    }

    res.json({ 
      message: 'Paramètres saisonniers mis à jour avec succès',
      updatedCount: results.length 
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres saisonniers:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres saisonniers' });
  }
});

export default router; 