import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route POST /api/sensor-data
 * @desc Recevoir les données du capteur à ultrasons
 * @access Public (ou protégé selon vos besoins)
 */
router.post('/', async (req, res) => {
  try {
    const { siteId, distance, source = 'ultrasonic_sensor' } = req.body;

    // Validation des données
    if (!siteId || typeof distance === 'undefined') {
      return res.status(400).json({ 
        error: 'Champs manquants',
        details: 'Les champs siteId et distance sont requis' 
      });
    }

    // Vérifier que le site existe
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, reservoirCapacity: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    // Calculer le niveau en pourcentage (à adapter selon votre configuration)
    // Supposons que distance = 0 signifie réservoir plein, et distance = hauteur réservoir signifie vide
    const maxDistance = 100; // Hauteur totale du réservoir en cm
    let level = Math.max(0, 100 - (distance / maxDistance) * 100);
    level = Math.min(100, level); // Ne pas dépasser 100%

    // Enregistrer la mesure
    await prisma.$transaction([
      // Mettre à jour le niveau actuel du site
      prisma.site.update({
        where: { id: siteId },
        data: { 
          currentLevel: Math.round(level),
          updatedAt: new Date()
        }
      }),
      
      // Historiser la mesure
      prisma.waterLevel.create({
        data: {
          siteId,
          level: Math.round(level),
          source
        }
      })
    ]);

    // Vérifier les alertes de niveau bas
    if (level < 20) { // Seuil à ajuster selon vos besoins
      await prisma.alert.upsert({
        where: { 
          siteId_type: {
            siteId,
            type: 'LOW_WATER_LEVEL'
          }
        },
        update: {
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          siteId,
          type: 'LOW_WATER_LEVEL',
          message: `Niveau d'eau critique: ${Math.round(level)}%`,
          level: level < 10 ? 'CRITICAL' : 'WARNING',
          isActive: true
        }
      });
    }

    res.status(200).json({ 
      success: true,
      level: Math.round(level),
      message: 'Données enregistrées avec succès'
    });

  } catch (error) {
    console.error('Erreur lors du traitement des données du capteur:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message 
    });
  }
});

export default router;
