const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getSectorManagers = async (req, res) => {
  try {
    const sectorManagers = await prisma.user.findMany({
      where: {
        role: 'SECTOR_MANAGER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    res.json(sectorManagers);
  } catch (error) {
    console.error('Erreur lors de la récupération des chefs de secteur:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des chefs de secteur' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
};

module.exports = {
  getSectorManagers,
  getAllUsers
}; 