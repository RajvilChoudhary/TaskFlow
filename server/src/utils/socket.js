/**
 * Broadcasts a socket event to a board's room, excluding the sender socket if provided.
 */
const broadcastToBoard = (req, boardId, type, payload) => {
  const io = req.app.get('io');
  if (!io) return;

  const senderSocketId = req.headers['x-socket-id'];
  const room = `board:${boardId}`;

  if (senderSocketId) {
    // Broadcast to room excluding sender tab
    io.to(room).except(senderSocketId).emit('board-updated', { type, payload });
  } else {
    // Broadcast to everyone in room
    io.to(room).emit('board-updated', { type, payload });
  }
};

/**
 * Broadcast the current list of active users in a board room.
 * Called whenever a user joins or leaves a board.
 */
const broadcastPresence = (io, boardId) => {
  const room = `board:${boardId}`;
  const roomSockets = io.sockets.adapter.rooms.get(room);
  if (!roomSockets) {
    io.to(room).emit('presence-update', { activeUsers: [] });
    return;
  }

  const activeUsers = [];
  for (const socketId of roomSockets) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket && socket.userData) {
      activeUsers.push({ socketId, ...socket.userData });
    }
  }

  io.to(room).emit('presence-update', { boardId, activeUsers });
};

module.exports = { broadcastToBoard, broadcastPresence };
