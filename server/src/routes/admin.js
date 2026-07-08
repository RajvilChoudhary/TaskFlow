const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole, getUserStats } = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/users', authMiddleware, adminMiddleware, getAllUsers);
router.get('/stats', authMiddleware, adminMiddleware, getUserStats);
router.put('/users/:id/role', authMiddleware, adminMiddleware, updateUserRole);

module.exports = router;
