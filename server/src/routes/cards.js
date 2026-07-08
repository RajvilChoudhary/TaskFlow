const router   = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const c        = require('../controllers/cardController');
const cc       = require('../controllers/commentController');
const chc      = require('../controllers/checklistController');
const multer   = require('multer');
const path     = require('path');
const { v4: uuidv4 } = require('uuid');
const ac       = require('../controllers/attachmentController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename:    (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.post('/',             authMiddleware, c.createCard);
router.get('/:id',           authMiddleware, c.getCardById);
router.put('/:id',           authMiddleware, c.updateCard);
router.put('/:id/move',      authMiddleware, c.moveCard);
router.delete('/:id',        authMiddleware, c.deleteCard);

// Labels
router.post('/:id/labels',           authMiddleware, c.addLabel);
router.delete('/:id/labels/:labelId',authMiddleware, c.removeLabel);

// Members
router.post('/:id/members',            authMiddleware, c.addMember);
router.delete('/:id/members/:userId',  authMiddleware, c.removeMember);

// Checklists
router.post('/:id/checklists', authMiddleware, chc.createChecklist);

// Comments + Activity
router.get('/:id/comments',  authMiddleware, cc.getComments);
router.post('/:id/comments', authMiddleware, cc.addComment);
router.get('/:id/activity',  authMiddleware, cc.getActivity);

// Attachments
router.post('/:id/attachments', authMiddleware, upload.single('file'), ac.uploadAttachment);

module.exports = router;
