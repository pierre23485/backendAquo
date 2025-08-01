# API Techniciens de Maintenance - AquoFlow

## Vue d'ensemble

Les techniciens de maintenance ont accès à des fonctionnalités spécialisées pour gérer le matériel et résoudre les problèmes techniques du système AquoFlow. Toutes les routes nécessitent une authentification et le rôle `TECHNICIAN`.

## Authentification

Toutes les requêtes doivent inclure le token JWT dans le header :
```
Authorization: Bearer <token>
```

## Routes disponibles

### 1. Gestion des Capteurs

#### Lister tous les capteurs
```http
GET /api/sensors
```
**Réponse :** Liste de tous les capteurs avec leurs informations de base, configuration et dernier diagnostic.

#### Obtenir un capteur spécifique
```http
GET /api/sensors/:sensorId
```
**Réponse :** Détails complets d'un capteur avec son site, configuration, diagnostics et rapports de maintenance.

#### Ajouter un nouveau capteur
```http
POST /api/sensors
Content-Type: application/json

{
  "siteId": "string",
  "name": "string",
  "type": "string",
  "serialNumber": "string"
}
```

#### Modifier un capteur
```http
PATCH /api/sensors/:sensorId
Content-Type: application/json

{
  "name": "string",
  "type": "string",
  "isActive": boolean
}
```

#### Supprimer un capteur
```http
DELETE /api/sensors/:sensorId
```

### 2. Configuration des Capteurs

#### Créer/Modifier la configuration d'un capteur
```http
POST /api/sensors/:sensorId/config
Content-Type: application/json

{
  "calibration": "string (JSON ou texte)",
  "parameters": "string (JSON ou texte)"
}
```

#### Modifier la configuration
```http
PATCH /api/sensors/:sensorId/config
Content-Type: application/json

{
  "calibration": "string",
  "parameters": "string"
}
```

#### Supprimer la configuration
```http
DELETE /api/sensors/:sensorId/config
```

### 3. Diagnostics et Tests

#### Ajouter un diagnostic
```http
POST /api/sensors/:sensorId/diagnostics
Content-Type: application/json

{
  "batteryLevel": number (0-100),
  "signalStrength": number (0-100),
  "status": "OK|WARNING|ERROR",
  "details": "string (optionnel)"
}
```

#### Consulter les diagnostics d'un capteur
```http
GET /api/sensors/:sensorId/diagnostics
```
**Réponse :** Historique des diagnostics du capteur, triés par date.

### 4. Rapports de Maintenance

#### Créer un rapport de maintenance
```http
POST /api/sensors/:sensorId/maintenance
Content-Type: application/json

{
  "reportType": "maintenance|troubleshooting|calibration",
  "summary": "string",
  "details": "string (optionnel)"
}
```

#### Consulter les rapports de maintenance
```http
GET /api/sensors/:sensorId/maintenance
```
**Réponse :** Liste des rapports de maintenance avec les informations du technicien.

### 5. Statistiques et Alertes

#### Vue d'ensemble des statistiques
```http
GET /api/sensors/stats/overview
```
**Réponse :**
```json
{
  "totalSensors": number,
  "activeSensors": number,
  "sensorsWithIssues": number,
  "recentMaintenanceReports": number,
  "inactiveSensors": number
}
```

#### Capteurs nécessitant une attention
```http
GET /api/sensors/alerts/attention-needed
```
**Réponse :** Liste des capteurs avec :
- Batterie < 20%
- Signal < 50%
- Statut WARNING ou ERROR
- Diagnostic des dernières 24h

## Codes de Statut

- `200` : Succès
- `201` : Créé avec succès
- `204` : Supprimé avec succès
- `400` : Données invalides
- `401` : Non authentifié
- `403` : Accès refusé (rôle insuffisant)
- `404` : Ressource non trouvée
- `500` : Erreur serveur

## Exemples d'utilisation

### Ajouter un diagnostic pour un capteur
```javascript
const response = await fetch('/api/sensors/sensor123/diagnostics', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    batteryLevel: 85,
    signalStrength: 92,
    status: 'OK',
    details: 'Test de routine effectué avec succès'
  })
});
```

### Créer un rapport de maintenance
```javascript
const response = await fetch('/api/sensors/sensor123/maintenance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    reportType: 'maintenance',
    summary: 'Calibrage effectué',
    details: 'Capteur recalibré selon les nouvelles spécifications du réservoir'
  })
});
```

### Obtenir les capteurs nécessitant une attention
```javascript
const response = await fetch('/api/sensors/alerts/attention-needed', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const sensorsNeedingAttention = await response.json();
```

## Fonctionnalités Clés

1. **Gestion complète des capteurs** : Ajout, modification, suppression
2. **Configuration flexible** : Calibrage et paramètres personnalisables
3. **Diagnostics en temps réel** : Surveillance de l'état des capteurs
4. **Rapports détaillés** : Historique des interventions
5. **Alertes intelligentes** : Détection automatique des problèmes
6. **Statistiques globales** : Vue d'ensemble du réseau de capteurs

## Sécurité

- Toutes les routes nécessitent l'authentification JWT
- Seuls les utilisateurs avec le rôle `TECHNICIAN` peuvent accéder à ces routes
- Validation des données côté serveur
- Gestion des erreurs centralisée 