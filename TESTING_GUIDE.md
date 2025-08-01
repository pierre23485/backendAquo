# 🧪 Guide de Test du Backend AquoFlow

## 📋 Vue d'ensemble

Ce guide te montre comment tester complètement ton backend AquoFlow. Plusieurs méthodes sont disponibles selon tes besoins.

## 🚀 Démarrage Rapide

### 1. **Prérequis**
```bash
# Installer les dépendances
npm install

# Créer le fichier .env
npm run setup-env

# Démarrer le serveur
npm start
```

### 2. **Tests Automatisés (Recommandé)**
```bash
# Créer les données de test
npm run create-technician

# Tester toutes les fonctionnalités
npm run test-backend
```

## 🔧 Méthodes de Test

### **Méthode 1: Tests Automatisés**

#### **Test Complet du Backend**
```bash
npm run test-backend
```

**Ce que ça teste :**
- ✅ Santé du serveur
- ✅ Configuration CORS
- ✅ Authentification
- ✅ Routes des capteurs
- ✅ Routes des sites
- ✅ Routes des utilisateurs
- ✅ Routes des notifications
- ✅ Routes des alertes
- ✅ Création de données

#### **Test Spécifique des Techniciens**
```bash
npm run test-technician
```

**Ce que ça teste :**
- ✅ Gestion des capteurs
- ✅ Configuration des capteurs
- ✅ Diagnostics
- ✅ Rapports de maintenance
- ✅ Statistiques
- ✅ Alertes

### **Méthode 2: Tests avec Postman**

#### **Configuration Postman**
1. Crée une nouvelle collection "AquoFlow API"
2. Variables d'environnement :
   - `baseUrl` = `http://localhost:3001/api`
   - `token` = (sera rempli après connexion)

#### **Tests d'Authentification**
```http
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "technician@aquoflow.com",
  "password": "password123"
}
```

#### **Tests des Capteurs**
```http
# Lister tous les capteurs
GET {{baseUrl}}/sensors
Authorization: Bearer {{token}}

# Obtenir les statistiques
GET {{baseUrl}}/sensors/stats/overview
Authorization: Bearer {{token}}

# Capteurs nécessitant une attention
GET {{baseUrl}}/sensors/alerts/attention-needed
Authorization: Bearer {{token}}

# Créer un capteur
POST {{baseUrl}}/sensors
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "siteId": "site-id",
  "name": "Capteur Test",
  "type": "niveau_eau",
  "serialNumber": "TEST-001"
}
```

#### **Tests des Sites**
```http
# Lister tous les sites
GET {{baseUrl}}/sites
Authorization: Bearer {{token}}

# Obtenir un site spécifique
GET {{baseUrl}}/sites/:siteId
Authorization: Bearer {{token}}
```

#### **Tests des Utilisateurs**
```http
# Lister tous les utilisateurs
GET {{baseUrl}}/users
Authorization: Bearer {{token}}

# Créer un utilisateur
POST {{baseUrl}}/users
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "phone": "+1234567890",
  "password": "password123",
  "role": "SECTOR_MANAGER"
}
```

### **Méthode 3: Tests avec cURL**

#### **Connexion**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "technician@aquoflow.com",
    "password": "password123"
  }'
```

#### **Tester les capteurs**
```bash
# Remplacer TOKEN par le token obtenu
curl -X GET http://localhost:3001/api/sensors \
  -H "Authorization: Bearer TOKEN"
```

#### **Créer un capteur**
```bash
curl -X POST http://localhost:3001/api/sensors \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "site-id",
    "name": "Capteur Test",
    "type": "niveau_eau",
    "serialNumber": "TEST-001"
  }'
```

### **Méthode 4: Tests avec le Frontend**

Si tu as le frontend AquoFlow :
1. Démarrer le frontend
2. Se connecter avec le compte technicien
3. Naviguer vers les différentes sections
4. Tester toutes les fonctionnalités via l'interface

## 📊 Endpoints de Test

### **Endpoints de Santé**
```http
GET /health
GET /api/test-cors
```

### **Endpoints d'Authentification**
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
```

