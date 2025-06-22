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

export default router; 