const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const c = require('../controllers/notificationController');

router.get('/',              authMiddleware, c.getNotifications);
router.patch('/read-all',   authMiddleware, c.markAllRead);
router.patch('/:id/read',   authMiddleware, c.markRead);

module.exports = router;
