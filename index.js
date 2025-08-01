import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth.js';
import siteRoutes from './routes/sites.js';
import userRoutes from './routes/users.js';
import householdRoutes from './routes/households.js';
import notificationRoutes from './routes/notifications.js';
import announcementRoutes from './routes/announcements.js';
import dashboardRoutes from './routes/dashboard.js';
import alertRoutes from './routes/alerts.js';
import sensorsRouter from './routes/sensors.js';
import settingsRoutes from './routes/settings.js';
import refillReportsRoutes from './routes/refill-reports.js';

// Import services
import { startAlertMonitoring } from './services/alertMonitoringService.js';

dotenv.config();

// Vérification des variables d'environnement critiques
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:', missingEnvVars.join(', '));
  console.error('⚠️  Assurez-vous que le fichier .env existe et contient toutes les variables requises');
  process.exit(1);
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Test de connexion à la base de données
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Connexion à la base de données réussie');
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    process.exit(1);
  }
}

// Security middleware
app.use(helmet());

// Configuration CORS améliorée
const corsOptions = {
  origin: function (origin, callback) {
    // Liste des origines autorisées
    const allowedOrigins = [
      'https://aquoflwo.vercel.app',
      'https://aquoflwo.vercel.app/',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://localhost:5173'
    ];
    
    // Permettre les requêtes sans origine (applications mobiles, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Vérifier si l'origine est autorisée
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 Origine non autorisée:', origin);
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware pour gérer les requêtes OPTIONS (preflight)
app.options('*', cors(corsOptions));

// Middleware pour logger les requêtes CORS
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log('🔍 Requête OPTIONS reçue depuis:', req.headers.origin);
  }
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected'
  });
});

// Test CORS endpoint
app.get('/api/test-cors', (req, res) => {
  res.json({
    message: 'CORS fonctionne correctement',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/households', householdRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/sensors', sensorsRouter);
app.use('/api/settings', settingsRoutes);
app.use('/api/refill-reports', refillReportsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Données invalides',
      details: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Non autorisé'
    });
  }
  
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint non trouvé',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM reçu, arrêt gracieux...');
  try {
    await prisma.$disconnect();
    console.log('✅ Base de données déconnectée');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion de la base de données:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT reçu, arrêt gracieux...');
  try {
    await prisma.$disconnect();
    console.log('✅ Base de données déconnectée');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion de la base de données:', error);
    process.exit(1);
  }
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  process.exit(1);
});

// Start server
async function startServer() {
  try {
    // Tester la connexion à la base de données
    await testDatabaseConnection();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
      
      // Démarrer la surveillance des alertes
      startAlertMonitoring().catch(error => {
        console.error('❌ Erreur lors du démarrage de la surveillance des alertes:', error);
        // Ne pas arrêter le serveur si la surveillance des alertes échoue
      });
    });

    // Gestion des erreurs du serveur
    server.on('error', (error) => {
      console.error('❌ Erreur du serveur:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

startServer();

export default app;