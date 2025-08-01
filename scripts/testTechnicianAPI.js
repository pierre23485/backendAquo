import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
let authToken = '';

// Fonction pour se connecter et obtenir le token
async function loginAsTechnician() {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'technician@aquoflow.com',
        password: 'password123'
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur de connexion: ${response.status}`);
    }

    const data = await response.json();
    authToken = data.token;
    console.log('✅ Connexion réussie en tant que technicien');
    return data.token;
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    process.exit(1);
  }
}

// Fonction pour tester les routes des capteurs
async function testSensorRoutes() {
  console.log('\n🔧 Test des routes des capteurs...');

  // 1. Lister tous les capteurs
  try {
    const response = await fetch(`${BASE_URL}/sensors`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const sensors = await response.json();
      console.log(`✅ Liste des capteurs récupérée: ${sensors.length} capteurs`);
    } else {
      console.log(`❌ Erreur lors de la récupération des capteurs: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }

  // 2. Obtenir les statistiques
  try {
    const response = await fetch(`${BASE_URL}/sensors/stats/overview`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const stats = await response.json();
      console.log('✅ Statistiques récupérées:', stats);
    } else {
      console.log(`❌ Erreur lors de la récupération des statistiques: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }

  // 3. Capteurs nécessitant une attention
  try {
    const response = await fetch(`${BASE_URL}/sensors/alerts/attention-needed`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.ok) {
      const alerts = await response.json();
      console.log(`✅ Alertes récupérées: ${alerts.length} capteurs nécessitent une attention`);
    } else {
      console.log(`❌ Erreur lors de la récupération des alertes: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Fonction pour tester la création et gestion d'un capteur
async function testSensorManagement() {
  console.log('\n🔧 Test de la gestion des capteurs...');

  // Créer un nouveau capteur
  try {
    const response = await fetch(`${BASE_URL}/sensors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        siteId: 'site123', // Remplace par un ID de site valide
        name: 'Capteur Test Technicien',
        type: 'niveau_eau',
        serialNumber: `TEST-${Date.now()}`
      })
    });

    if (response.ok) {
      const sensor = await response.json();
      console.log('✅ Capteur créé:', sensor.id);
      
      // Tester la configuration
      await testSensorConfiguration(sensor.id);
      
      // Tester les diagnostics
      await testSensorDiagnostics(sensor.id);
      
      // Tester les rapports de maintenance
      await testMaintenanceReports(sensor.id);
      
    } else {
      const error = await response.json();
      console.log(`❌ Erreur lors de la création du capteur: ${error.error}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Fonction pour tester la configuration des capteurs
async function testSensorConfiguration(sensorId) {
  console.log(`\n🔧 Test de la configuration du capteur ${sensorId}...`);

  try {
    const response = await fetch(`${BASE_URL}/sensors/${sensorId}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        calibration: JSON.stringify({
          offset: 0.5,
          scale: 1.2,
          unit: 'cm'
        }),
        parameters: JSON.stringify({
          samplingRate: 60,
          threshold: 10,
          alertLevel: 20
        })
      })
    });

    if (response.ok) {
      const config = await response.json();
      console.log('✅ Configuration créée:', config.id);
    } else {
      console.log(`❌ Erreur lors de la création de la configuration: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Fonction pour tester les diagnostics
async function testSensorDiagnostics(sensorId) {
  console.log(`\n🔧 Test des diagnostics du capteur ${sensorId}...`);

  try {
    const response = await fetch(`${BASE_URL}/sensors/${sensorId}/diagnostics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        batteryLevel: 85,
        signalStrength: 92,
        status: 'OK',
        details: 'Test de diagnostic effectué par le script de test'
      })
    });

    if (response.ok) {
      const diagnostic = await response.json();
      console.log('✅ Diagnostic créé:', diagnostic.id);
    } else {
      console.log(`❌ Erreur lors de la création du diagnostic: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Fonction pour tester les rapports de maintenance
async function testMaintenanceReports(sensorId) {
  console.log(`\n🔧 Test des rapports de maintenance du capteur ${sensorId}...`);

  try {
    const response = await fetch(`${BASE_URL}/sensors/${sensorId}/maintenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        reportType: 'maintenance',
        summary: 'Test de maintenance effectué',
        details: 'Ceci est un test de création de rapport de maintenance par le script de test'
      })
    });

    if (response.ok) {
      const report = await response.json();
      console.log('✅ Rapport de maintenance créé:', report.id);
    } else {
      console.log(`❌ Erreur lors de la création du rapport: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Fonction principale
async function runTests() {
  console.log('🧪 Démarrage des tests pour les techniciens...');
  
  // Se connecter
  await loginAsTechnician();
  
  // Tester les routes de base
  await testSensorRoutes();
  
  // Tester la gestion des capteurs
  await testSensorManagement();
  
  console.log('\n✅ Tests terminés !');
}

// Exécuter les tests si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests }; 