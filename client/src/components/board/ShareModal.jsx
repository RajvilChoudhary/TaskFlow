import React, { useState } from 'react';
import { sendInvitation } from '../../api';
import './ShareModal.css';

export default function ShareModal({ boardId, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const handleShare = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await sendInvitation({ board_id: boardId, email });
      setMessage('Invitation sent successfully!');
      setMessageType('success');
      setEmail('');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to send invitation');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Board</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleShare} className="share-form">
          <div className="form-group">
            <label htmlFor="email">Invite by email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          
          <button type="submit" className="share-button" disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
        
        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
