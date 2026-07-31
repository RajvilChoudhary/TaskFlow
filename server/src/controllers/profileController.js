const pool  = require('../config/db');
const path  = require('path');
const fs    = require('fs');

/**
 * Run a one-time migration to add avatar_url if it doesn't exist
 */
const ensureAvatarColumn = async () => {
  try {
    await pool.execute(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL`
    );
  } catch (_) { /* column already exists */ }
};
ensureAvatarColumn();

/**
 * Update current user's profile: name, avatar_color, avatar_url (preset emoji avatar or uploaded photo)
 * PATCH /api/profile
 * Body: { name?, avatar_color?, avatar_url? }
 */
const updateProfile = async (req, res) => {
  try {
    const { name, avatar_color, avatar_url } = req.body;
    const userId = req.user.id;

    const fields = [];
    const values = [];

    if (name) {
      const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      fields.push('name = ?', 'initials = ?');
      values.push(name.trim(), initials);
    }
    if (avatar_color) { fields.push('avatar_color = ?'); values.push(avatar_color); }
    if (avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(avatar_url || null); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    values.push(userId);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.execute(
      'SELECT id, name, email, initials, avatar_color, avatar_url, role FROM users WHERE id = ?',
      [userId]
    );

    res.json({ user: rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Upload a custom profile photo
 * POST /api/profile/photo
 * multipart/form-data with field "photo"
 */
const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const userId = req.user.id;
    const fileUrl = `/uploads/avatars/${req.file.filename}`;

    await pool.execute(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [fileUrl, userId]
    );

    const [rows] = await pool.execute(
      'SELECT id, name, email, initials, avatar_color, avatar_url, role FROM users WHERE id = ?',
      [userId]
    );

    res.json({ user: rows[0], avatar_url: fileUrl });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { updateProfile, uploadPhoto };
