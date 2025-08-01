import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Paramètres par défaut pour les seuils d'alerte
const defaultAlertThresholds = {
  low_water_level: {
    warning: 30,    // 30% - Alerte de niveau bas
    critical: 15,   // 15% - Niveau critique
    emergency: 5    // 5% - Urgence
  },
  battery_level: {
    warning: 20,    // 20% - Batterie faible
    critical: 10    // 10% - Batterie critique
  },
  signal_strength: {
    warning: 50,    // 50% - Signal faible
    critical: 30    // 30% - Signal critique
  },
  maintenance_interval: {
    preventive: 30,  // 30 jours - Maintenance préventive
    inspection: 7    // 7 jours - Inspection
    emergency: 1     // 1 jour - Urgence
  }
};

// Paramètres saisonniers par défaut
const defaultSeasonalSettings = {
  dry_season: {
    enabled: false,
    start_month: 6,  // Juin
    end_month: 9,    // Septembre
    adjustments: {
      low_water_level: {
        warning: 40,  // Seuil relevé en saison sèche
        critical: 25,
        emergency: 10
      },
      refill_frequency: 2,  // Réapprovisionnement plus fréquent
      conservation_mode: true
    }
  },
  rainy_season: {
    enabled: false,
    start_month: 10, // Octobre
    end_month: 3,    // Mars
    adjustments: {
      low_water_level: {
        warning: 25,  // Seuil plus bas en saison pluvieuse
        critical: 10,
        emergency: 3
      },
      refill_frequency: 1,  // Réapprovisionnement normal
      conservation_mode: false
    }
  },
  peak_usage: {
    enabled: false,
    start_hour: 6,   // 6h du matin
    end_hour: 22,    // 22h du soir
    adjustments: {
      monitoring_frequency: 5,  // Surveillance plus fréquente (minutes)
      alert_sensitivity: 'high'
    }
  }
};

// Paramètres de notification par défaut
const defaultNotificationSettings = {
  email_enabled: true,
  sms_enabled: false,
  push_enabled: true,
  quiet_hours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  },
  alert_types: {
    LOW_WATER_LEVEL: true,
    SENSOR_FAILURE: true,
    PUMP_FAILURE: true,
    LEAK_DETECTED: true,
    MAINTENANCE_DUE: true
  }
};

// Paramètres de maintenance par défaut
const defaultMaintenanceSettings = {
  auto_scheduling: true,
  reminder_days: 3,
  escalation_hours: 24,
  priority_levels: {
    low: 7,      // 7 jours
    medium: 3,   // 3 jours
    high: 1,     // 1 jour
    emergency: 0  // Immédiat
  }
};

