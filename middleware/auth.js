import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Utilisateur non trouvé ou inactif' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return res.status(403).json({ error: 'Token invalide' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }

    next();
  };
};

export const requireSectorAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  // Admin has access to all sectors
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // Sector manager can only access their own sector
  if (req.user.role === 'SECTOR_MANAGER') {
    const siteId = req.params.siteId || req.body.siteId;
    
    if (siteId) {
      try {
        const site = await prisma.site.findUnique({
          where: { id: siteId },
          select: { sectorManagerId: true }
        });

        if (!site || site.sectorManagerId !== req.user.id) {
          return res.status(403).json({ error: 'Accès non autorisé à ce secteur' });
        }
      } catch (error) {
        console.error('Erreur de vérification d\'accès secteur:', error);
        return res.status(500).json({ error: 'Erreur de vérification des permissions' });
      }
    }
  }

  next();
};