const express = require('express');
const { getSectorManagers, getAllUsers } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Route pour récupérer tous les utilisateurs
router.get('/', authenticateToken, getAllUsers);

// Route pour récupérer les chefs de secteur
router.get('/sector-managers', authenticateToken, getSectorManagers);

module.exports = router; 