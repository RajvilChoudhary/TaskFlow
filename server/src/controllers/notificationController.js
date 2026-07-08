const pool = require('../config/db');

/**
 * GET /api/notifications — get current user's notifications
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const [notifications] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * PATCH /api/notifications/:id/read — mark notification as read
 */
const markRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * PATCH /api/notifications/read-all — mark all as read
 */
const markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );
    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getNotifications, markRead, markAllRead };
