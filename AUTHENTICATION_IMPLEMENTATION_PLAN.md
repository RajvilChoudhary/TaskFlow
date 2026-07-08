# Authentication & Access Control Implementation Plan

## Overview
Add authentication system to TaskFlow with user-specific board access, board sharing capabilities, and admin user management.

---

## Phase 1: Backend Authentication Foundation

### 1.1 Install Authentication Dependencies
```bash
cd server
npm install bcryptjs jsonwebtoken
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

### 1.2 Update Database Schema
**Add to `server/src/db/schema.sql`:**
```sql
-- Add password_hash to users table
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL AFTER email;

-- Add sessions table for token management
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id)
);

-- Add invitations table for board sharing
CREATE TABLE IF NOT EXISTS board_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  board_id INT NOT NULL,
  invited_by INT NOT NULL,
  invited_email VARCHAR(150) NOT NULL,
  invited_user_id INT NULL,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_pending_invitation (board_id, invited_email, status)
);
```

### 1.3 Create Authentication Middleware
**File: `server/src/middleware/auth.js`**
```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };
```

### 1.4 Create Auth Controller
**File: `server/src/controllers/authController.js`**
```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// Register new user
const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Generate initials
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 4);

    // Insert user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, initials, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)',
      [name, email, initials, password_hash, '#7C5CBF']
    );

    const token = jwt.sign({ id: result.insertId, email, role: 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      user: { id: result.insertId, name, email, initials, avatar_color: '#7C5CBF' },
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login user
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
        avatar_color: user.avatar_color
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, initials, avatar_color, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, getCurrentUser };
```

### 1.5 Create Auth Routes
**File: `server/src/routes/auth.js`**
```javascript
const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;
```

### 1.6 Update Main App
**Update `server/src/app.js`:**
```javascript
// Add auth routes
app.use('/api/auth', require('./routes/auth'));

// Add JWT_SECRET to .env
```

### 1.7 Update Environment Variables
**Add to `server/.env.example`:**
```
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

---

## Phase 2: Frontend Authentication UI

### 2.1 Create Auth Context
**File: `client/src/context/AuthContext.jsx`**
```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, getCurrentUser } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getCurrentUser().then(res => {
        setUser(res.data.user);
      }).catch(() => {
        localStorage.removeItem('token');
        setToken(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await apiLogin({ email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await apiRegister({ name, email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 2.2 Update API Client
**Update `client/src/api/index.js`:**
```javascript
// Add auth interceptors
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add auth endpoints
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getCurrentUser = () => api.get('/auth/me');
```

### 2.3 Create Login Page
**File: `client/src/pages/LoginPage.jsx`**
```javascript
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Welcome to TaskFlow</h1>
        <p className="auth-subtitle">Sign in to continue</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
```

### 2.4 Create Register Page
**File: `client/src/pages/RegisterPage.jsx`**
```javascript
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './RegisterPage.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      await register(formData.name, formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="auth-subtitle">Join TaskFlow today</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
              minLength={6}
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
```

### 2.5 Update App Routing
**Update `client/src/App.jsx`:**
```javascript
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Header from './components/layout/Header';
import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!isAuthPage && user && <Header />}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          <Route path="/board/:id" element={
            <ProtectedRoute>
              <BoardPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
```

### 2.6 Update Main.jsx
**Update `client/src/main.jsx`:**
```javascript
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';

// Wrap AppProvider with AuthProvider
<BrowserRouter>
  <AuthProvider>
    <AppProvider>
      <App />
    </AppProvider>
  </AuthProvider>
</BrowserRouter>
```

### 2.7 Add Logout to Header
**Update `client/src/components/layout/Header.jsx`:**
```javascript
import { useAuth } from '../../context/AuthContext';

const { user, logout } = useAuth();

// Add logout button in header-right section
<button onClick={logout} className="icon-btn">
  <span className="material-symbols-outlined">logout</span>
</button>
```

---

## Phase 3: Board Access Control

### 3.1 Update Board Controller
**Update `server/src/controllers/boardController.js`:**
```javascript
// Modify getBoards to only return user's boards
const getBoards = async (req, res) => {
  try {
    const [boards] = await pool.execute(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM lists WHERE board_id = b.id AND archived = 0) as list_count
      FROM boards b
      WHERE b.created_by = ? OR b.id IN (
        SELECT board_id FROM board_members WHERE user_id = ?
      )
      ORDER BY b.created_at DESC
    `, [req.user.id, req.user.id]);

    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Modify getBoard to check access
const getBoard = async (req, res) => {
  try {
    const [boards] = await pool.execute(`
      SELECT * FROM boards 
      WHERE id = ? AND (
        created_by = ? OR 
        id IN (SELECT board_id FROM board_members WHERE user_id = ?)
      )
    `, [req.params.id, req.user.id, req.user.id]);

    if (boards.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Return full board data with lists, cards, etc.
    // ... existing logic
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 3.2 Protect All Board Routes
**Update `server/src/routes/boards.js`:**
```javascript
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, getBoards);
router.post('/', authMiddleware, createBoard);
router.get('/:id', authMiddleware, getBoard);
router.put('/:id', authMiddleware, updateBoard);
router.delete('/:id', authMiddleware, deleteBoard);
```

### 3.3 Protect All Other Routes
**Apply `authMiddleware` to all routes in:**
- `server/src/routes/lists.js`
- `server/src/routes/cards.js`
- `server/src/routes/labels.js`
- `server/src/routes/checklists.js`
- `server/src/routes/comments.js`
- `server/src/routes/attachments.js`

---

## Phase 4: Board Sharing & Invitations

### 4.1 Create Invitation Controller
**File: `server/src/controllers/invitationController.js`**
```javascript
const pool = require('../config/db');

// Send board invitation
const sendInvitation = async (req, res) => {
  const { board_id, email } = req.body;

  try {
    // Verify user owns the board
    const [boards] = await pool.execute(
      'SELECT * FROM boards WHERE id = ? AND created_by = ?',
      [board_id, req.user.id]
    );

    if (boards.length === 0) {
      return res.status(403).json({ error: 'You do not own this board' });
    }

    // Check if user exists with this email
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    const invited_user_id = users.length > 0 ? users[0].id : null;

    // Create invitation
    const [result] = await pool.execute(
      'INSERT INTO board_invitations (board_id, invited_by, invited_email, invited_user_id) VALUES (?, ?, ?, ?)',
      [board_id, req.user.id, email, invited_user_id]
    );

    // If user exists, add them as board member immediately
    if (invited_user_id) {
      await pool.execute(
        'INSERT IGNORE INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)',
        [board_id, invited_user_id, 'member']
      );
    }

    res.json({ 
      invitation: { id: result.insertId, board_id, invited_email, invited_user_id },
      message: invited_user_id ? 'User added to board' : 'Invitation sent'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's invitations
const getInvitations = async (req, res) => {
  try {
    const [invitations] = await pool.execute(`
      SELECT i.*, b.title as board_title, u.name as inviter_name
      FROM board_invitations i
      JOIN boards b ON i.board_id = b.id
      JOIN users u ON i.invited_by = u.id
      WHERE i.invited_email = ? OR i.invited_user_id = ?
      ORDER BY i.created_at DESC
    `, [req.user.email, req.user.id]);

    res.json(invitations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Accept invitation
const acceptInvitation = async (req, res) => {
  try {
    const [invitations] = await pool.execute(
      'SELECT * FROM board_invitations WHERE id = ? AND (invited_email = ? OR invited_user_id = ?)',
      [req.params.id, req.user.email, req.user.id]
    );

    if (invitations.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = invitations[0];

    // Add as board member
    await pool.execute(
      'INSERT IGNORE INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)',
      [invitation.board_id, req.user.id, 'member']
    );

    // Update invitation status
    await pool.execute(
      'UPDATE board_invitations SET status = ?, invited_user_id = ? WHERE id = ?',
      ['accepted', req.user.id, req.params.id]
    );

    res.json({ message: 'Invitation accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Decline invitation
const declineInvitation = async (req, res) => {
  try {
    await pool.execute(
      'UPDATE board_invitations SET status = ? WHERE id = ? AND (invited_email = ? OR invited_user_id = ?)',
      ['declined', req.params.id, req.user.email, req.user.id]
    );

    res.json({ message: 'Invitation declined' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { sendInvitation, getInvitations, acceptInvitation, declineInvitation };
```

### 4.2 Create Invitation Routes
**File: `server/src/routes/invitations.js`**
```javascript
const express = require('express');
const router = express.Router();
const { sendInvitation, getInvitations, acceptInvitation, declineInvitation } = require('../controllers/invitationController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, sendInvitation);
router.get('/', authMiddleware, getInvitations);
router.put('/:id/accept', authMiddleware, acceptInvitation);
router.put('/:id/decline', authMiddleware, declineInvitation);

module.exports = router;
```

### 4.3 Add Invitation Routes to App
**Update `server/src/app.js`:**
```javascript
app.use('/api/invitations', require('./routes/invitations'));
```

### 4.4 Update API Client
**Update `client/src/api/index.js`:**
```javascript
// Invitation endpoints
export const sendInvitation = (data) => api.post('/invitations', data);
export const getInvitations = () => api.get('/invitations');
export const acceptInvitation = (id) => api.put(`/invitations/${id}/accept`);
export const declineInvitation = (id) => api.put(`/invitations/${id}/decline`);
```

### 4.5 Create Board Share Modal
**File: `client/src/components/board/ShareModal.jsx`**
```javascript
import React, { useState } from 'react';
import { sendInvitation } from '../../api';

export default function ShareModal({ boardId, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleShare = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await sendInvitation({ board_id: boardId, email });
      setMessage('Invitation sent successfully!');
      setEmail('');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Board</h2>
          <button onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleShare}>
          <div className="form-group">
            <label>Invite by email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
        
        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
}
```

### 4.6 Add Share Button to Board Page
**Update `client/src/pages/BoardPage.jsx`:**
```javascript
import ShareModal from '../components/board/ShareModal';

const [showShareModal, setShowShareModal] = useState(false);

// Add share button in header
<button onClick={() => setShowShareModal(true)}>Share</button>

{showShareModal && (
  <ShareModal 
    boardId={id} 
    onClose={() => setShowShareModal(false)} 
  />
)}
```

### 4.7 Create Invitations Page
**File: `client/src/pages/InvitationsPage.jsx`**
```javascript
import React, { useState, useEffect } from 'react';
import { getInvitations, acceptInvitation, declineInvitation } from '../api';
import { useAuth } from '../context/AuthContext';

export default function InvitationsPage() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvitations().then(res => {
      setInvitations(res.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id) => {
    await acceptInvitation(id);
    setInvitations(invitations.filter(i => i.id !== id));
  };

  const handleDecline = async (id) => {
    await declineInvitation(id);
    setInvitations(invitations.filter(i => i.id !== id));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="invitations-page">
      <h1>Pending Invitations</h1>
      
      {invitations.length === 0 ? (
        <p>No pending invitations</p>
      ) : (
        <div className="invitations-list">
          {invitations.map(inv => (
            <div key={inv.id} className="invitation-card">
              <h3>{inv.board_title}</h3>
              <p>Invited by: {inv.inviter_name}</p>
              <div className="invitation-actions">
                <button onClick={() => handleAccept(inv.id)}>Accept</button>
                <button onClick={() => handleDecline(inv.id)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Phase 5: Admin User Management

### 5.1 Add Admin Role to Users
**Update `server/src/db/schema.sql`:**
```sql
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user';
```

### 5.2 Create Admin Controller
**File: `server/src/controllers/adminController.js`**
```javascript
const pool = require('../config/db');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT u.id, u.name, u.email, u.initials, u.avatar_color, u.role, u.created_at,
        COUNT(DISTINCT b.id) as boards_created,
        COUNT(DISTINCT bm.board_id) as boards_member
      FROM users u
      LEFT JOIN boards b ON u.id = b.created_by
      LEFT JOIN board_members bm ON u.id = bm.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user role (admin only)
const updateUserRole = async (req, res) => {
  const { role } = req.body;

  try {
    await pool.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, req.params.id]
    );

    res.json({ message: 'User role updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user statistics (admin only)
const getUserStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_users_week
      FROM users
    `);

    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllUsers, updateUserRole, getUserStats };
```

### 5.3 Create Admin Routes
**File: `server/src/routes/admin.js`**
```javascript
const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole, getUserStats } = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/users', authMiddleware, adminMiddleware, getAllUsers);
router.get('/stats', authMiddleware, adminMiddleware, getUserStats);
router.put('/users/:id/role', authMiddleware, adminMiddleware, updateUserRole);

module.exports = router;
```

### 5.4 Add Admin Routes to App
**Update `server/src/app.js`:**
```javascript
app.use('/api/admin', require('./routes/admin'));
```

### 5.5 Update API Client
**Update `client/src/api/index.js`:**
```javascript
// Admin endpoints
export const getAllUsers = () => api.get('/admin/users');
export const updateUserRole = (id, role) => api.put(`/admin/users/${id}/role`, { role });
export const getUserStats = () => api.get('/admin/stats');
```

### 5.6 Create Admin Dashboard
**File: `client/src/pages/AdminDashboard.jsx`**
```javascript
import React, { useState, useEffect } from 'react';
import { getAllUsers, updateUserRole, getUserStats } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllUsers(), getUserStats()])
      .then(([usersRes, statsRes]) => {
        setUsers(usersRes.data);
        setStats(statsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    await updateUserRole(userId, newRole);
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-value">{stats.total_users}</p>
        </div>
        <div className="stat-card">
          <h3>Admins</h3>
          <p className="stat-value">{stats.admin_count}</p>
        </div>
        <div className="stat-card">
          <h3>Regular Users</h3>
          <p className="stat-value">{stats.user_count}</p>
        </div>
        <div className="stat-card">
          <h3>New This Week</h3>
          <p className="stat-value">{stats.new_users_week}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table">
        <h2>All Users</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Boards Created</th>
              <th>Boards Member</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select 
                    value={u.role} 
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={u.id === user.id}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>{u.boards_created}</td>
                <td>{u.boards_member}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  {u.id !== user.id && (
                    <button onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')}>
                      Toggle Role
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 5.7 Add Admin Route to App
**Update `client/src/App.jsx`:**
```javascript
import AdminDashboard from './pages/AdminDashboard';

// Add admin route (protected)
<Route path="/admin" element={
  <ProtectedRoute>
    {user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />}
  </ProtectedRoute>
} />
```

### 5.8 Add Admin Link to Header
**Update `client/src/components/layout/Header.jsx`:**
```javascript
const { user } = useAuth();

// Add admin link in header if user is admin
{user?.role === 'admin' && (
  <Link to="/admin" className="header-link">Admin</Link>
)}
```

---

## Phase 6: Database Migration & Seed Update

### 6.1 Create Migration Script
**File: `server/src/db/migrate_auth.sql`:**
```sql
-- Add password_hash to existing users (temporary default password)
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '$2a$10$placeholder' AFTER email;

-- Add role column
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user' AFTER avatar_color;

-- Set first user as admin
UPDATE users SET role = 'admin' WHERE id = 1;

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id)
);

-- Create invitations table
CREATE TABLE IF NOT EXISTS board_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  board_id INT NOT NULL,
  invited_by INT NOT NULL,
  invited_email VARCHAR(150) NOT NULL,
  invited_user_id INT NULL,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_pending_invitation (board_id, invited_email, status)
);
```

### 6.2 Update Seed Data
**Update `server/src/db/seed.sql`:**
```sql
-- Update users with password hashes (use bcrypt to generate these)
-- For development, you can use: password123
UPDATE users SET password_hash = '$2a$10$YourGeneratedHashHere' WHERE id = 1;

-- Or recreate users with passwords
DELETE FROM users;
INSERT INTO users (name, email, initials, password_hash, avatar_color, role) VALUES
  ('Rajvil Choudhary', 'rajvil@taskflow.com', 'RC', '$2a$10$YourHashForPassword123', '#7C5CBF', 'admin'),
  ('Alice Johnson',    'alice@taskflow.com',   'AJ', '$2a$10$YourHashForPassword123', '#4BCE97', 'user');
```

### 6.3 Run Migration
```bash
cd server
mysql -u root -p taskflow < src/db/migrate_auth.sql
```

---

## Phase 7: Testing & Deployment

### 7.1 Test Authentication Flow
1. Register a new user
2. Login with the new user
3. Verify token is stored
4. Logout and verify token is cleared
5. Try accessing protected routes without token (should fail)

### 7.2 Test Board Access Control
1. Create a board as User A
2. Login as User B
3. Verify User B cannot see User A's board
4. Share board with User B
5. Verify User B can now access the board

### 7.3 Test Admin Features
1. Login as admin user
2. Access admin dashboard
3. View all users
4. Change a user's role
5. Verify role change takes effect

### 7.4 Update Environment Variables
**Add to production `.env`:**
```
JWT_SECRET=your-production-secret-key-min-32-chars
```

### 7.5 Deploy Changes
1. Commit all changes
2. Push to GitHub
3. Vercel will auto-deploy frontend
4. Render will auto-deploy backend (or trigger manual deploy)
5. Run database migration on production database

### 7.6 Post-Deployment Checklist
- [ ] Update JWT_SECRET in production
- [ ] Run migration on production database
- [ ] Test login/register on production
- [ ] Test board access control
- [ ] Test admin dashboard
- [ ] Verify all existing users can still access their boards
- [ ] Set first user as admin if not already

---

## Phase 8: Optional Enhancements

### 8.1 Email Notifications
- Send email when user is invited to a board
- Use services like SendGrid, Mailgun, or AWS SES

### 8.2 Password Reset
- Implement forgot password flow
- Send password reset links via email

### 8.3 OAuth Integration
- Add Google/GitHub OAuth login
- Use passport.js or similar

### 8.4 Two-Factor Authentication
- Add TOTP-based 2FA
- Use libraries like speakeasy

### 8.5 Session Management
- Implement refresh tokens
- Add session expiration
- Multiple device support

---

## Summary

This implementation plan adds:
- ✅ User authentication (register/login/logout)
- ✅ JWT-based token authentication
- ✅ Board access control (users only see their boards)
- ✅ Board sharing via email invitations
- ✅ Admin dashboard for user management
- ✅ Role-based access control (admin/user)
- ✅ Protected API routes
- ✅ Database migrations

The implementation is broken into 8 phases for systematic development and testing.
