import mqtt from 'mqtt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let client = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

export const initializeMQTT = () => {
  if (process.env.MQTT_BROKER_URL) {
    try {
      client = mqtt.connect(process.env.MQTT_BROKER_URL, {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
        reconnectPeriod: 5000
    });

      client.on('connect', () => {
      console.log('✅ Connecté au broker MQTT');
        isConnected = true;
        reconnectAttempts = 0;
        subscribeToTopics();
      });

      client.on('error', (error) => {
        console.error('Erreur MQTT:', error);
      });

      client.on('close', () => {
        console.log('⚠️ MQTT déconnecté');
        isConnected = false;
      });

      client.on('reconnect', () => {
        reconnectAttempts++;
        console.log(`🔄 Reconnexion MQTT... (tentative ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log('⚠️ MQTT hors ligne - Mode simulation activé');
          client.end();
          client = null;
        }
      });
      } catch (error) {
      console.error('Erreur lors de l\'initialisation MQTT:', error);
      console.log('⚠️ MQTT hors ligne - Mode simulation activé');
    }
  } else {
    console.log('ℹ️ MQTT non configuré - Mode simulation activé');
  }
};

const subscribeToTopics = () => {
  if (!client) return;

  const topics = [
    'water/level/#',
    'water/quality/#',
    'water/pressure/#',
    'water/flow/#'
  ];

  topics.forEach(topic => {
    client.subscribe(topic, (err) => {
      if (err) {
        console.error(`Erreur lors de l'abonnement au topic ${topic}:`, err);
      } else {
        console.log(`✅ Abonné au topic: ${topic}`);
      }
    });
  });
};

export const publishMessage = async (topic, message) => {
  if (!client || !isConnected) {
    console.log('📡 Simulation MQTT:', { topic, message });
    return;
  }

  try {
    client.publish(topic, JSON.stringify(message), (err) => {
      if (err) {
        console.error('Erreur lors de la publication MQTT:', err);
      }
    });
  } catch (error) {
    console.error('Erreur lors de la publication MQTT:', error);
  }
};

export const getMQTTStatus = () => ({
  isConnected,
  reconnectAttempts,
  brokerUrl: process.env.MQTT_BROKER_URL || 'Non configuré'
});

const handleMQTTMessage = async (topic, message) => {
  const topicParts = topic.split('/');
  
  if (topicParts.length < 3) {
    console.log('Format de topic invalide:', topic);
    return;
  }

  const siteId = topicParts[1];
  const messageType = topicParts[2];
  
  try {
    const data = JSON.parse(message.toString());
    
    switch (messageType) {
      case 'level':
        await handleWaterLevelUpdate(siteId, data);
        break;
      case 'status':
        await handleSensorStatus(siteId, data);
        break;
      default:
        console.log('Type de message MQTT non reconnu:', messageType);
    }
  } catch (error) {
    console.error('Erreur lors du parsing du message MQTT:', error);
  }
};

const handleWaterLevelUpdate = async (siteId, data) => {
  try {
    const { level, timestamp, battery, signal } = data;
    
    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        sectorManager: true
      }
    });

    if (!site) {
      console.log('Site non trouvé pour l\'ID:', siteId);
      return;
    }

    // Check if level is valid
    if (level < 0 || level > site.reservoirCapacity) {
      console.log('Niveau d\'eau invalide reçu:', level);
      return;
    }

    const previousLevel = site.currentLevel;

    // Update site current level and create water level record
    await prisma.$transaction([
      prisma.site.update({
        where: { id: siteId },
        data: { 
          currentLevel: level,
          lastRefill: level > previousLevel * 1.5 ? new Date() : site.lastRefill
        }
      }),
      prisma.waterLevel.create({
        data: {
          siteId,
          level,
          source: 'sensor',
          timestamp: timestamp ? new Date(timestamp) : new Date()
        }
      })
    ]);

    const levelPercentage = (level / site.reservoirCapacity) * 100;

    // Check for low level alert (below 20%)
    if (levelPercentage < 20) {
      console.log(`🚨 Niveau critique détecté pour ${site.name}: ${levelPercentage.toFixed(1)}%`);
    }

    // Check for refill (significant increase in level)
    if (level > previousLevel * 1.5 && previousLevel < site.reservoirCapacity * 0.5) {
      console.log(`💧 Recharge détectée pour ${site.name}`);
    }

    console.log(`📊 Niveau mis à jour pour ${site.name}: ${level}L (${levelPercentage.toFixed(1)}%)`);

  } catch (error) {
    console.error('Erreur lors de la mise à jour du niveau d\'eau:', error);
  }
};

const handleSensorStatus = async (siteId, data) => {
  try {
    const { status, battery, signal, lastSeen } = data;
    
    console.log(`📡 Statut capteur ${siteId}:`, {
      status,
      battery: battery ? `${battery}%` : 'N/A',
      signal: signal ? `${signal}%` : 'N/A',
      lastSeen
    });

    // You could store sensor status in a separate table if needed
    // For now, we just log it
    
  } catch (error) {
    console.error('Erreur lors du traitement du statut capteur:', error);
  }
};

// Simulation des capteurs IoT pour le développement
const startSensorSimulation = () => {
  console.log('🔄 Démarrage de la simulation des capteurs IoT...');
  
  setInterval(async () => {
    try {
      const sites = await prisma.site.findMany({
        where: { status: 'ACTIVE' },
        include: { sectorManager: true }
      });

      for (const site of sites) {
        // Simulate gradual water consumption (decrease)
        const consumptionRate = Math.random() * 50 + 10; // 10-60L per interval
        const newLevel = Math.max(0, site.currentLevel - consumptionRate);
        
        // Occasionally simulate refill
        const shouldRefill = Math.random() < 0.05 && newLevel < site.reservoirCapacity * 0.3;
        const finalLevel = shouldRefill ? 
          Math.min(site.reservoirCapacity, site.reservoirCapacity * 0.9) : 
          newLevel;

        await handleWaterLevelUpdate(site.id, {
          level: Math.round(finalLevel),
          timestamp: new Date().toISOString(),
          battery: Math.random() * 100,
          signal: Math.random() * 100
        });
      }
    } catch (error) {
      console.error('Erreur lors de la simulation des capteurs:', error);
    }
  }, 30000); // Update every 30 seconds for demo purposes
};

export const publishMQTTMessage = (topic, message) => {
  if (client && isConnected) {
    client.publish(topic, JSON.stringify(message));
    console.log('Message MQTT publié:', topic, message);
  } else {
    console.log('MQTT non connecté - message simulé:', topic, message);
  }
};

export const disconnectMQTT = () => {
  if (client) {
    client.end();
    console.log('🔌 Connexion MQTT fermée');
  }
};