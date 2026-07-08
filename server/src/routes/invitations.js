const express = require('express');
const router = express.Router();
const { sendInvitation, getInvitations, acceptInvitation, declineInvitation } = require('../controllers/invitationController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, sendInvitation);
router.get('/', authMiddleware, getInvitations);
router.put('/:id/accept', authMiddleware, acceptInvitation);
router.put('/:id/decline', authMiddleware, declineInvitation);

module.exports = router;
