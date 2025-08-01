# Serveur Aqua - Backend

## 🚀 Démarrage rapide

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration de l'environnement
```bash
npm run setup-env
```

### 3. Modification du fichier .env
Modifiez le fichier `.env` créé avec vos vraies valeurs :
- `DATABASE_URL` : URL de votre base de données PostgreSQL
- `JWT_SECRET` : Clé secrète pour les tokens JWT
- `SMTP_*` : Configuration de votre serveur email

### 4. Démarrage sécurisé (recommandé)
```bash
npm run start-safe
```

### 5. Démarrage simple
```bash
npm start
```

## 🔧 Scripts disponibles

- `npm run dev` : Démarrage en mode développement avec nodemon
- `npm run start` : Démarrage simple de l'application
- `npm run start-safe` : Démarrage avec vérifications préalables
- `npm run setup-env` : Création du fichier .env
- `npm run create-admin` : Création d'un utilisateur administrateur
- `npm run db:seed` : Peuplement de la base de données
- `npm run create-technician` : Création d'un utilisateur technicien de test
- `npm run test-technician` : Test des fonctionnalités des techniciens

## 👨‍🔧 Fonctionnalités des Techniciens de Maintenance

Les techniciens de maintenance ont accès à des fonctionnalités spécialisées pour gérer le matériel et résoudre les problèmes techniques :

### 🔧 Gestion des Capteurs
- **Lister tous les capteurs** : `GET /api/sensors`
- **Obtenir un capteur spécifique** : `GET /api/sensors/:sensorId`
- **Ajouter un nouveau capteur** : `POST /api/sensors`
- **Modifier un capteur** : `PATCH /api/sensors/:sensorId`
- **Supprimer un capteur** : `DELETE /api/sensors/:sensorId`

### ⚙️ Configuration des Capteurs
- **Créer/Modifier la configuration** : `POST /api/sensors/:sensorId/config`
- **Modifier la configuration** : `PATCH /api/sensors/:sensorId/config`
- **Supprimer la configuration** : `DELETE /api/sensors/:sensorId/config`

### 🔍 Diagnostics et Tests
- **Ajouter un diagnostic** : `POST /api/sensors/:sensorId/diagnostics`
- **Consulter les diagnostics** : `GET /api/sensors/:sensorId/diagnostics`

### 📋 Rapports de Maintenance
- **Créer un rapport** : `POST /api/sensors/:sensorId/maintenance`
- **Consulter les rapports** : `GET /api/sensors/:sensorId/maintenance`

### 📊 Statistiques et Alertes
- **Vue d'ensemble** : `GET /api/sensors/stats/overview`
- **Capteurs nécessitant une attention** : `GET /api/sensors/alerts/attention-needed`

### 🧪 Tests des Fonctionnalités

Pour tester les fonctionnalités des techniciens :

1. **Créer un technicien de test** :
```bash
npm run create-technician
```

2. **Tester les API** :
```bash
npm run test-technician
```

3. **Documentation complète** : Voir `TECHNICIAN_API.md`

## 🐛 Résolution des problèmes

### Erreur SIGTERM
Si vous rencontrez une erreur SIGTERM, cela peut être dû à :

1. **Fichier .env manquant** : Exécutez `npm run setup-env`
2. **Variables d'environnement manquantes** : Vérifiez que toutes les variables requises sont définies
3. **Base de données inaccessible** : Vérifiez votre `DATABASE_URL`
4. **Port déjà utilisé** : Changez le port dans le fichier .env

### Variables d'environnement requises
```env
DATABASE_URL=postgresql://username:password@localhost:5432/aqua_db
JWT_SECRET=your-super-secret-jwt-key
```

### Variables d'environnement optionnelles
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=https://aquoflwo.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
JWT_EXPIRES_IN=24h
ALERT_CHECK_INTERVAL=300000
```

## 📊 Endpoints de santé

- `GET /health` : Vérification de l'état du serveur
- `GET /api/test-cors` : Test de la configuration CORS
- `GET /api/*` : Endpoints de l'API

## 🔒 Sécurité

- Helmet.js pour la sécurité des en-têtes HTTP
- Rate limiting pour prévenir les attaques par déni de service
- CORS configuré pour les origines autorisées :
  - `https://aquoflwo.vercel.app` (production)
  - `http://localhost:3000` (développement)
  - `http://localhost:3001` (développement)
- Validation des données avec express-validator
- Authentification JWT pour toutes les routes protégées
- Contrôle d'accès basé sur les rôles (ADMIN, SECTOR_MANAGER, TECHNICIAN)

## 🌐 Configuration CORS

L'application est configurée pour accepter les requêtes depuis :
- `https://aquoflwo.vercel.app` (frontend de production)
- `http://localhost:3000` (développement local)
- `http://localhost:3001` (développement local)

Pour ajouter une nouvelle origine autorisée, modifiez le tableau `allowedOrigins` dans `index.js`.

## 📝 Logs

L'application utilise des logs colorés pour faciliter le débogage :
- ✅ Succès
- ❌ Erreurs
- 🔄 Opérations en cours
- 🚨 Alertes
- 🔍 Vérifications 