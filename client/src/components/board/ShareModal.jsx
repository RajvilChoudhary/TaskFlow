import React, { useState, useEffect } from 'react';
import { sendInvitation, getBoardMembers } from '../../api';
import { useAuth } from '../../context/AuthContext';
import './ShareModal.css';

export default function ShareModal({ boardId, onClose }) {
  const { user } = useAuth();
  const [email, setEmail]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [message, setMessage]         = useState('');
  const [messageType, setMessageType] = useState('');
  const [members, setMembers]         = useState([]);

  useEffect(() => {
    getBoardMembers(boardId)
      .then(res => setMembers(res.data || []))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }, [boardId]);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setMessage('');

    try {
      const res = await sendInvitation({ board_id: boardId, email });
      setMessage(res.data.message || 'Invitation sent!');
      setMessageType('success');
      setEmail('');
      // Refresh members list
      const mem = await getBoardMembers(boardId);
      setMembers(mem.data || []);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to send invitation');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="share-header">
          <div className="share-header-title">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
            </svg>
            Share Board
          </div>
          <button className="share-close-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        {/* Invite by email */}
        <div className="share-body">
          <p className="share-section-label">Invite people</p>
          <form onSubmit={handleShare} className="share-invite-form">
            <input
              type="email"
              className="share-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address..."
              required
              autoFocus
            />
            <button type="submit" className="share-send-btn" disabled={loading}>
              {loading ? (
                <svg className="share-spinner" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="14"/>
                </svg>
              ) : 'Invite'}
            </button>
          </form>

          {message && (
            <div className={`share-message share-message-${messageType}`}>
              {messageType === 'success' ? '✓' : '✕'} {message}
            </div>
          )}

          {/* Members list */}
          <div className="share-members-section">
            <p className="share-section-label">Board members</p>
            {membersLoading ? (
              <div className="share-members-loading">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="share-members-empty">No members yet</div>
            ) : (
              <ul className="share-members-list">
                {members.map(m => (
                  <li key={m.id} className="share-member-item">
                    <div className="share-member-avatar" style={{ background: m.avatar_color || '#7C5CBF' }}>
                      {m.initials}
                    </div>
                    <div className="share-member-info">
                      <span className="share-member-name">{m.name}</span>
                      <span className="share-member-email">{m.email}</span>
                    </div>
                    <span className={`share-member-role share-member-role-${m.role}`}>
                      {m.role === 'admin' ? '👑 Admin' : 'Member'}
                    </span>
                    {m.id === user?.id && (
                      <span className="share-member-you">You</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Copy link placeholder */}
          <div className="share-link-row">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/>
              <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/>
            </svg>
            <span>Board access is restricted to invited members only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
