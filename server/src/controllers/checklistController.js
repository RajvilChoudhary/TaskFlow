const pool = require('../config/db');
const { broadcastToBoard } = require('../utils/socket');

// POST /api/cards/:id/checklists
const createChecklist = async (req, res, next) => {
  try {
    const { title } = req.body;
    const { id: card_id } = req.params;
    const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [card_id]);
    const [result] = await pool.execute(
      'INSERT INTO checklists (card_id, title) VALUES (?, ?)',
      [card_id, title || 'Checklist']
    );
    await pool.execute(
      'INSERT INTO activity_log (card_id, board_id, user_id, action, data) VALUES (?, ?, ?, ?, ?)',
      [card_id, card.board_id, req.user.id, 'added_checklist', JSON.stringify({ title })]
    );
    const [[checklist]] = await pool.execute('SELECT * FROM checklists WHERE id = ?', [result.insertId]);

    // Broadcast checklist creation
    broadcastToBoard(req, card.board_id, 'CHECKLIST_ADD', { card_id: Number(card_id), checklist: { ...checklist, items: [] } });

    res.status(201).json({ ...checklist, items: [] });
  } catch (err) { next(err); }
};

// DELETE /api/checklists/:id
const deleteChecklist = async (req, res, next) => {
  try {
    const clId = req.params.id;
    const [[checklist]] = await pool.execute('SELECT card_id FROM checklists WHERE id = ?', [clId]);
    
    await pool.execute('DELETE FROM checklists WHERE id = ?', [clId]);

    if (checklist) {
      const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [checklist.card_id]);
      if (card) {
        broadcastToBoard(req, card.board_id, 'CHECKLIST_DELETE', { card_id: checklist.card_id, checklist_id: Number(clId) });
      }
    }

    res.json({ message: 'Checklist deleted' });
  } catch (err) { next(err); }
};

// POST /api/checklists/:id/items
const addItem = async (req, res, next) => {
  try {
    const { title } = req.body;
    const { id: checklist_id } = req.params;
    
    const [[checklist]] = await pool.execute('SELECT card_id FROM checklists WHERE id = ?', [checklist_id]);
    if (!checklist) return res.status(404).json({ error: 'Checklist not found' });
    const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [checklist.card_id]);

    const [[{ maxPos }]] = await pool.execute(
      'SELECT COALESCE(MAX(position), 0) AS maxPos FROM checklist_items WHERE checklist_id = ?',
      [checklist_id]
    );
    const [result] = await pool.execute(
      'INSERT INTO checklist_items (checklist_id, title, position) VALUES (?, ?, ?)',
      [checklist_id, title, maxPos + 1]
    );
    const [[item]] = await pool.execute('SELECT * FROM checklist_items WHERE id = ?', [result.insertId]);

    if (card) {
      broadcastToBoard(req, card.board_id, 'CHECKLIST_ITEM_ADD', { card_id: checklist.card_id, checklist_id: Number(checklist_id), item });
    }

    res.status(201).json(item);
  } catch (err) { next(err); }
};

// PUT /api/checklist-items/:id
const updateItem = async (req, res, next) => {
  try {
    const { title, completed } = req.body;
    const itemId = req.params.id;

    const [[itemData]] = await pool.execute('SELECT checklist_id FROM checklist_items WHERE id = ?', [itemId]);
    if (!itemData) return res.status(404).json({ error: 'Item not found' });
    
    const [[checklist]] = await pool.execute('SELECT card_id FROM checklists WHERE id = ?', [itemData.checklist_id]);
    const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [checklist.card_id]);

    await pool.execute(
      'UPDATE checklist_items SET title = COALESCE(?, title), completed = COALESCE(?, completed) WHERE id = ?',
      [title || null, completed !== undefined ? completed : null, itemId]
    );
    const [[item]] = await pool.execute('SELECT * FROM checklist_items WHERE id = ?', [itemId]);

    if (card) {
      broadcastToBoard(req, card.board_id, 'CHECKLIST_ITEM_UPDATE', { card_id: checklist.card_id, checklist_id: itemData.checklist_id, item });
    }

    res.json(item);
  } catch (err) { next(err); }
};

// DELETE /api/checklist-items/:id
const deleteItem = async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const [[itemData]] = await pool.execute('SELECT checklist_id FROM checklist_items WHERE id = ?', [itemId]);
    if (!itemData) return res.status(404).json({ error: 'Item not found' });

    const [[checklist]] = await pool.execute('SELECT card_id FROM checklists WHERE id = ?', [itemData.checklist_id]);
    const [[card]] = await pool.execute('SELECT board_id FROM cards WHERE id = ?', [checklist.card_id]);

    await pool.execute('DELETE FROM checklist_items WHERE id = ?', [itemId]);

    if (card) {
      broadcastToBoard(req, card.board_id, 'CHECKLIST_ITEM_DELETE', { card_id: checklist.card_id, checklist_id: itemData.checklist_id, item_id: Number(itemId) });
    }

    res.json({ message: 'Item deleted' });
  } catch (err) { next(err); }
};

module.exports = { createChecklist, deleteChecklist, addItem, updateItem, deleteItem };
