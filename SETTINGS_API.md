# 🎛️ API Paramètres Système - AquoFlow

## Vue d'ensemble

L'API des paramètres système permet aux administrateurs de configurer et ajuster les seuils d'alerte, les paramètres saisonniers et les configurations globales du système AquoFlow.

## Authentification

Toutes les routes nécessitent une authentification JWT et le rôle `ADMIN` pour les modifications :

```
Authorization: Bearer <token>
```

## Routes Disponibles

### 1. Paramètres Système Globaux

#### Récupérer tous les paramètres système
```http
GET /api/settings/system
```
**Réponse :** Paramètres organisés par catégorie (alerts, seasonal, notifications, maintenance)

#### Récupérer un paramètre spécifique
```http
GET /api/settings/system/:key
```

#### Créer/Modifier un paramètre
```http
POST /api/settings/system
Content-Type: application/json

{
  "key": "custom_setting",
  "value": { "enabled": true, "threshold": 25 },
  "description": "Paramètre personnalisé",
  "category": "alerts"
}
```

#### Supprimer un paramètre
```http
DELETE /api/settings/system/:key
```

### 2. Seuils d'Alerte

#### Récupérer les seuils d'alerte
```http
GET /api/settings/alerts/thresholds
```
**Réponse :**
```json
{
  "low_water_level": {
    "warning": 30,
    "critical": 15,
    "emergency": 5
  },
  "battery_level": {
    "warning": 20,
    "critical": 10
  },
  "signal_strength": {
    "warning": 50,
    "critical": 30
  },
  "maintenance_interval": {
    "preventive": 30,
    "inspection": 7,
    "emergency": 1
  }
}
```

#### Mettre à jour les seuils d'alerte
```http
POST /api/settings/alerts/thresholds
Content-Type: application/json

{
  "low_water_level": {
    "warning": 35,
    "critical": 20,
    "emergency": 8
  },
  "battery_level": {
    "warning": 25,
    "critical": 15
  }
}
```

### 3. Paramètres Saisonniers

#### Récupérer les paramètres saisonniers
```http
GET /api/settings/seasonal
```
**Réponse :**
```json
{
  "dry_season": {
    "enabled": false,
    "start_month": 6,
    "end_month": 9,
    "adjustments": {
      "low_water_level": {
        "warning": 40,
        "critical": 25,
        "emergency": 10
      },
      "refill_frequency": 2,
      "conservation_mode": true
    }
  },
  "rainy_season": {
    "enabled": false,
    "start_month": 10,
    "end_month": 3,
    "adjustments": {
      "low_water_level": {
        "warning": 25,
        "critical": 10,
        "emergency": 3
      },
      "refill_frequency": 1,
      "conservation_mode": false
    }
  },
  "peak_usage": {
    "enabled": false,
    "start_hour": 6,
    "end_hour": 22,
    "adjustments": {
      "monitoring_frequency": 5,
      "alert_sensitivity": "high"
    }
  }
}
```

#### Mettre à jour les paramètres saisonniers
```http
POST /api/settings/seasonal
Content-Type: application/json

{
  "dry_season": {
    "enabled": true,
    "start_month": 6,
    "end_month": 9,
    "adjustments": {
      "low_water_level": {
        "warning": 45,
        "critical": 30,
        "emergency": 15
      },
      "refill_frequency": 3,
      "conservation_mode": true
    }
  }
}
```

### 4. Paramètres de Site

#### Récupérer les paramètres d'un site
```http
GET /api/settings/site/:siteId
```

#### Créer/Modifier un paramètre de site
```http
POST /api/settings/site/:siteId
Content-Type: application/json

{
  "key": "custom_thresholds",
  "value": {
    "low_water_level": {
      "warning": 20,
      "critical": 8,
      "emergency": 2
    }
  },
  "description": "Seuils personnalisés pour ce site",
  "category": "site"
}
```

## Exemples d'Utilisation

### Configuration Saisonnière

#### Saison Sèche (Juin-Septembre)
```javascript
// Activer les ajustements pour la saison sèche
const drySeasonSettings = {
  dry_season: {
    enabled: true,
    start_month: 6,
    end_month: 9,
    adjustments: {
      low_water_level: {
        warning: 40,  // Seuil relevé pour conserver l'eau
        critical: 25,
        emergency: 10
      },
      refill_frequency: 2,  // Réapprovisionnement plus fréquent
      conservation_mode: true
    }
  }
};

await fetch('/api/settings/seasonal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(drySeasonSettings)
});
```

#### Saison Pluvieuse (Octobre-Mars)
```javascript
// Activer les ajustements pour la saison pluvieuse
const rainySeasonSettings = {
  rainy_season: {
    enabled: true,
    start_month: 10,
    end_month: 3,
    adjustments: {
      low_water_level: {
        warning: 25,  // Seuil plus bas car plus d'eau disponible
        critical: 10,
        emergency: 3
      },
      refill_frequency: 1,  // Réapprovisionnement normal
      conservation_mode: false
    }
  }
};
```

### Ajustement des Seuils d'Alerte

#### Période de Forte Consommation
```javascript
// Relever les seuils pendant les heures de pointe
const peakUsageSettings = {
  peak_usage: {
    enabled: true,
    start_hour: 6,
    end_hour: 22,
    adjustments: {
      monitoring_frequency: 5,  // Surveillance plus fréquente
      alert_sensitivity: 'high'
    }
  }
};
```

#### Maintenance Préventive
```javascript
// Ajuster les intervalles de maintenance
const maintenanceSettings = {
  maintenance_interval: {
    preventive: 21,  // Maintenance plus fréquente
    inspection: 5,   // Inspections plus rapprochées
    emergency: 1     // Urgence immédiate
  }
};
```

## Catégories de Paramètres

### 1. **Alerts** - Seuils d'Alerte
- `low_water_level` : Seuils de niveau d'eau
- `battery_level` : Seuils de batterie des capteurs
- `signal_strength` : Seuils de force du signal
- `maintenance_interval` : Intervalles de maintenance

### 2. **Seasonal** - Paramètres Saisonniers
- `dry_season` : Configuration saison sèche
- `rainy_season` : Configuration saison pluvieuse
- `peak_usage` : Configuration heures de pointe

### 3. **Notifications** - Paramètres de Notification
- `email_enabled` : Notifications par email
- `sms_enabled` : Notifications par SMS
- `push_enabled` : Notifications push
- `quiet_hours` : Heures silencieuses

### 4. **Maintenance** - Paramètres de Maintenance
- `auto_scheduling` : Planification automatique
- `reminder_days` : Jours de rappel
- `escalation_hours` : Heures d'escalade
- `priority_levels` : Niveaux de priorité

## Codes de Statut

- `200` : Succès
- `201` : Créé avec succès
- `204` : Supprimé avec succès
- `400` : Données invalides
- `401` : Non authentifié
- `403` : Accès refusé (rôle insuffisant)
- `404` : Ressource non trouvée
- `500` : Erreur serveur

## Sécurité

- Toutes les routes nécessitent l'authentification JWT
- Seuls les `ADMIN` peuvent modifier les paramètres globaux
- Les gestionnaires de site peuvent modifier les paramètres de leur site
- Validation des données côté serveur
- Historique des modifications avec traçabilité

## Initialisation

Pour initialiser les paramètres par défaut :

```bash
npm run init-settings
```

Cela créera :
- ✅ Seuils d'alerte par défaut
- ✅ Paramètres saisonniers
- ✅ Paramètres de notification
- ✅ Paramètres de maintenance
- ✅ Paramètres d'exemple pour les sites 