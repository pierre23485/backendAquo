import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
let authToken = '';
let testResults = [];

// Fonction pour logger les résultats
function logResult(testName, success, details = '') {
  const status = success ? '✅' : '❌';
  const result = { testName, success, details };
  testResults.push(result);
  console.log(`${status} ${testName}${details ? ` - ${details}` : ''}`);
}

// Fonction pour se connecter
async function login(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(`Erreur de connexion: ${response.status}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    throw new Error(`Erreur de connexion: ${error.message}`);
  }
}

// Test de santé du serveur
async function testHealthCheck() {
  try {
    const response = await fetch(`${BASE_URL.replace('/api', '')}/health`);
    const data = await response.json();
    logResult('Health Check', response.ok, `Status: ${data.status}`);
    return response.ok;
  } catch (error) {
    logResult('Health Check', false, error.message);
    return false;
  }
}

// Test CORS
async function testCORS() {
  try {
    const response = await fetch(`${BASE_URL}/test-cors`);
    const data = await response.json();
    logResult('Test CORS', response.ok, data.message);
    return response.ok;
  } catch (error) {
    logResult('Test CORS', false, error.message);
    return false;
  }
}

// Test d'authentification
async function testAuthentication() {
  try {
    // Test connexion technicien
    const technicianToken = await login('technician@aquoflow.com', 'password123');
    logResult('Connexion Technicien', true, 'Token obtenu');
    
    // Test connexion admin (si existe)
    try {
      const adminToken = await login('admin@aquoflow.com', 'password123');
      logResult('Connexion Admin', true, 'Token obtenu');
    } catch (error) {
      logResult('Connexion Admin', false, 'Admin non trouvé (normal si pas créé)');
    }
    
    return technicianToken;
  } catch (error) {
    logResult('Connexion Technicien', false, error.message);
    return null;
  }
}

// Test des routes des capteurs
async function testSensorRoutes(token) {
  if (!token) {
    logResult('Routes Capteurs', false, 'Token manquant');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Test 1: Lister les capteurs
  try {
    const response = await fetch(`${BASE_URL}/sensors`, { headers });
    const sensors = await response.json();
    logResult('Lister Capteurs', response.ok, `${sensors.length} capteurs trouvés`);
  } catch (error) {
    logResult('Lister Capteurs', false, error.message);
  }

  // Test 2: Statistiques
  try {
    const response = await fetch(`${BASE_URL}/sensors/stats/overview`, { headers });
    const stats = await response.json();
    logResult('Statistiques', response.ok, `Total: ${stats.totalSensors || 0}`);
  } catch (error) {
    logResult('Statistiques', false, error.message);
  }

  // Test 3: Alertes
  try {
    const response = await fetch(`${BASE_URL}/sensors/alerts/attention-needed`, { headers });
    const alerts = await response.json();
    logResult('Alertes', response.ok, `${alerts.length} alertes trouvées`);
  } catch (error) {
    logResult('Alertes', false, error.message);
  }
}

// Test des routes des sites
async function testSiteRoutes(token) {
  if (!token) {
    logResult('Routes Sites', false, 'Token manquant');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(`${BASE_URL}/sites`, { headers });
    const sites = await response.json();
    logResult('Lister Sites', response.ok, `${sites.length} sites trouvés`);
  } catch (error) {
    logResult('Lister Sites', false, error.message);
  }
}

// Test des routes des utilisateurs
async function testUserRoutes(token) {
  if (!token) {
    logResult('Routes Utilisateurs', false, 'Token manquant');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(`${BASE_URL}/users`, { headers });
    const users = await response.json();
    logResult('Lister Utilisateurs', response.ok, `${users.length} utilisateurs trouvés`);
  } catch (error) {
    logResult('Lister Utilisateurs', false, error.message);
  }
}

// Test des notifications
async function testNotificationRoutes(token) {
  if (!token) {
    logResult('Routes Notifications', false, 'Token manquant');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(`${BASE_URL}/notifications`, { headers });
    const notifications = await response.json();
    logResult('Lister Notifications', response.ok, `${notifications.length} notifications trouvées`);
  } catch (error) {
    logResult('Lister Notifications', false, error.message);
  }
}

// Test des alertes
async function testAlertRoutes(token) {
  if (!token) {
    logResult('Routes Alertes', false, 'Token manquant');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(`${BASE_URL}/alerts`, { headers });
    const alerts = await response.json();
    logResult('Lister Alertes', response.ok, `${alerts.length} alertes trouvées`);
  } catch (error) {
    logResult('Lister Alertes', false, error.message);
  }
}

// Test de création de données
async function testDataCreation(token) {
  if (!token) {
    logResult('Création Données', false, 'Token manquant');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Test création d'un capteur
  try {
    const response = await fetch(`${BASE_URL}/sensors`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        siteId: 'test-site-id',
        name: 'Capteur Test Backend',
        type: 'niveau_eau',
        serialNumber: `TEST-${Date.now()}`
      })
    });
    
    if (response.ok) {
      const sensor = await response.json();
      logResult('Créer Capteur', true, `ID: ${sensor.id}`);
      
      // Test configuration du capteur
      try {
        const configResponse = await fetch(`${BASE_URL}/sensors/${sensor.id}/config`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            calibration: JSON.stringify({ offset: 0.5, scale: 1.2 }),
            parameters: JSON.stringify({ samplingRate: 60, threshold: 10 })
          })
        });
        logResult('Configurer Capteur', configResponse.ok);
      } catch (error) {
        logResult('Configurer Capteur', false, error.message);
      }
      
    } else {
      logResult('Créer Capteur', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logResult('Créer Capteur', false, error.message);
  }
}

// Fonction principale
async function runAllTests() {
  console.log('🧪 Démarrage des tests complets du backend...\n');

  // Test 1: Santé du serveur
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Le serveur n\'est pas accessible. Vérifiez qu\'il est démarré.');
    return;
  }

  // Test 2: CORS
  await testCORS();

  // Test 3: Authentification
  const token = await testAuthentication();

  // Test 4: Routes principales
  await testSensorRoutes(token);
  await testSiteRoutes(token);
  await testUserRoutes(token);
  await testNotificationRoutes(token);
  await testAlertRoutes(token);

  // Test 5: Création de données
  await testDataCreation(token);

  // Résumé des tests
  console.log('\n📊 Résumé des tests:');
  const passed = testResults.filter(r => r.success).length;
  const total = testResults.length;
  console.log(`✅ Tests réussis: ${passed}/${total}`);
  console.log(`📈 Taux de réussite: ${Math.round((passed/total)*100)}%`);

  if (passed === total) {
    console.log('\n🎉 Tous les tests sont passés ! Votre backend fonctionne parfaitement.');
  } else {
    console.log('\n⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.');
  }
}

// Exécuter les tests si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests }; 