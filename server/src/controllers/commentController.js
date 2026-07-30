const pool = require('../config/db');
const { broadcastToBoard } = require('../utils/socket');

// GET /api/cards/:id/comments
const getComments = async (req, res, next) => {
  try {
    const [comments] = await pool.execute(`
      SELECT c.*, u.name AS user_name, u.initials, u.avatar_color
      FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.card_id = ? ORDER BY c.created_at DESC
    `, [req.params.id]);
    res.json(comments);
  } catch (err) { next(err); }
};

// POST /api/cards/:id/comments
const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const { id: card_id } = req.params;
    const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [card_id]);
    const [result] = await pool.execute(
      'INSERT INTO comments (card_id, user_id, content) VALUES (?, ?, ?)',
      [card_id, 1, content]
    );
    await pool.execute(
      'INSERT INTO activity_log (card_id, board_id, user_id, action, data) VALUES (?, ?, ?, ?, ?)',
      [card_id, card.board_id, 1, 'added_comment', JSON.stringify({ content: content.substring(0, 50) })]
    );
    const [[row]] = await pool.execute(`
      SELECT c.*, u.name AS user_name, u.initials, u.avatar_color
      FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
    `, [result.insertId]);

    // Broadcast comment addition
    broadcastToBoard(req, card.board_id, 'COMMENT_ADD', { card_id: Number(card_id), comment: row });

    res.status(201).json(row);
  } catch (err) { next(err); }
};

// DELETE /api/comments/:id
const deleteComment = async (req, res, next) => {
  try {
    const commentId = req.params.id;
    const [[comment]] = await pool.execute('SELECT card_id FROM comments WHERE id = ?', [commentId]);
    
    await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);

    if (comment) {
      const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [comment.card_id]);
      if (card) {
        broadcastToBoard(req, card.board_id, 'COMMENT_DELETE', { card_id: comment.card_id, comment_id: Number(commentId) });
      }
    }

    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
};

// GET /api/cards/:id/activity
const getActivity = async (req, res, next) => {
  try {
    const [activity] = await pool.execute(`
      SELECT al.*, u.name AS user_name, u.initials, u.avatar_color
      FROM activity_log al JOIN users u ON u.id = al.user_id
      WHERE al.card_id = ? ORDER BY al.created_at DESC LIMIT 50
    `, [req.params.id]);
    res.json(activity);
  } catch (err) { next(err); }
};

module.exports = { getComments, addComment, deleteComment, getActivity };
