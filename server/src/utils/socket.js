/**
 * Broadcasts a socket event to a board's room, excluding the sender socket if provided.
 */
const broadcastToBoard = (req, boardId, type, payload) => {
  const io = req.app.get('io');
  if (!io) return;

  const senderSocketId = req.headers['x-socket-id'];
  const room = `board:${boardId}`;

  if (senderSocketId) {
    const senderSocket = io.sockets.sockets.get(senderSocketId);
    if (senderSocket) {
      senderSocket.to(room).emit('board-updated', { type, payload });
      return;
    }
  }

  // Fallback to broadcasting to everyone in the room
  io.to(room).emit('board-updated', { type, payload });
};

module.exports = { broadcastToBoard };
