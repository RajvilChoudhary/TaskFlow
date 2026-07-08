const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const c = require('../controllers/attachmentController');
router.delete('/:id', authMiddleware, c.deleteAttachment);
module.exports = router;
