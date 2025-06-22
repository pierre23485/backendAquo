import { PrismaClient } from '@prisma/client';
import { AlertType, AlertLevel } from '@prisma/client';
import { sendEmail } from './emailService.js';

const prisma = new PrismaClient();

// Fonction pour formater le numéro de téléphone au format RDC
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Supprimer tous les caractères non numériques
  let cleaned = phone.replace(/\D/g, '');
  
  // Si le numéro commence par 0, le remplacer par +243
  if (cleaned.startsWith('0')) {
    cleaned = '+243' + cleaned.substring(1);
  }
  // Si le numéro commence par 243, ajouter le +
  else if (cleaned.startsWith('243')) {
    cleaned = '+' + cleaned;
  }
  // Si le numéro n'a pas de préfixe, ajouter +243
  else if (!cleaned.startsWith('+')) {
    cleaned = '+243' + cleaned;
  }
  
  return cleaned;
};

export const sendAlertNotifications = async (alert) => {
  try {
    // Récupérer les informations du site
    const site = await prisma.site.findUnique({
      where: { id: alert.siteId },
      include: {
        households: {
          where: { isActive: true },
          select: { contact: true }
        }
      }
    });

    if (!site) {
      console.error('Site non trouvé pour l\'alerte:', alert.id);
      return;
    }

    // Récupérer les administrateurs
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    // Récupérer le gestionnaire du secteur
    const sectorManager = await prisma.user.findFirst({
      where: { 
        role: 'SECTOR_MANAGER',
        managedSites: {
          some: { id: site.id }
        }
      }
    });

    // Préparer le message
    const message = `ALERTE AQUA\nType: ${alert.type}\nNiveau: ${alert.level}\nSite: ${site.name}\nMessage: ${alert.message}\nDate: ${new Date().toLocaleString('fr-FR')}`;

    console.log('Message à envoyer:', message);

    // Here you can add email sending logic to admins if needed
    for (const admin of admins) {
      if (admin.email) {
        await sendEmail(
          admin.email,
          `Aqua Alert - ${alert.type} - ${site.name}`,
          alert.message,
          `<h2>Aqua Alert</h2><p><strong>Type:</strong> ${alert.type}</p><p><strong>Level:</strong> ${alert.level}</p><p><strong>Site:</strong> ${site.name}</p><p><strong>Message:</strong> ${alert.message}</p><p><strong>Date:</strong> ${new Date().toLocaleString('en-US')}</p>`
        );
      }
    }

    // Envoyer les notifications au gestionnaire du secteur
    if (sectorManager && sectorManager.email) {
      await sendEmail(
        sectorManager.email,
        `Aqua Alert - ${alert.type} - ${site.name}`,
        alert.message,
        `<h2>Aqua Alert</h2><p><strong>Type:</strong> ${alert.type}</p><p><strong>Level:</strong> ${alert.level}</p><p><strong>Site:</strong> ${site.name}</p><p><strong>Message:</strong> ${alert.message}</p><p><strong>Date:</strong> ${new Date().toLocaleString('en-US')}</p>`
      );
    }

    // Envoyer les notifications aux ménages
    for (const household of site.households) {
      if (household.email) {
        await sendEmail(
          household.email,
          `Aqua Alert - ${alert.type} - ${site.name}`,
          alert.message,
          `<h2>Aqua Alert</h2><p><strong>Type:</strong> ${alert.type}</p><p><strong>Level:</strong> ${alert.level}</p><p><strong>Site:</strong> ${site.name}</p><p><strong>Message:</strong> ${alert.message}</p><p><strong>Date:</strong> ${new Date().toLocaleString('en-US')}</p>`
        );
      }
    }

  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications:', error);
    // Ne pas propager l'erreur pour ne pas bloquer le processus principal
  }
}; 