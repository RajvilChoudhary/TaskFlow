const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const c = require('../controllers/listController');
router.post('/',             authMiddleware, c.createList);
router.put('/:id',           authMiddleware, c.updateList);
router.put('/:id/reorder',   authMiddleware, c.reorderList);
router.delete('/:id',        authMiddleware, c.deleteList);
module.exports = router;
