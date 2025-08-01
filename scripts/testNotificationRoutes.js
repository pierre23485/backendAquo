import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
let authToken = '';
let technicianId = '';

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
    technicianId = data.user.id;
    console.log('✅ Connexion réussie en tant que technicien');
    console.log(`   ID: ${technicianId}`);
    return { token: data.token, userId: data.user.id };
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    process.exit(1);
  }
}

// Test des nouvelles routes de notifications
async function testNotificationRoutes() {
  console.log('\n🔔 Test des routes de notifications...');

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  // Test 1: Alertes des sites pour technicien
  try {
    const response = await fetch(`${BASE_URL}/notifications/technician-site-alerts/${technicianId}`, {
      headers
    });
    
    if (response.ok) {
      const alerts = await response.json();
      console.log(`✅ Alertes des sites récupérées: ${alerts.length} alertes trouvées`);
    } else {
      console.log(`❌ Erreur lors de la récupération des alertes: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }

  // Test 2: Préférences de notifications
  try {
    const response = await fetch(`${BASE_URL}/notifications/preferences/${technicianId}`, {
      headers
    });
    
    if (response.ok) {
      const preferences = await response.json();
      console.log('✅ Préférences récupérées:', preferences.emailNotifications ? 'Email activé' : 'Email désactivé');
    } else {
      console.log(`❌ Erreur lors de la récupération des préférences: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }

  // Test 3: Mise à jour des préférences
  try {
    const newPreferences = {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      alertTypes: {
        LOW_LEVEL: true,
        REFILL: true,
        MAINTENANCE: true,
        EMERGENCY: true,
        GENERAL: false
      },
      frequency: 'immediate',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };

    const response = await fetch(`${BASE_URL}/notifications/preferences/${technicianId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(newPreferences)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Préférences mises à jour:', result.message);
    } else {
      console.log(`❌ Erreur lors de la mise à jour des préférences: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Fonction principale
async function runTests() {
  console.log('🧪 Test des routes de notifications...');
  
  // Se connecter
  await loginAsTechnician();
  
  // Tester les routes
  await testNotificationRoutes();
  
  console.log('\n✅ Tests des notifications terminés !');
}

// Exécuter les tests si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests }; 