async function initializeSystemSettings() {
  console.log('🔧 Initialisation des paramètres système...');

  try {
    // Créer un utilisateur admin temporaire pour les mises à jour
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.log('⚠️  Aucun utilisateur admin trouvé. Création d\'un admin temporaire...');
      // Créer un admin temporaire
      const tempAdmin = await prisma.user.create({
        data: {
          name: 'Admin Système',
          email: 'system@aquoflow.com',
          phone: '+1234567890',
          password: 'temp_password_hash',
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('✅ Admin temporaire créé:', tempAdmin.id);
    }

    const adminId = adminUser?.id || (await prisma.user.findFirst({ where: { role: 'ADMIN' } })).id;

    // Initialiser les seuils d'alerte
    console.log('📊 Initialisation des seuils d\'alerte...');
    for (const [key, value] of Object.entries(defaultAlertThresholds)) {
      await prisma.systemSettings.upsert({
        where: { key: `threshold_${key}` },
        update: {
          value: JSON.stringify(value),
          category: 'alerts',
          updatedById: adminId,
          updatedAt: new Date()
        },
        create: {
          key: `threshold_${key}`,
          value: JSON.stringify(value),
          category: 'alerts',
          description: `Seuil d'alerte pour ${key}`,
          updatedById: adminId
        }
      });
    }

    // Initialiser les paramètres saisonniers
    console.log('🌦️  Initialisation des paramètres saisonniers...');
    for (const [key, value] of Object.entries(defaultSeasonalSettings)) {
      await prisma.systemSettings.upsert({
        where: { key },
        update: {
          value: JSON.stringify(value),
          category: 'seasonal',
          updatedById: adminId,
          updatedAt: new Date()
        },
        create: {
          key,
          value: JSON.stringify(value),
          category: 'seasonal',
          description: `Paramètre saisonnier: ${key}`,
          updatedById: adminId
        }
      });
    }

    // Initialiser les paramètres de notification
    console.log('🔔 Initialisation des paramètres de notification...');
    await prisma.systemSettings.upsert({
      where: { key: 'notification_settings' },
      update: {
        value: JSON.stringify(defaultNotificationSettings),
        category: 'notifications',
        updatedById: adminId,
        updatedAt: new Date()
      },
      create: {
        key: 'notification_settings',
        value: JSON.stringify(defaultNotificationSettings),
        category: 'notifications',
        description: 'Paramètres de notification globaux',
        updatedById: adminId
      }
    });

    // Initialiser les paramètres de maintenance
    console.log('🔧 Initialisation des paramètres de maintenance...');
    await prisma.systemSettings.upsert({
      where: { key: 'maintenance_settings' },
      update: {
        value: JSON.stringify(defaultMaintenanceSettings),
        category: 'maintenance',
        updatedById: adminId,
        updatedAt: new Date()
      },
      create: {
        key: 'maintenance_settings',
        value: JSON.stringify(defaultMaintenanceSettings),
        category: 'maintenance',
        description: 'Paramètres de maintenance globaux',
        updatedById: adminId
      }
    });

    console.log('✅ Paramètres système initialisés avec succès !');
    console.log('\n📋 Paramètres créés :');
    console.log('   - Seuils d\'alerte (niveau d\'eau, batterie, signal)');
    console.log('   - Paramètres saisonniers (saison sèche/pluvieuse)');
    console.log('   - Paramètres de notification (email, SMS, push)');
    console.log('   - Paramètres de maintenance (planification, escalade)');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des paramètres:', error);
    throw error;
  }
}

async function createSampleSiteSettings() {
  console.log('\n🏢 Création de paramètres d\'exemple pour les sites...');

  try {
    const sites = await prisma.site.findMany();
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (sites.length === 0) {
      console.log('⚠️  Aucun site trouvé. Création d\'un site d\'exemple...');
      const sampleSite = await prisma.site.create({
        data: {
          name: 'Site Principal',
          address: '123 Rue Principale',
          latitude: 48.8566,
          longitude: 2.3522,
          reservoirCapacity: 1000,
          currentLevel: 750,
          sectorManagerId: adminUser.id,
          lastRefill: new Date(),
          status: 'ACTIVE'
        }
      });
      sites.push(sampleSite);
    }

    for (const site of sites) {
      // Paramètres spécifiques au site
      const siteSettings = {
        custom_thresholds: {
          low_water_level: {
            warning: 25,
            critical: 10,
            emergency: 3
          }
        },
        maintenance_schedule: {
          frequency: 'weekly',
          preferred_day: 'monday',
          preferred_time: '09:00'
        },
        notifications: {
          local_alerts: true,
          community_notifications: true,
          emergency_broadcast: true
        }
      };

      for (const [key, value] of Object.entries(siteSettings)) {
        await prisma.siteSettings.upsert({
          where: {
            siteId_key: {
              siteId: site.id,
              key
            }
          },
          update: {
            value: JSON.stringify(value),
            category: 'site',
            updatedById: adminUser.id,
            updatedAt: new Date()
          },
          create: {
            siteId: site.id,
            key,
            value: JSON.stringify(value),
            category: 'site',
            description: `Paramètre site: ${key}`,
            updatedById: adminUser.id
          }
        });
      }
    }

    console.log(`✅ Paramètres créés pour ${sites.length} site(s)`);

  } catch (error) {
    console.error('❌ Erreur lors de la création des paramètres de site:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Initialisation du système de paramètres AquoFlow...\n');

  try {
    await initializeSystemSettings();
    await createSampleSiteSettings();

    console.log('\n🎉 Initialisation terminée avec succès !');
    console.log('\n📋 Utilisation :');
    console.log('   - GET /api/settings/system : Récupérer tous les paramètres');
    console.log('   - GET /api/settings/alerts/thresholds : Seuils d\'alerte');
    console.log('   - GET /api/settings/seasonal : Paramètres saisonniers');
    console.log('   - POST /api/settings/system : Créer/modifier un paramètre');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { initializeSystemSettings, createSampleSiteSettings }; 