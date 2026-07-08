import React, { useState, useEffect, useRef } from 'react';
import { getInvitations, acceptInvitation, declineInvitation, getNotifications, markAllNotificationsRead } from '../../api';
import './InvitationInbox.css';

export default function InvitationInbox() {
  const [open, setOpen]               = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab]     = useState('invitations'); // 'invitations' | 'notifications'
  const ref = useRef(null);

  const pendingCount = invitations.filter(i => i.status === 'pending').length;
  const unreadNotifCount = notifications.filter(n => !n.is_read).length;
  const totalBadge = pendingCount + unreadNotifCount;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [invRes, notifRes] = await Promise.all([
        getInvitations(),
        getNotifications().catch(() => ({ data: [] })) // graceful fallback if table not yet created
      ]);
      setInvitations(invRes.data || []);
      setNotifications(notifRes.data || []);
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(v => !v);
    // When opening notifications tab, mark all as read
    if (!open && unreadNotifCount > 0) {
      markAllNotificationsRead().catch(() => {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    }
  };

  const handleAccept = async (id) => {
    setActionLoading(id);
    try {
      await acceptInvitation(id);
      setInvitations(prev =>
        prev.map(inv => inv.id === id ? { ...inv, status: 'accepted' } : inv)
      );
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id) => {
    setActionLoading(id);
    try {
      await declineInvitation(id);
      setInvitations(prev =>
        prev.map(inv => inv.id === id ? { ...inv, status: 'declined' } : inv)
      );
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to decline invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  const renderNotificationContent = (notif) => {
    let data = {};
    try { data = JSON.parse(notif.data); } catch (e) {}
    if (notif.type === 'invitation_accepted') {
      return (
        <div className="inv-item-notif-content">
          <div className="inv-item-notif-icon accepted">✓</div>
          <div>
            <p className="inv-item-text">
              <strong>{data.invitee_name}</strong> accepted your invitation to{' '}
              <span className="inv-board-name">"{data.board_title}"</span>
            </p>
            <span className="inv-item-time">{formatDate(notif.created_at)}</span>
          </div>
        </div>
      );
    }
    if (notif.type === 'invitation_declined') {
      return (
        <div className="inv-item-notif-content">
          <div className="inv-item-notif-icon declined">✕</div>
          <div>
            <p className="inv-item-text">
              <strong>{data.invitee_name}</strong> declined your invitation to{' '}
              <span className="inv-board-name">"{data.board_title}"</span>
            </p>
            <span className="inv-item-time">{formatDate(notif.created_at)}</span>
          </div>
        </div>
      );
    }
    return <p className="inv-item-text">New notification</p>;
  };

  return (
    <div className="inv-inbox-wrapper" ref={ref}>
      {/* Bell button */}
      <button
        className={`inv-bell-btn ${totalBadge > 0 ? 'has-pending' : ''}`}
        onClick={handleOpen}
        aria-label="Notifications"
        title="Notifications & Invitations"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
        </svg>
        {totalBadge > 0 && (
          <span className="inv-badge">{totalBadge > 9 ? '9+' : totalBadge}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="inv-dropdown">
          <div className="inv-dropdown-header">
            <span>Activity</span>
            {loading && <span className="inv-loading-dot">•••</span>}
          </div>

          {/* Tabs */}
          <div className="inv-tabs">
            <button
              className={`inv-tab ${activeTab === 'invitations' ? 'active' : ''}`}
              onClick={() => setActiveTab('invitations')}
            >
              Invitations
              {pendingCount > 0 && <span className="inv-tab-badge">{pendingCount}</span>}
            </button>
            <button
              className={`inv-tab ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('notifications');
                markAllNotificationsRead().catch(() => {});
                setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
              }}
            >
              Notifications
              {unreadNotifCount > 0 && <span className="inv-tab-badge">{unreadNotifCount}</span>}
            </button>
          </div>

          {/* Invitations tab */}
          {activeTab === 'invitations' && (
            invitations.length === 0 ? (
              <div className="inv-empty">
                <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" opacity="0.3">
                  <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
                </svg>
                <p>No invitations yet</p>
              </div>
            ) : (
              <ul className="inv-list">
                {invitations.map(inv => (
                  <li key={inv.id} className={`inv-item inv-item-${inv.status}`}>
                    <div className="inv-item-icon">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M0 1.5A1.5 1.5 0 0 1 1.5 0h13A1.5 1.5 0 0 1 16 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13zm1.5-.5a.5.5 0 0 0-.5.5v1h14v-1a.5.5 0 0 0-.5-.5h-13zM16 3H0v11.5a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V3z"/>
                      </svg>
                    </div>
                    <div className="inv-item-content">
                      <p className="inv-item-text">
                        <strong>{inv.inviter_name}</strong> invited you to
                        <span className="inv-board-name"> "{inv.board_title}"</span>
                      </p>
                      <span className="inv-item-time">{formatDate(inv.created_at)}</span>

                      {inv.status === 'pending' && (
                        <div className="inv-item-actions">
                          <button
                            className="inv-btn inv-btn-accept"
                            onClick={() => handleAccept(inv.id)}
                            disabled={actionLoading === inv.id}
                          >
                            {actionLoading === inv.id ? '...' : 'Accept'}
                          </button>
                          <button
                            className="inv-btn inv-btn-decline"
                            onClick={() => handleDecline(inv.id)}
                            disabled={actionLoading === inv.id}
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {inv.status === 'accepted' && (
                        <span className="inv-status inv-status-accepted">✓ Joined</span>
                      )}
                      {inv.status === 'declined' && (
                        <span className="inv-status inv-status-declined">✕ Declined</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* Notifications tab */}
          {activeTab === 'notifications' && (
            notifications.length === 0 ? (
              <div className="inv-empty">
                <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" opacity="0.3">
                  <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>
                </svg>
                <p>No notifications yet</p>
                <span style={{ fontSize: '11px', opacity: 0.6 }}>You'll be notified when people respond to your invitations</span>
              </div>
            ) : (
              <ul className="inv-list">
                {notifications.map(notif => (
                  <li key={notif.id} className={`inv-item ${!notif.is_read ? 'inv-item-unread' : ''}`}>
                    {renderNotificationContent(notif)}
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      )}
    </div>
  );
}
