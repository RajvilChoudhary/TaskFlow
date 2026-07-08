const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const c = require('../controllers/memberController');
router.get('/', authMiddleware, c.getAllMembers);
module.exports = router;
