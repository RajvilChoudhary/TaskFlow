const pool = require('../config/db');
const { broadcastToBoard } = require('../utils/socket');
const path = require('path');
const fs   = require('fs');

// POST /api/cards/:id/attachments
const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { id: card_id } = req.params;
    const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [card_id]);
    const url = `/uploads/${req.file.filename}`;
    const [result] = await pool.execute(
      'INSERT INTO attachments (card_id, user_id, filename, original_name, url) VALUES (?, ?, ?, ?, ?)',
      [card_id, 1, req.file.filename, req.file.originalname, url]
    );
    await pool.execute(
      'INSERT INTO activity_log (card_id, board_id, user_id, action, data) VALUES (?, ?, ?, ?, ?)',
      [card_id, card.board_id, 1, 'added_attachment', JSON.stringify({ name: req.file.originalname })]
    );
    const [[attachment]] = await pool.execute('SELECT * FROM attachments WHERE id = ?', [result.insertId]);

    // Broadcast attachment addition
    if (card) {
      broadcastToBoard(req, card.board_id, 'ATTACHMENT_ADD', { card_id: Number(card_id), attachment });
    }

    res.status(201).json(attachment);
  } catch (err) { next(err); }
};

// DELETE /api/attachments/:id
const deleteAttachment = async (req, res, next) => {
  try {
    const attId = req.params.id;
    const [[attachment]] = await pool.execute('SELECT * FROM attachments WHERE id = ?', [attId]);
    if (!attachment) return res.status(404).json({ error: 'Not found' });
    
    const filePath = path.join(__dirname, '../../uploads', attachment.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    await pool.execute('DELETE FROM attachments WHERE id = ?', [attId]);

    const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [attachment.card_id]);
    if (card) {
      broadcastToBoard(req, card.board_id, 'ATTACHMENT_DELETE', { card_id: attachment.card_id, attachment_id: Number(attId) });
    }

    res.json({ message: 'Attachment deleted' });
  } catch (err) { next(err); }
};

module.exports = { uploadAttachment, deleteAttachment };
