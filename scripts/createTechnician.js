import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createTechnician() {
  try {
    // Vérifier si le technicien existe déjà
    const existingTechnician = await prisma.user.findUnique({
      where: { email: 'technician@aquoflow.com' }
    });

    if (existingTechnician) {
      console.log('⚠️  Le technicien existe déjà');
      return existingTechnician;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Créer le technicien
    const technician = await prisma.user.create({
      data: {
        name: 'Technicien Maintenance',
        email: 'technician@aquoflow.com',
        phone: '+1234567890',
        password: hashedPassword,
        role: 'TECHNICIAN',
        isActive: true
      }
    });

    console.log('✅ Technicien créé avec succès:');
    console.log(`   ID: ${technician.id}`);
    console.log(`   Nom: ${technician.name}`);
    console.log(`   Email: ${technician.email}`);
    console.log(`   Rôle: ${technician.role}`);
    console.log('\n📋 Informations de connexion:');
    console.log(`   Email: technician@aquoflow.com`);
    console.log(`   Mot de passe: password123`);

    return technician;
  } catch (error) {
    console.error('❌ Erreur lors de la création du technicien:', error);
    throw error;
  }
}

async function createTestSites() {
  try {
    // Vérifier si des sites existent déjà
    const existingSites = await prisma.site.findMany();
    
    if (existingSites.length > 0) {
      console.log(`✅ ${existingSites.length} site(s) existant(s) trouvé(s)`);
      return existingSites;
    }

    // Créer un site de test
    const testSite = await prisma.site.create({
      data: {
        name: 'Site Test Technicien',
        address: '123 Rue de Test, Ville Test',
        latitude: 48.8566,
        longitude: 2.3522,
        reservoirCapacity: 1000,
        currentLevel: 750,
        sectorManagerId: 'admin-id', // Remplace par un ID d'admin valide
        lastRefill: new Date(),
        status: 'ACTIVE'
      }
    });

    console.log('✅ Site de test créé:', testSite.name);
    return [testSite];
  } catch (error) {
    console.error('❌ Erreur lors de la création du site de test:', error);
    throw error;
  }
}

async function createTestSensors() {
  try {
    // Récupérer le premier site
    const site = await prisma.site.findFirst();
    
    if (!site) {
      console.log('⚠️  Aucun site trouvé, impossible de créer des capteurs de test');
      return [];
    }

    // Vérifier si des capteurs existent déjà
    const existingSensors = await prisma.sensor.findMany({
      where: { siteId: site.id }
    });

    if (existingSensors.length > 0) {
      console.log(`✅ ${existingSensors.length} capteur(s) existant(s) trouvé(s)`);
      return existingSensors;
    }

    // Créer des capteurs de test
    const testSensors = await Promise.all([
      prisma.sensor.create({
        data: {
          siteId: site.id,
          name: 'Capteur Niveau Principal',
          type: 'niveau_eau',
          serialNumber: 'SENSOR-001',
          isActive: true
        }
      }),
      prisma.sensor.create({
        data: {
          siteId: site.id,
          name: 'Capteur Niveau Secondaire',
          type: 'niveau_eau',
          serialNumber: 'SENSOR-002',
          isActive: true
        }
      }),
      prisma.sensor.create({
        data: {
          siteId: site.id,
          name: 'Capteur Qualité Eau',
          type: 'qualite_eau',
          serialNumber: 'SENSOR-003',
          isActive: true
        }
      })
    ]);

    console.log(`✅ ${testSensors.length} capteur(s) de test créé(s)`);
    return testSensors;
  } catch (error) {
    console.error('❌ Erreur lors de la création des capteurs de test:', error);
    throw error;
  }
}

async function main() {
  console.log('🔧 Création des données de test pour les techniciens...\n');

  try {
    // Créer le technicien
    await createTechnician();
    
    // Créer des sites de test
    await createTestSites();
    
    // Créer des capteurs de test
    await createTestSensors();

    console.log('\n✅ Toutes les données de test ont été créées avec succès !');
    console.log('\n📋 Résumé:');
    console.log('   - Technicien: technician@aquoflow.com / password123');
    console.log('   - Sites de test créés');
    console.log('   - Capteurs de test créés');
    console.log('\n🚀 Vous pouvez maintenant tester les fonctionnalités des techniciens !');

  } catch (error) {
    console.error('❌ Erreur lors de la création des données de test:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { createTechnician, createTestSites, createTestSensors }; 