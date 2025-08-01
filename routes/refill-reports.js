import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware pour vérifier que l'utilisateur est chef de secteur ou admin
function requireSectorManagerOrAdmin(req, res, next) {
  if (req.user.role !== 'SECTOR_MANAGER' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux chefs de secteur et administrateurs' });
  }
  next();
}

// Vérifier que l'utilisateur a accès au site
async function checkSiteAccess(req, res, next) {
  try {
    const { siteId } = req.params;
    
    // Les admins ont accès à tous les sites
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    // Vérifier que le chef de secteur gère ce site
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, sectorManagerId: true }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    if (site.sectorManagerId !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé - vous ne gérez pas ce site' });
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification d\'accès au site:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification d\'accès' });
  }
}

// Créer un rapport de recharge
router.post('/:siteId', authenticateToken, requireSectorManagerOrAdmin, checkSiteAccess, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { 
      refillDate, 
      volumeRefilled, 
      previousLevel, 
      currentLevel, 
      cost, 
      supplier, 
      notes 
    } = req.body;
    const reportedById = req.user.id;

    // Validation des données requises
    if (!volumeRefilled || volumeRefilled <= 0) {
      return res.status(400).json({ error: 'Le volume rechargé est requis et doit être positif' });
    }

    if (!currentLevel || currentLevel < 0 || currentLevel > 100) {
      return res.status(400).json({ error: 'Le niveau actuel est requis et doit être entre 0 et 100%' });
    }

    if (previousLevel !== null && previousLevel !== undefined && (previousLevel < 0 || previousLevel > 100)) {
      return res.status(400).json({ error: 'Le niveau précédent doit être entre 0 et 100%' });
    }

    // Créer le rapport de recharge
    const refillReport = await prisma.refillReport.create({
      data: {
        siteId,
        reportedById,
        refillDate: refillDate ? new Date(refillDate) : new Date(),
        volumeRefilled: parseFloat(volumeRefilled),
        previousLevel: previousLevel ? parseInt(previousLevel) : null,
        currentLevel: parseInt(currentLevel),
        cost: cost ? parseFloat(cost) : null,
        supplier: supplier || null,
        notes: notes || null
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            reservoirCapacity: true
          }
        },
        reportedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Mettre à jour le niveau actuel du site
    await prisma.site.update({
      where: { id: siteId },
      data: {
        currentLevel: parseInt(currentLevel),
        lastRefill: refillReport.refillDate
      }
    });

    res.status(201).json({
      message: 'Rapport de recharge créé avec succès',
      report: refillReport
    });

  } catch (error) {
    console.error('Erreur lors de la création du rapport de recharge:', error);
    res.status(500).json({ error: 'Erreur lors de la création du rapport de recharge' });
  }
});

