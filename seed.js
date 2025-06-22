import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Nettoyer la base de données
  await prisma.user.deleteMany();
  await prisma.site.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();

  // Créer les secteurs
  const sector1 = await prisma.sector.create({
    data: {
      name: 'Secteur Nord',
      description: 'Zone nord de la ville'
    }
  });

  const sector2 = await prisma.sector.create({
    data: {
      name: 'Secteur Sud',
      description: 'Zone sud de la ville'
    }
  });

  // Créer les utilisateurs
  const adminPassword = await bcrypt.hash('admin123', 12);
  const managerPassword = await bcrypt.hash('manager123', 12);
  const consumerPassword = await bcrypt.hash('consumer123', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@aqua.com',
      phone: '0612345678',
      password: adminPassword,
      role: 'ADMIN'
    }
  });

  const manager1 = await prisma.user.create({
    data: {
      name: 'Manager Nord',
      email: 'manager.nord@aqua.com',
      phone: '0623456789',
      password: managerPassword,
      role: 'SECTOR_MANAGER',
      sectorId: sector1.id
    }
  });

  const manager2 = await prisma.user.create({
    data: {
      name: 'Manager Sud',
      email: 'manager.sud@aqua.com',
      phone: '0634567890',
      password: managerPassword,
      role: 'SECTOR_MANAGER',
      sectorId: sector2.id
    }
  });

  const consumer1 = await prisma.user.create({
    data: {
      name: 'Consommateur 1',
      email: 'consumer1@aqua.com',
      phone: '0645678901',
      password: consumerPassword,
      role: 'CONSUMER',
      sectorId: sector1.id
    }
  });

  const consumer2 = await prisma.user.create({
    data: {
      name: 'Consommateur 2',
      email: 'consumer2@aqua.com',
      phone: '0656789012',
      password: consumerPassword,
      role: 'CONSUMER',
      sectorId: sector2.id
    }
  });

  // Créer les sites
  const site1 = await prisma.site.create({
    data: {
      name: 'Site Nord 1',
      location: 'Rue du Nord, 75001',
      reservoirCapacity: 1000,
      currentLevel: 750,
      status: 'ACTIVE',
      sectorId: sector1.id,
      sectorManagerId: manager1.id
    }
  });

  const site2 = await prisma.site.create({
    data: {
      name: 'Site Sud 1',
      location: 'Rue du Sud, 75014',
      reservoirCapacity: 800,
      currentLevel: 600,
      status: 'ACTIVE',
      sectorId: sector2.id,
      sectorManagerId: manager2.id
    }
  });

  // Créer des notifications
  await prisma.notification.create({
    data: {
      title: 'Maintenance prévue',
      message: 'Une maintenance est prévue sur le site Nord 1',
      type: 'MAINTENANCE',
      status: 'PENDING',
      siteId: site1.id,
      userId: manager1.id
    }
  });

  // Créer des annonces
  await prisma.announcement.create({
    data: {
      title: 'Nouveau système de gestion',
      content: 'Un nouveau système de gestion de l\'eau est en place',
      status: 'ACTIVE',
      authorId: admin.id
    }
  });

  console.log('Base de données initialisée avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });