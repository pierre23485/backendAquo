import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Récupérer toutes les annonces
router.get('/', async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(announcements);
  } catch (error) {
    console.error('Erreur lors de la récupération des annonces:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des annonces' });
  }
});

// Créer une nouvelle annonce (admin seulement)
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { title, content, type } = req.body;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type,
        isPublished: true,
        createdAt: new Date()
      }
    });

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Erreur lors de la création de l\'annonce:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'annonce' });
  }
});

export default router; 