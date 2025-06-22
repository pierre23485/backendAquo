import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { sendAlertNotifications } from '../services/notificationService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Récupérer toutes les alertes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        site: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
    res.json(alerts);
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des alertes' });
  }
});

// Créer une nouvelle alerte
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, message, siteId, level } = req.body;

    const alert = await prisma.alert.create({
      data: {
        type,
        message,
        siteId,
        level,
        isActive: true,
        createdById: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        site: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Envoyer les notifications
    try {
      await sendAlertNotifications(alert);
    } catch (notificationError) {
      console.error('Erreur lors de l\'envoi des notifications:', notificationError);
      // On continue même si l'envoi des notifications échoue
    }

    res.status(201).json(alert);
  } catch (error) {
    console.error('Erreur lors de la création de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'alerte' });
  }
});

// Mettre à jour le statut d'une alerte
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, actionTaken } = req.body;

    const alert = await prisma.alert.update({
      where: { id },
      data: {
        isActive,
        actionTaken,
        actionTakenAt: actionTaken ? new Date() : null,
        resolvedAt: !isActive ? new Date() : null,
        updatedAt: new Date()
      },
      include: {
        site: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Si l'alerte est résolue, envoyer une notification de résolution
    if (!isActive) {
      try {
        await sendAlertNotifications({
          ...alert,
          message: `ALERTE RÉSOLUE: ${alert.message}\nAction prise: ${actionTaken || 'Non spécifiée'}`
        });
      } catch (notificationError) {
        console.error('Erreur lors de l\'envoi des notifications de résolution:', notificationError);
      }
    }

    res.json(alert);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'alerte' });
  }
});

// Récupérer une alerte spécifique
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        site: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alerte non trouvée' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'alerte' });
  }
});

export default router; 