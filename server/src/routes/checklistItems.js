const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const c = require('../controllers/checklistController');
router.put('/:id',    authMiddleware, c.updateItem);
router.delete('/:id', authMiddleware, c.deleteItem);
module.exports = router;
