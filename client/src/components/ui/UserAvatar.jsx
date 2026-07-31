import React from 'react';
import { config } from '../../config';

/**
 * UserAvatar — renders a user's profile photo, emoji avatar, or initials badge.
 *
 * Props:
 *   user        — { name, initials, avatar_color, avatar_url }
 *   size        — 'sm' | 'md' | 'lg'  (default 'md')
 *   className   — extra CSS class names
 *   style       — extra inline styles
 *   title       — tooltip text (defaults to user.name)
 */
export default function UserAvatar({ user, size = 'md', className = '', style = {}, title }) {
  if (!user) return null;

  const sizeClass = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : '';
  const tooltip   = title !== undefined ? title : user.name;
  const avatarUrl = user.avatar_url;

  /* ── uploaded image (starts with /uploads/) ── */
  if (avatarUrl && avatarUrl.startsWith('/')) {
    return (
      <div
        className={`avatar ${sizeClass} ${className}`}
        title={tooltip}
        style={{
          background: 'transparent',
          overflow: 'hidden',
          padding: 0,
          ...style,
        }}
      >
        <img
          src={`${config.ASSET_URL}${avatarUrl}`}
          alt={user.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
        />
      </div>
    );
  }

  /* ── emoji / preset avatar ── */
  if (avatarUrl && avatarUrl.length <= 8) {
    return (
      <div
        className={`avatar ${sizeClass} ${className}`}
        title={tooltip}
        style={{
          background: user.avatar_color || '#7C5CBF',
          fontSize: size === 'sm' ? '12px' : size === 'lg' ? '22px' : '16px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        {avatarUrl}
      </div>
    );
  }

  /* ── default: initials ── */
  return (
    <div
      className={`avatar ${sizeClass} ${className}`}
      title={tooltip}
      style={{ background: user.avatar_color || '#7C5CBF', ...style }}
    >
      {user.initials || (user.name ? user.name[0].toUpperCase() : '?')}
    </div>
  );
}
