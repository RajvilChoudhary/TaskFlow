const pool = require('../config/db');

/**
 * Send board invitation
 */
const sendInvitation = async (req, res) => {
  const { board_id, email } = req.body;
  const userId = req.user.id;

  try {
    // Verify user owns the board
    const [boards] = await pool.execute(
      'SELECT * FROM boards WHERE id = ? AND created_by = ?',
      [board_id, userId]
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
      [board_id, userId, email, invited_user_id]
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
    console.error('Send invitation error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user's invitations
 */
const getInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    const [invitations] = await pool.execute(`
      SELECT i.*, b.title as board_title, u.name as inviter_name
      FROM board_invitations i
      JOIN boards b ON i.board_id = b.id
      JOIN users u ON i.invited_by = u.id
      WHERE i.invited_email = ? OR i.invited_user_id = ?
      ORDER BY i.created_at DESC
    `, [userEmail, userId]);

    res.json(invitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Accept invitation
 */
const acceptInvitation = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const invitationId = req.params.id;

    const [invitations] = await pool.execute(
      'SELECT * FROM board_invitations WHERE id = ? AND (invited_email = ? OR invited_user_id = ?)',
      [invitationId, userEmail, userId]
    );

    if (invitations.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = invitations[0];

    // Add as board member
    await pool.execute(
      'INSERT IGNORE INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)',
      [invitation.board_id, userId, 'member']
    );

    // Update invitation status
    await pool.execute(
      'UPDATE board_invitations SET status = ?, invited_user_id = ? WHERE id = ?',
      ['accepted', userId, invitationId]
    );

    res.json({ message: 'Invitation accepted' });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Decline invitation
 */
const declineInvitation = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const invitationId = req.params.id;

    await pool.execute(
      'UPDATE board_invitations SET status = ? WHERE id = ? AND (invited_email = ? OR invited_user_id = ?)',
      ['declined', invitationId, userEmail, userId]
    );

    res.json({ message: 'Invitation declined' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { sendInvitation, getInvitations, acceptInvitation, declineInvitation };
