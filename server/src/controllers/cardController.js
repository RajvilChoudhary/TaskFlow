const pool = require('../config/db');
const { broadcastToBoard } = require('../utils/socket');

// POST /api/cards
const createCard = async (req, res, next) => {
  try {
    const { list_id, board_id, title } = req.body;
    let position = 1;
    if (list_id !== undefined && list_id !== null) {
      const [[{ maxPos }]] = await pool.execute('SELECT COALESCE(MAX(position), 0) AS maxPos FROM cards WHERE list_id = ?', [list_id]);
      position = maxPos + 1;
    } else {
      const [[{ maxPos }]] = await pool.execute('SELECT COALESCE(MAX(position), 0) AS maxPos FROM cards WHERE list_id IS NULL AND board_id = ?', [board_id]);
      position = maxPos + 1;
    }

    const [result] = await pool.execute(
      'INSERT INTO cards (list_id, board_id, title, position) VALUES (?, ?, ?, ?)',
      [list_id || null, board_id, title, position]
    );
    const cardId = result.insertId;
    await pool.execute(
      'INSERT INTO activity_log (card_id, board_id, user_id, action, data) VALUES (?, ?, ?, ?, ?)',
      [cardId, board_id, 1, 'created_card', JSON.stringify({ title, list_id })]
    );
    const [[card]] = await pool.execute('SELECT * FROM cards WHERE id = ?', [cardId]);
    const payload = { ...card, label_ids: [], member_ids: [], checklist_count: 0, checklist_done: 0, checklist_total: 0, comment_count: 0, attachment_count: 0 };
    
    // Broadcast creation
    broadcastToBoard(req, board_id, 'CARD_CREATE', payload);

    res.status(201).json(payload);
  } catch (err) { next(err); }
};

// GET /api/cards/:id  — full card detail
const getCardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[card]] = await pool.execute('SELECT * FROM cards WHERE id = ?', [id]);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const [labels] = await pool.execute(`
      SELECT l.* FROM labels l
      JOIN card_labels cl ON cl.label_id = l.id
      WHERE cl.card_id = ?
    `, [id]);

    const [members] = await pool.execute(`
      SELECT u.* FROM users u
      JOIN card_members cm ON cm.user_id = u.id
      WHERE cm.card_id = ?
    `, [id]);

    const [checklists] = await pool.execute(
      'SELECT * FROM checklists WHERE card_id = ? ORDER BY created_at ASC', [id]
    );

    for (const cl of checklists) {
      const [items] = await pool.execute(
        'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY position ASC', [cl.id]
      );
      cl.items = items;
    }

    const [comments] = await pool.execute(`
      SELECT c.*, u.name AS user_name, u.initials, u.avatar_color
      FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.card_id = ? ORDER BY c.created_at DESC
    `, [id]);

    const [attachments] = await pool.execute(`
      SELECT a.*, u.name AS user_name FROM attachments a
      JOIN users u ON u.id = a.user_id
      WHERE a.card_id = ? ORDER BY a.created_at DESC
    `, [id]);

    const [activity] = await pool.execute(`
      SELECT al.*, u.name AS user_name, u.initials, u.avatar_color
      FROM activity_log al JOIN users u ON u.id = al.user_id
      WHERE al.card_id = ? ORDER BY al.created_at DESC LIMIT 50
    `, [id]);

    res.json({ ...card, labels, members, checklists, comments, attachments, activity });
  } catch (err) { next(err); }
};

