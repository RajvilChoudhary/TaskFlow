const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const c = require('../controllers/checklistController');
router.delete('/:id',         authMiddleware, c.deleteChecklist);
router.post('/:id/items',     authMiddleware, c.addItem);
module.exports = router;
