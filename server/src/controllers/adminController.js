const pool = require('../config/db');

/**
 * Get all users (admin only)
 */
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
    console.error('Get all users error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update user role (admin only)
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await pool.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );

    res.json({ message: 'User role updated' });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user statistics (admin only)
 */
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
    console.error('Get user stats error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllUsers, updateUserRole, getUserStats };
