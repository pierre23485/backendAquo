import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
const prisma = new PrismaClient();

// Récupérer tous les ménages
router.get('/', authenticateToken, async (req, res) => {
  try {
    const households = await prisma.household.findMany({
      where: { isActive: true },
      include: {
        site: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    res.json(households);
  } catch (error) {
    console.error('Erreur lors de la récupération des ménages:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des ménages' });
  }
});

// Récupérer un ménage spécifique
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const household = await prisma.household.findUnique({
      where: { id: req.params.id },
      include: {
        site: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!household) {
      return res.status(404).json({ error: 'Ménage non trouvé' });
    }

    res.json(household);
  } catch (error) {
    console.error('Erreur lors de la récupération du ménage:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du ménage' });
  }
});

// Créer un nouveau ménage
router.post('/', [
  authenticateToken,
  requireRole(['SECTOR_MANAGER', 'ADMIN']),
  body('name').trim().notEmpty().withMessage('Le nom est requis'),
  body('contact').trim().notEmpty().withMessage('Le contact est requis'),
  body('address').trim().notEmpty().withMessage('L\'adresse est requise'),
  body('siteId').trim().notEmpty().withMessage('Le site est requis')
], async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, contact, address, siteId } = req.body;

    // Vérifier si le site existe
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      return res.status(404).json({ error: 'Site non trouvé' });
    }

    // Créer le ménage
    const household = await prisma.household.create({
      data: {
        name,
        contact,
        address,
        siteId,
        isActive: true
      },
      include: {
        site: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json(household);
  } catch (error) {
    console.error('Erreur lors de la création du ménage:', error);
    res.status(500).json({ error: 'Erreur lors de la création du ménage' });
  }
});

// Mettre à jour un ménage
router.put('/:id', [
  authenticateToken,
  requireRole(['SECTOR_MANAGER', 'ADMIN']),
  body('name').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('contact').optional().trim().notEmpty().withMessage('Le contact ne peut pas être vide'),
  body('address').optional().trim().notEmpty().withMessage('L\'adresse ne peut pas être vide'),
  body('isActive').optional().isBoolean().withMessage('isActive doit être un booléen')
], async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, contact, address, isActive } = req.body;

    // Vérifier si le ménage existe
    const existingHousehold = await prisma.household.findUnique({
      where: { id }
    });

    if (!existingHousehold) {
      return res.status(404).json({ error: 'Ménage non trouvé' });
    }

    // Mettre à jour le ménage
    const household = await prisma.household.update({
      where: { id },
      data: {
        name: name || existingHousehold.name,
        contact: contact || existingHousehold.contact,
        address: address || existingHousehold.address,
        isActive: isActive !== undefined ? isActive : existingHousehold.isActive
      },
      include: {
        site: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json(household);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du ménage:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du ménage' });
  }
});

// Désactiver un ménage
router.delete('/:id', [
  authenticateToken,
  requireRole(['SECTOR_MANAGER', 'ADMIN'])
], async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le ménage existe
    const existingHousehold = await prisma.household.findUnique({
      where: { id }
    });

    if (!existingHousehold) {
      return res.status(404).json({ error: 'Ménage non trouvé' });
    }

    // Désactiver le ménage
    const household = await prisma.household.update({
      where: { id },
      data: {
        isActive: false
      }
    });

    res.json({ message: 'Ménage désactivé avec succès', household });
  } catch (error) {
    console.error('Erreur lors de la désactivation du ménage:', error);
    res.status(500).json({ error: 'Erreur lors de la désactivation du ménage' });
  }
});

export default router; 