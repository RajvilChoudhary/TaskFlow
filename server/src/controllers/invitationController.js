const pool = require('../config/db');

/**
 * Send board invitation
 */
const sendInvitation = async (req, res) => {
  const { board_id, email } = req.body;
  const userId = req.user.id;

  try {
    // Verify user owns the board OR is an admin member
    const [boards] = await pool.execute(
      `SELECT * FROM boards WHERE id = ? AND (
        created_by = ? OR id IN (SELECT board_id FROM board_members WHERE user_id = ? AND role = 'admin')
      )`,
      [board_id, userId, userId]
    );

    if (boards.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to invite to this board' });
    }

    // Check if user exists with this email
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    const invited_user_id = users.length > 0 ? users[0].id : null;

    // Check if they are already a member
    if (invited_user_id) {
      const [existing] = await pool.execute(
        'SELECT id FROM board_members WHERE board_id = ? AND user_id = ?',
        [board_id, invited_user_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'User is already a member of this board' });
      }
    }

    // Check for existing pending invitation
    const [existingInv] = await pool.execute(
      "SELECT id FROM board_invitations WHERE board_id = ? AND invited_email = ? AND status = 'pending'",
      [board_id, email]
    );
    if (existingInv.length > 0) {
      return res.status(400).json({ error: 'A pending invitation already exists for this email' });
    }

    // Create invitation — DO NOT add to board_members yet (only on accept)
    const [result] = await pool.execute(
      'INSERT INTO board_invitations (board_id, invited_by, invited_email, invited_user_id) VALUES (?, ?, ?, ?)',
      [board_id, userId, email, invited_user_id]
    );

    res.json({
      invitation: { id: result.insertId, board_id, invited_email: email, invited_user_id },
      message: 'Invitation sent. Board will be accessible after the user accepts.'
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
 * Accept invitation — now adds user to board_members for the first time
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

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation already ${invitation.status}` });
    }

    // Now add as board member (this is the ONLY place this should happen)
    await pool.execute(
      'INSERT IGNORE INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)',
      [invitation.board_id, userId, 'member']
    );

    // Update invitation status
    await pool.execute(
      'UPDATE board_invitations SET status = ?, invited_user_id = ? WHERE id = ?',
      ['accepted', userId, invitationId]
    );

    // Get invitee's name for notification
    const [[invitee]] = await pool.execute('SELECT name FROM users WHERE id = ?', [userId]);
    const [[board]] = await pool.execute('SELECT title FROM boards WHERE id = ?', [invitation.board_id]);

    // Notify the sender
    try {
      await pool.execute(
        'INSERT INTO notifications (user_id, type, data) VALUES (?, ?, ?)',
        [
          invitation.invited_by,
          'invitation_accepted',
          JSON.stringify({
            invitee_name: invitee?.name || 'Someone',
            board_title: board?.title || 'a board',
            board_id: invitation.board_id
          })
        ]
      );
    } catch (notifErr) {
      console.warn('Notification insert failed (table may not exist yet):', notifErr.message);
    }

    res.json({ message: 'Invitation accepted', board_id: invitation.board_id });
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

    const [invitations] = await pool.execute(
      'SELECT * FROM board_invitations WHERE id = ? AND (invited_email = ? OR invited_user_id = ?)',
      [invitationId, userEmail, userId]
    );

    if (invitations.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = invitations[0];

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation already ${invitation.status}` });
    }

    await pool.execute(
      'UPDATE board_invitations SET status = ? WHERE id = ? AND (invited_email = ? OR invited_user_id = ?)',
      ['declined', invitationId, userEmail, userId]
    );

    // Get invitee's name for notification
    const [[invitee]] = await pool.execute('SELECT name FROM users WHERE id = ?', [userId]);
    const [[board]] = await pool.execute('SELECT title FROM boards WHERE id = ?', [invitation.board_id]);

    // Notify the sender
    try {
      await pool.execute(
        'INSERT INTO notifications (user_id, type, data) VALUES (?, ?, ?)',
        [
          invitation.invited_by,
          'invitation_declined',
          JSON.stringify({
            invitee_name: invitee?.name || 'Someone',
            board_title: board?.title || 'a board',
            board_id: invitation.board_id
          })
        ]
      );
    } catch (notifErr) {
      console.warn('Notification insert failed (table may not exist yet):', notifErr.message);
    }

    res.json({ message: 'Invitation declined' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { sendInvitation, getInvitations, acceptInvitation, declineInvitation };