// Récupérer tous les rapports de recharge d'un site
router.get('/:siteId', authenticateToken, requireSectorManagerOrAdmin, checkSiteAccess, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    // Construire les filtres de date
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const whereClause = {
      siteId,
      ...(Object.keys(dateFilter).length > 0 && { refillDate: dateFilter })
    };

    // Récupérer les rapports avec pagination
    const [reports, totalCount] = await Promise.all([
      prisma.refillReport.findMany({
        where: whereClause,
        orderBy: { refillDate: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          site: {
            select: {
              id: true,
              name: true,
              address: true,
              reservoirCapacity: true
            }
          },
          reportedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.refillReport.count({ where: whereClause })
    ]);

    res.json({
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des rapports de recharge:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des rapports de recharge' });
  }
});

// Récupérer un rapport de recharge spécifique
router.get('/:siteId/:reportId', authenticateToken, requireSectorManagerOrAdmin, checkSiteAccess, async (req, res) => {
  try {
    const { siteId, reportId } = req.params;

    const report = await prisma.refillReport.findFirst({
      where: {
        id: reportId,
        siteId
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            reservoirCapacity: true
          }
        },
        reportedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Rapport de recharge non trouvé' });
    }

    res.json(report);

  } catch (error) {
    console.error('Erreur lors de la récupération du rapport de recharge:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du rapport de recharge' });
  }
});

// Modifier un rapport de recharge
router.patch('/:siteId/:reportId', authenticateToken, requireSectorManagerOrAdmin, checkSiteAccess, async (req, res) => {
  try {
    const { siteId, reportId } = req.params;
    const { 
      refillDate, 
      volumeRefilled, 
      previousLevel, 
      currentLevel, 
      cost, 
      supplier, 
      notes 
    } = req.body;

    // Vérifier que le rapport existe et appartient au site
    const existingReport = await prisma.refillReport.findFirst({
      where: {
        id: reportId,
        siteId
      }
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Rapport de recharge non trouvé' });
    }

    // Seul l'auteur du rapport ou un admin peut le modifier
    if (req.user.role !== 'ADMIN' && existingReport.reportedById !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres rapports' });
    }

    // Préparer les données de mise à jour
    const updateData = {};
    if (refillDate !== undefined) updateData.refillDate = new Date(refillDate);
    if (volumeRefilled !== undefined) updateData.volumeRefilled = parseFloat(volumeRefilled);
    if (previousLevel !== undefined) updateData.previousLevel = previousLevel ? parseInt(previousLevel) : null;
    if (currentLevel !== undefined) updateData.currentLevel = parseInt(currentLevel);
    if (cost !== undefined) updateData.cost = cost ? parseFloat(cost) : null;
    if (supplier !== undefined) updateData.supplier = supplier || null;
    if (notes !== undefined) updateData.notes = notes || null;

    // Validation
    if (updateData.volumeRefilled && updateData.volumeRefilled <= 0) {
      return res.status(400).json({ error: 'Le volume rechargé doit être positif' });
    }

    if (updateData.currentLevel && (updateData.currentLevel < 0 || updateData.currentLevel > 100)) {
      return res.status(400).json({ error: 'Le niveau actuel doit être entre 0 et 100%' });
    }

    // Mettre à jour le rapport
    const updatedReport = await prisma.refillReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            reservoirCapacity: true
          }
        },
        reportedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Rapport de recharge mis à jour avec succès',
      report: updatedReport
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du rapport de recharge:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du rapport de recharge' });
  }
});

// Supprimer un rapport de recharge
router.delete('/:siteId/:reportId', authenticateToken, requireSectorManagerOrAdmin, checkSiteAccess, async (req, res) => {
  try {
    const { siteId, reportId } = req.params;

    // Vérifier que le rapport existe et appartient au site
    const existingReport = await prisma.refillReport.findFirst({
      where: {
        id: reportId,
        siteId
      }
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Rapport de recharge non trouvé' });
    }

    // Seul l'auteur du rapport ou un admin peut le supprimer
    if (req.user.role !== 'ADMIN' && existingReport.reportedById !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres rapports' });
    }

    await prisma.refillReport.delete({
      where: { id: reportId }
    });

    res.status(204).end();

  } catch (error) {
    console.error('Erreur lors de la suppression du rapport de recharge:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du rapport de recharge' });
  }
});

// Obtenir des statistiques de consommation pour un site
router.get('/:siteId/stats', authenticateToken, requireSectorManagerOrAdmin, checkSiteAccess, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { period = '30' } = req.query; // période en jours

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Récupérer les rapports de la période
    const reports = await prisma.refillReport.findMany({
      where: {
        siteId,
        refillDate: {
          gte: startDate
        }
      },
      orderBy: { refillDate: 'asc' }
    });

    // Calculer les statistiques
    const totalVolume = reports.reduce((sum, report) => sum + report.volumeRefilled, 0);
    const totalCost = reports.reduce((sum, report) => sum + (report.cost || 0), 0);
    const averageVolume = reports.length > 0 ? totalVolume / reports.length : 0;
    const refillCount = reports.length;

    // Consommation quotidienne moyenne
    const dailyConsumption = reports.length > 1 ? totalVolume / parseInt(period) : 0;

    // Récupérer les informations du site
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        name: true,
        reservoirCapacity: true,
        currentLevel: true
      }
    });

    res.json({
      site,
      period: parseInt(period),
      statistics: {
        totalVolume,
        totalCost,
        averageVolume,
        refillCount,
        dailyConsumption,
        costPerLiter: totalVolume > 0 ? totalCost / totalVolume : 0
      },
      reports: reports.map(report => ({
        date: report.refillDate,
        volume: report.volumeRefilled,
        cost: report.cost,
        currentLevel: report.currentLevel
      }))
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router;
