const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

/**
 * Register a new user
 */
const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Generate initials from name
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 4);

    // Insert new user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, initials, password_hash, avatar_color, role) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, initials, password_hash, '#7C5CBF', 'user']
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, email, role: 'user' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      user: { 
        id: result.insertId, 
        name, 
        email, 
        initials, 
        avatar_color: '#7C5CBF',
        role: 'user'
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if user has a password hash (for existing users without password)
    if (!user.password_hash || user.password_hash === '$2a$10$temporary-placeholder') {
      return res.status(401).json({ 
        error: 'This account does not have a password set. Please register a new account.' 
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role || 'user' 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        initials: user.initials,
        avatar_color: user.avatar_color,
        role: user.role || 'user'
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get current authenticated user
 */
const getCurrentUser = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, initials, avatar_color, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Guest login - creates or logs into a persistent guest account with template boards
 */
const guestLogin = async (req, res) => {
  try {
    const guestEmail = 'guest@taskflow.com';
    let [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [guestEmail]);
    
    let user;
    if (users.length === 0) {
      const password_hash = await bcrypt.hash('guest123', 10);
      const [result] = await pool.execute(
        'INSERT INTO users (name, email, initials, password_hash, avatar_color, role) VALUES (?, ?, ?, ?, ?, ?)',
        ['Guest Explorer', guestEmail, 'GE', password_hash, '#4EDE8A', 'user']
      );
      user = {
        id: result.insertId,
        name: 'Guest Explorer',
        email: guestEmail,
        initials: 'GE',
        avatar_color: '#4EDE8A',
        role: 'user'
      };
    } else {
      user = users[0];
    }

    // Ensure guest user has template boards
    const [guestBoards] = await pool.execute('SELECT id FROM boards WHERE created_by = ?', [user.id]);
    if (guestBoards.length === 0) {
      // 1. Create Roadmap Template Board
      const [b1] = await pool.execute(
        'INSERT INTO boards (title, background, created_by) VALUES (?, ?, ?)',
        ['🚀 Product Roadmap (Demo)', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', user.id]
      );
      await pool.execute('INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)', [b1.insertId, user.id, 'owner']);

      const [l1] = await pool.execute('INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)', [b1.insertId, '📋 Backlog', 1]);
      const [l2] = await pool.execute('INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)', [b1.insertId, '⚙️ In Progress', 2]);
      const [l3] = await pool.execute('INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)', [b1.insertId, '✅ Completed', 3]);

      await pool.execute('INSERT INTO cards (list_id, board_id, title, description, position) VALUES (?, ?, ?, ?, ?)', [l1.insertId, b1.insertId, 'Design New Landing Page', 'Create a modern WebGL glassmorphism design', 1]);
      await pool.execute('INSERT INTO cards (list_id, board_id, title, description, position) VALUES (?, ?, ?, ?, ?)', [l2.insertId, b1.insertId, 'Real-time WebSocket Sync', 'Sync updates live between collaborators', 1]);
      await pool.execute('INSERT INTO cards (list_id, board_id, title, description, position) VALUES (?, ?, ?, ?, ?)', [l3.insertId, b1.insertId, 'JWT Auth & Guest Mode', 'Persistent session and instant guest login', 1]);

      // 2. Create Team Tasks Template Board
      const [b2] = await pool.execute(
        'INSERT INTO boards (title, background, created_by) VALUES (?, ?, ?)',
        ['🎯 Team Sprint Board (Demo)', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', user.id]
      );
      await pool.execute('INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)', [b2.insertId, user.id, 'owner']);

      const [bl1] = await pool.execute('INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)', [b2.insertId, 'To Do', 1]);
      const [bl2] = await pool.execute('INSERT INTO lists (board_id, title, position) VALUES (?, ?, ?)', [b2.insertId, 'Doing', 2]);

      await pool.execute('INSERT INTO cards (list_id, board_id, title, description, position) VALUES (?, ?, ?, ?, ?)', [bl1.insertId, b2.insertId, 'Try dragging cards across lists', 'You can move cards between columns seamlessly', 1]);
      await pool.execute('INSERT INTO cards (list_id, board_id, title, description, position) VALUES (?, ?, ?, ?, ?)', [bl2.insertId, b2.insertId, 'Open card modal to add comments & checklists', 'Click on any card to explore detailed features', 1]);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        initials: user.initials,
        avatar_color: user.avatar_color,
        role: user.role || 'user'
      },
      token
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, guestLogin, getCurrentUser };
