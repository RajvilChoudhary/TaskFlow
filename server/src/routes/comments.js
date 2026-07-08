const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const c = require('../controllers/commentController');
router.delete('/:id', authMiddleware, c.deleteComment);
module.exports = router;
