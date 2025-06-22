import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@water-distribution.com' }
    });

    if (existingAdmin) {
      console.log('Un compte administrateur existe déjà avec cet email.');
      return;
    }

    // Créer le mot de passe hashé
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Créer l'utilisateur admin
    const admin = await prisma.user.create({
      data: {
        name: 'Administrateur',
        email: 'admin@water-distribution.com',
        phone: '+33600000000',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('Compte administrateur créé avec succès :', admin.email);
  } catch (error) {
    console.error('Erreur lors de la création du compte administrateur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser(); 