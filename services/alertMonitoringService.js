import { PrismaClient } from '@prisma/client';
import { AlertType, AlertLevel } from '@prisma/client';
import { sendAlertNotifications } from './notificationService.js';

const prisma = new PrismaClient();

// Seuils de déclenchement des alertes
const WATER_LEVEL_THRESHOLDS = {
  CRITICAL: 20, // 20% de la capacité
  WARNING: 30,  // 30% de la capacité
};

// Intervalle de vérification (en millisecondes)
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

let monitoringInterval = null;

export async function startAlertMonitoring() {
  try {
    console.log('🔄 Démarrage de la surveillance des alertes...');
    
    // Vérification initiale
    await checkAllSites();
    
    // Mise en place de la vérification périodique
    monitoringInterval = setInterval(async () => {
      try {
        await checkAllSites();
      } catch (error) {
        console.error('❌ Erreur lors de la vérification périodique des alertes:', error);
        // Ne pas arrêter l'intervalle en cas d'erreur
      }
    }, CHECK_INTERVAL);
    
    console.log('✅ Surveillance des alertes démarrée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors du démarrage de la surveillance des alertes:', error);
    throw error;
  }
}

export function stopAlertMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('🛑 Surveillance des alertes arrêtée');
  }
}

async function checkAllSites() {
  try {
    const sites = await prisma.site.findMany({
      include: {
        waterLevels: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    console.log(`🔍 Vérification de ${sites.length} sites...`);

    for (const site of sites) {
      try {
        await checkSiteAlerts(site);
      } catch (error) {
        console.error(`❌ Erreur lors de la vérification du site ${site.id}:`, error);
        // Continuer avec les autres sites
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des sites:', error);
    throw error;
  }
}

async function checkSiteAlerts(site) {
  try {
    // Vérification du niveau d'eau
    await checkWaterLevel(site);

    // Vérification des capteurs
    await checkSensors(site);

    // Vérification des pompes
    await checkPumps(site);

    // Vérification des fuites
    await checkLeaks(site);

    // Vérification des maintenances
    await checkMaintenance(site);
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification des alertes pour le site ${site.id}:`, error);
    throw error;
  }
}

async function checkWaterLevel(site) {
  try {
    const currentLevel = site.currentLevel || 0;
    const capacity = site.reservoirCapacity || 100;
    const percentage = (currentLevel / capacity) * 100;

    // Vérifier si une alerte de niveau bas existe déjà
    const existingAlert = await prisma.alert.findFirst({
      where: {
        siteId: site.id,
        type: AlertType.LOW_WATER_LEVEL,
        isActive: true
      }
    });

    if (percentage <= WATER_LEVEL_THRESHOLDS.CRITICAL && !existingAlert) {
      await createAlert(site, {
        type: AlertType.LOW_WATER_LEVEL,
        level: AlertLevel.CRITICAL,
        message: `Niveau d'eau critique (${percentage.toFixed(1)}%)`
      });
    } else if (percentage <= WATER_LEVEL_THRESHOLDS.WARNING && !existingAlert) {
      await createAlert(site, {
        type: AlertType.LOW_WATER_LEVEL,
        level: AlertLevel.WARNING,
        message: `Niveau d'eau bas (${percentage.toFixed(1)}%)`
      });
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification du niveau d'eau pour le site ${site.id}:`, error);
    throw error;
  }
}

async function checkSensors(site) {
  try {
    // Vérifier les dernières lectures des capteurs
    const lastReadings = site.waterLevels?.[0];
    
    if (!lastReadings || (Date.now() - new Date(lastReadings.timestamp).getTime() > 30 * 60 * 1000)) {
      await createAlert(site, {
        type: AlertType.SENSOR_FAILURE,
        level: AlertLevel.WARNING,
        message: 'Dysfonctionnement des capteurs de niveau d\'eau'
      });
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification des capteurs pour le site ${site.id}:`, error);
    throw error;
  }
}

async function checkPumps(site) {
  try {
    // Logique de vérification des pompes
    // À implémenter selon les besoins spécifiques
    // Pour l'instant, pas d'implémentation pour éviter les erreurs
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification des pompes pour le site ${site.id}:`, error);
    throw error;
  }
}

async function checkLeaks(site) {
  try {
    // Logique de détection des fuites
    // À implémenter selon les besoins spécifiques
    // Pour l'instant, pas d'implémentation pour éviter les erreurs
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification des fuites pour le site ${site.id}:`, error);
    throw error;
  }
}

async function checkMaintenance(site) {
  try {
    // Vérifier les maintenances préventives à venir
    const upcomingMaintenance = await prisma.maintenance.findFirst({
      where: {
        siteId: site.id,
        status: 'SCHEDULED',
        scheduledAt: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
        }
      }
    });

    if (upcomingMaintenance) {
      await createAlert(site, {
        type: AlertType.MAINTENANCE_DUE,
        level: AlertLevel.INFO,
        message: `Maintenance prévue le ${new Date(upcomingMaintenance.scheduledAt).toLocaleDateString('fr-FR')}`
      });
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification des maintenances pour le site ${site.id}:`, error);
    throw error;
  }
}

async function createAlert(site, alertData) {
  try {
    const alert = await prisma.alert.create({
      data: {
        ...alertData,
        siteId: site.id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`🚨 Alerte créée pour le site ${site.id}: ${alertData.type}`);

    // Envoyer les notifications
    try {
      await sendAlertNotifications(alert);
    } catch (notificationError) {
      console.error('❌ Erreur lors de l\'envoi des notifications:', notificationError);
      // Ne pas faire échouer la création de l'alerte si les notifications échouent
    }

    return alert;
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'alerte:', error);
    throw error;
  }
} 