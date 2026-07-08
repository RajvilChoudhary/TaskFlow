const pool = require('../config/db');

// GET /api/boards  — user's boards with member count
const getAllBoards = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [boards] = await pool.execute(`
      SELECT b.*, u.name AS creator_name,
        (SELECT COUNT(*) FROM board_members bm WHERE bm.board_id = b.id) AS member_count
      FROM boards b
      JOIN users u ON b.created_by = u.id
      WHERE b.created_by = ? OR b.id IN (
        SELECT board_id FROM board_members WHERE user_id = ?
      )
      ORDER BY b.created_at DESC
    `, [userId, userId]);
    res.json(boards);
  } catch (err) { next(err); }
};

// POST /api/boards
const createBoard = async (req, res, next) => {
  try {
    const { title, background } = req.body;
    const created_by = req.user.id; // Use authenticated user ID
    const bg = background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const [result] = await pool.execute(
      'INSERT INTO boards (title, background, created_by) VALUES (?, ?, ?)',
      [title, bg, created_by]
    );
    const boardId = result.insertId;
    console.log('Board created with ID:', boardId);
    
    // Add creator as admin board member
    await pool.execute(
      'INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)',
      [boardId, created_by, 'admin']
    );
    console.log('Board member added');
    
    // Seed default labels
    const defaultLabels = [
      ['Bug', '#F87168'], ['Feature', '#579DFF'], ['Enhancement', '#4BCE97'],
      ['Design', '#9F8FEF'], ['Urgent', '#FAA53D'], ['Documentation', '#6CC3E0']
    ];
    for (const [name, color] of defaultLabels) {
      await pool.execute(
        'INSERT INTO labels (board_id, name, color) VALUES (?, ?, ?)',
        [boardId, name, color]
      );
    }
    console.log('Labels created');
    
    // Log activity
    await pool.execute(
      'INSERT INTO activity_log (board_id, user_id, action, data) VALUES (?, ?, ?, ?)',
      [boardId, created_by, 'created_board', JSON.stringify({ title })]
    );
    console.log('Activity logged');
    
    const [rows] = await pool.execute('SELECT * FROM boards WHERE id = ?', [boardId]);
    res.status(201).json(rows[0]);
  } catch (err) { 
    console.error('Create board error:', err);
    next(err); 
  }
};

// GET /api/boards/:id  — full board tree with access control
const getBoardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if user has access to this board
    const [[board]] = await pool.execute(`
      SELECT * FROM boards 
      WHERE id = ? AND (
        created_by = ? OR 
        id IN (SELECT board_id FROM board_members WHERE user_id = ?)
      )
    `, [id, userId, userId]);
    
    if (!board) return res.status(403).json({ error: 'Access denied' });

    const [lists] = await pool.execute(
      'SELECT * FROM lists WHERE board_id = ? AND archived = 0 ORDER BY position ASC',
      [id]
    );

    const [cards] = await pool.execute(`
      SELECT c.*,
        GROUP_CONCAT(DISTINCT cl.label_id) AS label_ids,
        GROUP_CONCAT(DISTINCT cm.user_id)  AS member_ids,
        (SELECT COUNT(*) FROM checklists ch WHERE ch.card_id = c.id) AS checklist_count,
        (SELECT COUNT(*) FROM checklist_items ci
          JOIN checklists ch ON ci.checklist_id = ch.id
          WHERE ch.card_id = c.id AND ci.completed = 1) AS checklist_done,
        (SELECT COUNT(*) FROM checklist_items ci2
          JOIN checklists ch2 ON ci2.checklist_id = ch2.id
          WHERE ch2.card_id = c.id) AS checklist_total,
        (SELECT COUNT(*) FROM comments co WHERE co.card_id = c.id) AS comment_count,
        (SELECT COUNT(*) FROM attachments a WHERE a.card_id = c.id) AS attachment_count
      FROM cards c
      LEFT JOIN card_labels cl ON cl.card_id = c.id
      LEFT JOIN card_members cm ON cm.card_id = c.id
      WHERE c.board_id = ? AND c.archived = 0
      GROUP BY c.id
      ORDER BY c.position ASC
    `, [id]);

    const [labels] = await pool.execute(
      'SELECT * FROM labels WHERE board_id = ?', [id]
    );
    const [members] = await pool.execute(`
      SELECT u.*, bm.role FROM users u
      JOIN board_members bm ON bm.user_id = u.id
      WHERE bm.board_id = ?
    `, [id]);

    // Build label and member maps
    const labelMap = {};
    labels.forEach(l => labelMap[l.id] = l);

    const memberMap = {};
    members.forEach(m => memberMap[m.id] = m);

    // Attach cards to lists
    const listsWithCards = lists.map(list => ({
      ...list,
      cards: cards
        .filter(c => c.list_id === list.id)
        .map(c => ({
          ...c,
          label_ids: c.label_ids ? c.label_ids.split(',').map(Number) : [],
          member_ids: c.member_ids ? c.member_ids.split(',').map(Number) : [],
        }))
    }));

    const inboxCards = cards
      .filter(c => c.list_id === null)
      .map(c => ({
        ...c,
        label_ids: c.label_ids ? c.label_ids.split(',').map(Number) : [],
        member_ids: c.member_ids ? c.member_ids.split(',').map(Number) : [],
      }));

    res.json({ ...board, lists: listsWithCards, inboxCards, labels, members });
  } catch (err) { next(err); }
};