### **Endpoints des Capteurs (Techniciens)**
```http
GET /api/sensors
GET /api/sensors/:sensorId
POST /api/sensors
PATCH /api/sensors/:sensorId
DELETE /api/sensors/:sensorId

# Configuration
POST /api/sensors/:sensorId/config
PATCH /api/sensors/:sensorId/config
DELETE /api/sensors/:sensorId/config

# Diagnostics
POST /api/sensors/:sensorId/diagnostics
GET /api/sensors/:sensorId/diagnostics

# Maintenance
POST /api/sensors/:sensorId/maintenance
GET /api/sensors/:sensorId/maintenance

# Statistiques et Alertes
GET /api/sensors/stats/overview
GET /api/sensors/alerts/attention-needed
```

### **Endpoints des Sites**
```http
GET /api/sites
GET /api/sites/:siteId
POST /api/sites
PATCH /api/sites/:siteId
DELETE /api/sites/:siteId
```

### **Endpoints des Utilisateurs**
```http
GET /api/users
GET /api/users/:userId
POST /api/users
PATCH /api/users/:userId
DELETE /api/users/:userId
```

## 🔍 Dépannage

### **Erreurs Communes**

#### **Erreur de Connexion**
```bash
❌ Erreur de connexion: 401
```
**Solution :** Vérifie que le technicien existe :
```bash
npm run create-technician
```

#### **Erreur CORS**
```bash
❌ Test CORS - CORS error
```
**Solution :** Vérifie la configuration CORS dans `index.js`

#### **Erreur de Base de Données**
```bash
❌ Erreur lors de la récupération des capteurs
```
**Solution :** Vérifie la connexion à la base de données :
```bash
# Vérifier les migrations
npx prisma migrate status

# Réinitialiser la base si nécessaire
npx prisma migrate reset
```

#### **Erreur de Port**
```bash
❌ Le serveur n'est pas accessible
```
**Solution :** Vérifie que le serveur est démarré sur le bon port :
```bash
# Vérifier le port dans .env
PORT=3001

# Redémarrer le serveur
npm start
```

## 📈 Interprétation des Résultats

### **Tests Réussis**
```
✅ Health Check - Status: OK
✅ Test CORS - CORS fonctionne correctement
✅ Connexion Technicien - Token obtenu
✅ Lister Capteurs - 3 capteurs trouvés
✅ Statistiques - Total: 3
✅ Alertes - 0 alertes trouvées
```

### **Tests Échoués**
```
❌ Health Check - connect ECONNREFUSED
❌ Connexion Technicien - Erreur de connexion: 401
❌ Lister Capteurs - 500 Internal Server Error
```

## 🎯 Conseils de Test

1. **Commence par les tests automatisés** : `npm run test-backend`
2. **Vérifie les logs du serveur** pendant les tests
3. **Teste d'abord l'authentification** avant les autres routes
4. **Utilise Postman pour les tests manuels** détaillés
5. **Vérifie la base de données** si les tests échouent

## 📝 Logs Utiles

### **Logs du Serveur**
```bash
🚀 Serveur démarré sur le port 3001
✅ Connexion à la base de données réussie
📊 Dashboard: http://localhost:3001/health
```

### **Logs de Test**
```bash
🧪 Démarrage des tests complets du backend...
✅ Health Check - Status: OK
✅ Test CORS - CORS fonctionne correctement
✅ Connexion Technicien - Token obtenu
📊 Résumé des tests:
✅ Tests réussis: 15/15
📈 Taux de réussite: 100%
🎉 Tous les tests sont passés !
```

## 🚀 Prochaines Étapes

Une fois les tests passés :
1. **Déployer le backend** sur ton serveur de production
2. **Configurer les variables d'environnement** de production
3. **Tester avec le frontend** en production
4. **Mettre en place la surveillance** et les alertes

---

**💡 Astuce :** Utilise `npm run test-backend` régulièrement pour vérifier que tout fonctionne correctement après chaque modification ! 