// PUT /api/cards/:id
const updateCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, cover_color, cover_image, due_date, completed } = req.body;
    const [[existing]] = await pool.execute('SELECT * FROM cards WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Card not found' });

    await pool.execute(
      `UPDATE cards SET
        title       = COALESCE(?, title),
        description = COALESCE(?, description),
        cover_color = COALESCE(?, cover_color),
        cover_image = COALESCE(?, cover_image),
        due_date    = COALESCE(?, due_date),
        completed   = COALESCE(?, completed)
       WHERE id = ?`,
      [
        title !== undefined ? title : null,
        description !== undefined ? description : null,
        cover_color !== undefined ? cover_color : null,
        cover_image !== undefined ? cover_image : null,
        due_date !== undefined ? due_date : null,
        completed !== undefined ? (completed ? 1 : 0) : null,
        id
      ]
    );
    
    const [[card]] = await pool.execute('SELECT * FROM cards WHERE id = ?', [id]);
    
    broadcastToBoard(req, existing.board_id, 'CARD_UPDATE', card);

    res.json(card);
  } catch (err) { next(err); }
};

// PUT /api/cards/:id/move
const moveCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { list_id, position } = req.body;
    const [[existing]] = await pool.execute('SELECT * FROM cards WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Card not found' });
    await pool.execute(
      'UPDATE cards SET list_id = ?, position = ? WHERE id = ?',
      [list_id || null, position, id]
    );
    await pool.execute(
      'INSERT INTO activity_log (card_id, board_id, user_id, action, data) VALUES (?, ?, ?, ?, ?)',
      [id, existing.board_id, 1, 'moved_card', JSON.stringify({ list_id, from_list: existing.list_id })]
    );

    broadcastToBoard(req, existing.board_id, 'CARD_MOVE', { id, list_id, position });

    res.json({ message: 'Card moved' });
  } catch (err) { next(err); }
};

// DELETE /api/cards/:id  (archive)
const deleteCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[card]] = await pool.execute('SELECT * FROM cards WHERE id = ?', [id]);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    await pool.execute('UPDATE cards SET archived = 1 WHERE id = ?', [id]);
    await pool.execute(
      'INSERT INTO activity_log (card_id, board_id, user_id, action, data) VALUES (?, ?, ?, ?, ?)',
      [id, card.board_id, 1, 'archived_card', JSON.stringify({ title: card.title })]
    );

    broadcastToBoard(req, card.board_id, 'CARD_DELETE', { id });

    res.json({ message: 'Card archived' });
  } catch (err) { next(err); }
};

// --- Labels ---
const addLabel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label_id } = req.body;
    await pool.execute('INSERT IGNORE INTO card_labels (card_id, label_id) VALUES (?, ?)', [id, label_id]);
    
    const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [id]);
    if (card) {
      broadcastToBoard(req, card.board_id, 'CARD_UPDATE', { id, label_id, action: 'add_label' });
    }

    res.json({ message: 'Label added' });
  } catch (err) { next(err); }
};
const removeLabel = async (req, res, next) => {
  try {
    const { id, labelId } = req.params;
    await pool.execute('DELETE FROM card_labels WHERE card_id = ? AND label_id = ?', [id, labelId]);
    
    const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [id]);
    if (card) {
      broadcastToBoard(req, card.board_id, 'CARD_UPDATE', { id, labelId, action: 'remove_label' });
    }

    res.json({ message: 'Label removed' });
  } catch (err) { next(err); }
};

// --- Members ---
const addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    await pool.execute('INSERT IGNORE INTO card_members (card_id, user_id) VALUES (?, ?)', [id, user_id]);
    const [[user]] = await pool.execute('SELECT * FROM users WHERE id = ?', [user_id]);
    
    const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [id]);
    if (card) {
      broadcastToBoard(req, card.board_id, 'CARD_UPDATE', { id, user_id, action: 'add_member' });
    }

    res.json(user);
  } catch (err) { next(err); }
};
const removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    await pool.execute('DELETE FROM card_members WHERE card_id = ? AND user_id = ?', [id, userId]);
    
    const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [id]);
    if (card) {
      broadcastToBoard(req, card.board_id, 'CARD_UPDATE', { id, userId, action: 'remove_member' });
    }

    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
};

module.exports = { createCard, getCardById, updateCard, moveCard, deleteCard, addLabel, removeLabel, addMember, removeMember };
