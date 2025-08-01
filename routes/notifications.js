import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Récupérer toutes les notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { sentAt: 'desc' },
      include: {
        site: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    res.json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
});

// Créer une nouvelle notification
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, message, siteId, recipients } = req.body;
    const userId = req.user.id; // Récupère l'ID de l'utilisateur connecté depuis le token

    // Validation du type de notification
    if (!['LOW_LEVEL', 'REFILL', 'MAINTENANCE', 'EMERGENCY', 'GENERAL'].includes(type)) {
      return res.status(400).json({ 
        error: 'Type de notification invalide. Les types valides sont: LOW_LEVEL, REFILL, MAINTENANCE, EMERGENCY, GENERAL' 
      });
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        message,
        siteId: siteId || '',
        recipients: recipients || [],
        status: 'PENDING',
        sentById: userId,
        sentAt: new Date()
      }
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la notification' });
  }
});

// Récupérer les alertes des sites pour un technicien
router.get('/technician-site-alerts/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérifier que l'utilisateur est un technicien
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'TECHNICIAN') {
      return res.status(403).json({ error: 'Accès réservé aux techniciens' });
    }

    // Récupérer les alertes actives pour tous les sites
    const alerts = await prisma.alert.findMany({
      where: {
        isActive: true,
        level: { in: ['WARNING', 'CRITICAL', 'EMERGENCY'] }
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            currentLevel: true,
            reservoirCapacity: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(alerts);
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes des sites:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des alertes des sites' });
  }
});

// Récupérer les préférences de notifications d'un utilisateur
router.get('/preferences/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Pour l'instant, retourner des préférences par défaut
    // Tu peux étendre le schéma pour stocker les vraies préférences
    const preferences = {
      userId: user.id,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      alertTypes: {
        LOW_LEVEL: true,
        REFILL: true,
        MAINTENANCE: true,
        EMERGENCY: true,
        GENERAL: false
      },
      frequency: 'immediate', // immediate, daily, weekly
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };

    res.json(preferences);
  } catch (error) {
    console.error('Erreur lors de la récupération des préférences:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des préférences' });
  }
});

// Mettre à jour les préférences de notifications
router.put('/preferences/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;
    
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Pour l'instant, retourner un succès
    // Tu peux étendre le schéma pour sauvegarder les vraies préférences
    res.json({ 
      message: 'Préférences mises à jour avec succès',
      userId: user.id,
      preferences: preferences
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des préférences' });
  }
});

export default router; 