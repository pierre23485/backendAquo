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

export async function startAlertMonitoring() {
  console.log('Démarrage de la surveillance des alertes...');
  
  // Vérification initiale
  await checkAllSites();
  
  // Mise en place de la vérification périodique
  setInterval(checkAllSites, CHECK_INTERVAL);
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

    for (const site of sites) {
      await checkSiteAlerts(site);
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des sites:', error);
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
    console.error(`Erreur lors de la vérification des alertes pour le site ${site.id}:`, error);
  }
}

async function checkWaterLevel(site) {
  const currentLevel = site.currentLevel;
  const capacity = site.reservoirCapacity;
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
}

async function checkSensors(site) {
  // Vérifier les dernières lectures des capteurs
  const lastReadings = site.waterLevels[0];
  
  if (!lastReadings || (Date.now() - new Date(lastReadings.timestamp).getTime() > 30 * 60 * 1000)) {
    await createAlert(site, {
      type: AlertType.SENSOR_FAILURE,
      level: AlertLevel.WARNING,
      message: 'Dysfonctionnement des capteurs de niveau d\'eau'
    });
  }
}

async function checkPumps(site) {
  // Logique de vérification des pompes
  // À implémenter selon les besoins spécifiques
}

async function checkLeaks(site) {
  // Logique de détection des fuites
  // À implémenter selon les besoins spécifiques
}

async function checkMaintenance(site) {
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

    // Envoyer les notifications
    await sendAlertNotifications(alert);

    return alert;
  } catch (error) {
    console.error('Erreur lors de la création de l\'alerte:', error);
    throw error;
  }
} 