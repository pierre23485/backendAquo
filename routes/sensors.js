import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware pour vérifier le rôle TECHNICIAN
function requireTechnician(req, res, next) {
  if (req.user.role !== 'TECHNICIAN') {
    return res.status(403).json({ error: 'Accès réservé aux techniciens' });
  }
  next();
}

// Lister tous les capteurs avec leurs informations de base
router.get('/', authenticateToken, requireTechnician, async (req, res) => {
  try {
    const sensors = await prisma.sensor.findMany({
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        configuration: true,
        diagnostics: {
          orderBy: { lastChecked: 'desc' },
          take: 1
        }
      },
      orderBy: { installedAt: 'desc' }
    });
    res.json(sensors);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des capteurs' });
  }
});

// Obtenir un capteur spécifique avec toutes ses informations
router.get('/:sensorId', authenticateToken, requireTechnician, async (req, res) => {
  const { sensorId } = req.params;
  try {
    const sensor = await prisma.sensor.findUnique({
      where: { id: sensorId },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            currentLevel: true
          }
        },
        configuration: true,
        diagnostics: {
          orderBy: { lastChecked: 'desc' },
          take: 10
        },
        maintenances: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            technician: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
    
    if (!sensor) {
      return res.status(404).json({ error: 'Capteur non trouvé' });
    }
    
    res.json(sensor);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du capteur' });
  }
});

// Ajouter un nouveau capteur
router.post('/', authenticateToken, requireTechnician, async (req, res) => {
  const { siteId, name, type, serialNumber } = req.body;
  try {
    const sensor = await prisma.sensor.create({
      data: {
        siteId,
        name,
        type,
        serialNumber
      },
      include: {
        site: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    res.status(201).json(sensor);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Numéro de série déjà utilisé' });
    } else {
      res.status(500).json({ error: 'Erreur lors de la création du capteur' });
    }
  }
});

// Modifier un capteur
router.patch('/:sensorId', authenticateToken, requireTechnician, async (req, res) => {
  const { sensorId } = req.params;
  const { name, type, isActive } = req.body;
  try {
    const sensor = await prisma.sensor.update({
      where: { id: sensorId },
      data: { name, type, isActive },
      include: {
        site: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    res.json(sensor);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la modification du capteur' });
  }
});

// Supprimer un capteur
router.delete('/:sensorId', authenticateToken, requireTechnician, async (req, res) => {
  const { sensorId } = req.params;
  try {
    await prisma.sensor.delete({
      where: { id: sensorId }
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du capteur' });
  }
});

// 1. Gérer les configurations des capteurs
router.post('/:sensorId/config', authenticateToken, requireTechnician, async (req, res) => {
  const { sensorId } = req.params;
  const { calibration, parameters } = req.body;
  try {
    const config = await prisma.sensorConfiguration.upsert({
      where: { sensorId },
      update: { calibration, parameters },
      create: { sensorId, calibration, parameters },
    });
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la configuration du capteur' });
  }
});

router.patch('/:sensorId/config', authenticateToken, requireTechnician, async (req, res) => {
  const { sensorId } = req.params;
  const { calibration, parameters } = req.body;
  try {
    const config = await prisma.sensorConfiguration.update({
      where: { sensorId },
      data: { calibration, parameters },
    });
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la modification de la configuration' });
  }
});

router.delete('/:sensorId/config', authenticateToken, requireTechnician, async (req, res) => {
  const { sensorId } = req.params;
  try {
    await prisma.sensorConfiguration.delete({ where: { sensorId } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la configuration' });
  }
});

// 2. Calibrer et tester le réseau de capteurs (diagnostics)
router.post('/:sensorId/diagnostics', authenticateToken, requireTechnician, async (req, res) => {
  const { sensorId } = req.params;
  const { batteryLevel, signalStrength, status, details } = req.body;
  try {
    const diagnostic = await prisma.sensorDiagnostic.create({
      data: { sensorId, batteryLevel, signalStrength, status, details },
    });
    res.status(201).json(diagnostic);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'ajout du diagnostic' });
  }
});

// 3. Consulter diagnostics détaillés
router.get('/:sensorId/diagnostics', authenticateToken, requireTechnician, async (req, res) => {
  const { sensorId } = req.params;
  try {
    const diagnostics = await prisma.sensorDiagnostic.findMany({
      where: { sensorId },
      orderBy: { lastChecked: 'desc' },
    });
    res.json(diagnostics);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des diagnostics' });
  }
});

// 4. Générer des rapports de maintenance
router.post('/:sensorId/maintenance', authenticateToken, requireTechnician, async (req, res) => {
  const { sensorId } = req.params;
  const { reportType, summary, details } = req.body;
  try {
    const report = await prisma.sensorMaintenanceReport.create({
      data: {
        sensorId,
        technicianId: req.user.id,
        reportType,
        summary,
        details,
      },
    });
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création du rapport de maintenance' });
  }
});

// Consulter les rapports de maintenance d'un capteur
router.get('/:sensorId/maintenance', authenticateToken, requireTechnician, async (req, res) => {
  const { sensorId } = req.params;
  try {
    const reports = await prisma.sensorMaintenanceReport.findMany({
      where: { sensorId },
      orderBy: { createdAt: 'desc' },
      include: {
        technician: { select: { id: true, name: true } }
      }
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
  }
});

// Statistiques pour les techniciens
router.get('/stats/overview', authenticateToken, requireTechnician, async (req, res) => {
  try {
    const [
      totalSensors,
      activeSensors,
      sensorsWithIssues,
      recentMaintenanceReports
    ] = await Promise.all([
      prisma.sensor.count(),
      prisma.sensor.count({ where: { isActive: true } }),
      prisma.sensorDiagnostic.count({
        where: {
          status: { in: ['WARNING', 'ERROR'] },
          lastChecked: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Dernières 24h
        }
      }),
      prisma.sensorMaintenanceReport.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Dernière semaine
        }
      })
    ]);

    res.json({
      totalSensors,
      activeSensors,
      sensorsWithIssues,
      recentMaintenanceReports,
      inactiveSensors: totalSensors - activeSensors
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// Capteurs nécessitant une attention (batterie faible, signal faible, etc.)
router.get('/alerts/attention-needed', authenticateToken, requireTechnician, async (req, res) => {
  try {
    const sensorsNeedingAttention = await prisma.sensor.findMany({
      where: {
        isActive: true,
        diagnostics: {
          some: {
            OR: [
              { batteryLevel: { lt: 20 } },
              { signalStrength: { lt: 50 } },
              { status: { in: ['WARNING', 'ERROR'] } }
            ],
            lastChecked: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        }
      },
      include: {
        site: {
          select: { id: true, name: true, address: true }
        },
        diagnostics: {
          orderBy: { lastChecked: 'desc' },
          take: 1
        }
      }
    });

    res.json(sensorsNeedingAttention);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des capteurs nécessitant une attention' });
  }
});

export default router;