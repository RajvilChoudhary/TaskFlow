const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const http     = require('http');
const { Server } = require('socket.io');
const pool     = require('./config/db');
require('dotenv').config();

const corsOrigin = process.env.CLIENT_URL || true;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  }
});

app.set('io', io);

// Socket.io Room & Client Handlers
const { broadcastPresence } = require('./utils/socket');

io.on('connection', (socket) => {
  console.log(`🔌 Collaborative user connected: ${socket.id}`);

  // Client sends { boardId, user: { id, name, initials, avatar_color } }
  socket.on('join-board', ({ boardId, user }) => {
    socket.join(`board:${boardId}`);
    socket.boardId = boardId;  // track which board this socket is in
    socket.userData = user || null;
    console.log(`📥 Socket ${socket.id} (${user?.name || 'unknown'}) joined room board:${boardId}`);
    broadcastPresence(io, boardId);
  });

  socket.on('leave-board', (boardId) => {
    socket.leave(`board:${boardId}`);
    console.log(`📤 Socket ${socket.id} left room board:${boardId}`);
    broadcastPresence(io, boardId);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Collaborative user disconnected: ${socket.id}`);
    // Broadcast updated presence if they were in a board room
    if (socket.boardId) {
      broadcastPresence(io, socket.boardId);
    }
  });
});

// Middleware
app.use(cors({ origin: corsOrigin, credentials: true })); // origin: true allows any requesting origin
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/invitations',     require('./routes/invitations'));
app.use('/api/admin',           require('./routes/admin'));
app.use('/api/boards',          require('./routes/boards'));
app.use('/api/lists',           require('./routes/lists'));
app.use('/api/cards',           require('./routes/cards'));
app.use('/api/labels',          require('./routes/labels'));
app.use('/api/checklists',      require('./routes/checklists'));
app.use('/api/checklist-items', require('./routes/checklistItems'));
app.use('/api/comments',        require('./routes/comments'));
app.use('/api/attachments',     require('./routes/attachments'));
app.use('/api/members',         require('./routes/members'));
app.use('/api/search',          require('./routes/search'));
app.use('/api/notifications',   require('./routes/notifications'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({ status: 'ok', db: 'connected', time: new Date() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// PRODUCTION: Serve static frontend
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Handle SPA routing for Express 5
  app.get(/^(?!\/(api|uploads)).*$/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
});
