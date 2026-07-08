const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const c = require('../controllers/labelController');
router.put('/:id',    authMiddleware, c.updateLabel);
router.delete('/:id', authMiddleware, c.deleteLabel);
module.exports = router;
