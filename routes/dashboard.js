import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Récupérer les statistiques du tableau de bord
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await prisma.$transaction([
      prisma.site.count(),
      prisma.household.count({ where: { isActive: true } }),
      prisma.notification.count({ where: { status: 'pending' } }),
      prisma.site.aggregate({
        _avg: {
          currentLevel: true
        }
      })
    ]);

    res.json({
      totalSites: stats[0],
      totalHouseholds: stats[1],
      pendingNotifications: stats[2],
      averageWaterLevel: stats[3]._avg.currentLevel || 0
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router; 