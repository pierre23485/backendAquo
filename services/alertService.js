import { PrismaClient } from '@prisma/client';
// import { sendLowLevelAlert, sendMaintenanceNotification } from './smsService.js';

const prisma = new PrismaClient();

export const startAlertMonitoring = () => {
  console.log('🔔 Démarrage du système de surveillance des alertes...');
  
  // Check for low water levels every 5 minutes
  setInterval(checkLowWaterLevels, 5 * 60 * 1000);
  
  // Check for maintenance due every hour
  setInterval(checkMaintenanceDue, 60 * 60 * 1000);
  
  // Check for sensor failures every 10 minutes
  setInterval(checkSensorFailures, 10 * 60 * 1000);
};

const checkLowWaterLevels = async () => {
  try {
    const sites = await prisma.site.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        sectorManager: true
      }
    });

    for (const site of sites) {
      const levelPercentage = (site.currentLevel / site.reservoirCapacity) * 100;
      
      if (levelPercentage < 20) {
        // Check if we already sent an alert recently (within last 2 hours)
        const recentAlert = await prisma.notification.findFirst({
          where: {
            siteId: site.id,
            type: 'LOW_LEVEL',
            sentAt: {
              gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
            }
          }
        });

        if (!recentAlert) {
          console.log(`🚨 Envoi d'alerte niveau bas pour ${site.name} (${levelPercentage.toFixed(1)}%)`);
          // await sendLowLevelAlert(site); // SMS auto removed
          
          // Create alert record
          await prisma.alert.create({
            data: {
              siteId: site.id,
              type: 'LOW_WATER_LEVEL',
              message: `Critical level: ${levelPercentage.toFixed(1)}%`,
              level: levelPercentage < 10 ? 'EMERGENCY' : 'CRITICAL'
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des niveaux bas:', error);
  }
};

const checkMaintenanceDue = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);

    const maintenances = await prisma.maintenance.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          gte: tomorrow,
          lt: nextDay
        }
      },
      include: {
        site: {
          include: {
            sectorManager: true
          }
        }
      }
    });

    for (const maintenance of maintenances) {
      console.log(`🔧 Envoi de notification de maintenance pour ${maintenance.site.name}`);
      
      // await sendMaintenanceNotification(
      //   maintenance.site,
      //   maintenance.scheduledAt,
      //   maintenance.description
      // ); // SMS auto removed

      // Create alert record
      await prisma.alert.create({
        data: {
          siteId: maintenance.siteId,
          type: 'MAINTENANCE_DUE',
          message: `Scheduled maintenance: ${maintenance.description}`,
          level: 'INFO'
        }
      });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des maintenances:', error);
  }
};

const checkSensorFailures = async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Find sites with no recent water level updates
    const sitesWithoutRecentData = await prisma.site.findMany({
      where: {
        status: 'ACTIVE',
        waterLevels: {
          none: {
            timestamp: {
              gte: oneHourAgo
            }
          }
        }
      },
      include: {
        sectorManager: true,
        waterLevels: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    for (const site of sitesWithoutRecentData) {
      // Check if we already sent a sensor failure alert recently
      const recentAlert = await prisma.alert.findFirst({
        where: {
          siteId: site.id,
          type: 'SENSOR_FAILURE',
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
          }
        }
      });

      if (!recentAlert) {
        console.log(`⚠️ Possible panne de capteur détectée pour ${site.name}`);
        
        // Create alert record
        await prisma.alert.create({
          data: {
            siteId: site.id,
            type: 'SENSOR_FAILURE',
            message: 'No data received for over an hour',
            level: 'WARNING'
          }
        });

        // Optionally send notification to sector manager
        // await sendSMS(site.sectorManager.phone, 
        //   `⚠️ Possible panne de capteur sur ${site.name}. Aucune donnée reçue depuis plus d'une heure.`);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des pannes de capteurs:', error);
  }
};

export const createManualAlert = async (siteId, type, message, level = 'INFO') => {
  try {
    const alert = await prisma.alert.create({
      data: {
        siteId,
        type,
        message,
        level
      }
    });

    console.log(`🔔 Alerte manuelle créée pour le site ${siteId}:`, message);
    return alert;
  } catch (error) {
    console.error('Erreur lors de la création d\'alerte manuelle:', error);
    throw error;
  }
};

export const resolveAlert = async (alertId) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        isActive: false,
        resolvedAt: new Date()
      }
    });

    console.log(`✅ Alerte résolue:`, alert.id);
    return alert;
  } catch (error) {
    console.error('Erreur lors de la résolution d\'alerte:', error);
    throw error;
  }
};

const checkAndCreateAlerts = async (site) => {
  const levelPercentage = (site.currentLevel / site.reservoirCapacity) * 100;
  
  // Alerte niveau bas
  if (levelPercentage < 30 && levelPercentage >= 20) {
    await prisma.notification.create({
      data: {
        siteId: site.id,
        type: 'low_level',
        message: `Low water level (${levelPercentage}%) - A refill is recommended`,
        priority: 'normal',
        sentAt: new Date()
      }
    });
  }
  
  // Alerte niveau critique
  if (levelPercentage < 20) {
    await prisma.notification.create({
      data: {
        siteId: site.id,
        type: 'emergency',
        message: `Critical water level (${levelPercentage}%) - Urgent intervention required`,
        priority: 'high',
        sentAt: new Date()
      }
    });
  }
};