// PUT /api/boards/:id
const updateBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, background } = req.body;
    
    // Check if user owns the board
    const [[board]] = await pool.execute(
      'SELECT * FROM boards WHERE id = ? AND created_by = ?',
      [id, userId]
    );
    
    if (!board) return res.status(403).json({ error: 'Access denied' });
    
    await pool.execute(
      'UPDATE boards SET title = COALESCE(?, title), background = COALESCE(?, background) WHERE id = ?',
      [title || null, background || null, id]
    );
    const [[updatedBoard]] = await pool.execute('SELECT * FROM boards WHERE id = ?', [id]);
    res.json(updatedBoard);
  } catch (err) { next(err); }
};

// DELETE /api/boards/:id
const deleteBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if user owns the board
    const [[board]] = await pool.execute(
      'SELECT * FROM boards WHERE id = ? AND created_by = ?',
      [id, userId]
    );
    
    if (!board) return res.status(403).json({ error: 'Access denied' });
    
    await pool.execute('DELETE FROM boards WHERE id = ?', [id]);
    res.json({ message: 'Board deleted' });
  } catch (err) { next(err); }
};

// GET /api/boards/:id/members
const getBoardMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [members] = await pool.execute(`
      SELECT u.*, bm.role FROM users u
      JOIN board_members bm ON bm.user_id = u.id
      WHERE bm.board_id = ?
    `, [id]);
    res.json(members);
  } catch (err) { next(err); }
};

// GET /api/boards/:id/cards/search
const searchCards = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { q } = req.query;
    const [cards] = await pool.execute(
      'SELECT * FROM cards WHERE board_id = ? AND archived = 0 AND title LIKE ? ORDER BY position',
      [id, `%${q}%`]
    );
    res.json(cards);
  } catch (err) { next(err); }
};

// GET /api/boards/:id/cards/filter
const filterCards = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label_id, user_id, due } = req.query;
    let sql = `
      SELECT DISTINCT c.* FROM cards c
      LEFT JOIN card_labels cl ON cl.card_id = c.id
      LEFT JOIN card_members cm ON cm.card_id = c.id
      WHERE c.board_id = ? AND c.archived = 0
    `;
    const params = [id];
    if (label_id) { sql += ' AND cl.label_id = ?'; params.push(label_id); }
    if (user_id)  { sql += ' AND cm.user_id = ?'; params.push(user_id); }
    if (due === 'overdue') {
      sql += ' AND c.due_date IS NOT NULL AND c.due_date < NOW()';
    } else if (due === 'upcoming') {
      sql += ' AND c.due_date IS NOT NULL AND c.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)';
    }
    const [cards] = await pool.execute(sql, params);
    res.json(cards);
  } catch (err) { next(err); }
};

module.exports = { getAllBoards, createBoard, getBoardById, updateBoard, deleteBoard, getBoardMembers, searchCards, filterCards };
