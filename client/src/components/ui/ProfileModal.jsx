import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, uploadAvatar } from '../../api';
import './ProfileModal.css';

// Preset emoji avatars with animal themes
const PRESET_AVATARS = [
  { id: 'raccoon',   emoji: '🦝', label: 'Raccoon'   },
  { id: 'fox',       emoji: '🦊', label: 'Fox'        },
  { id: 'wolf',      emoji: '🐺', label: 'Wolf'       },
  { id: 'bear',      emoji: '🐻', label: 'Bear'       },
  { id: 'panda',     emoji: '🐼', label: 'Panda'      },
  { id: 'lion',      emoji: '🦁', label: 'Lion'       },
  { id: 'tiger',     emoji: '🐯', label: 'Tiger'      },
  { id: 'cat',       emoji: '🐱', label: 'Cat'        },
  { id: 'dog',       emoji: '🐶', label: 'Dog'        },
  { id: 'owl',       emoji: '🦉', label: 'Owl'        },
  { id: 'penguin',   emoji: '🐧', label: 'Penguin'    },
  { id: 'frog',      emoji: '🐸', label: 'Frog'       },
  { id: 'dragon',    emoji: '🐲', label: 'Dragon'     },
  { id: 'unicorn',   emoji: '🦄', label: 'Unicorn'    },
  { id: 'shark',     emoji: '🦈', label: 'Shark'      },
  { id: 'octopus',   emoji: '🐙', label: 'Octopus'    },
  { id: 'robot',     emoji: '🤖', label: 'Robot'      },
  { id: 'alien',     emoji: '👾', label: 'Alien'      },
  { id: 'wizard',    emoji: '🧙', label: 'Wizard'     },
  { id: 'ninja',     emoji: '🥷', label: 'Ninja'      },
];

const AVATAR_COLORS = [
  '#7C3AED','#2563EB','#059669','#DC2626','#D97706',
  '#7C5CBF','#4BCE97','#F5CD47','#F87168','#579DFF',
  '#E879F9','#06B6D4','#84CC16','#F97316','#EC4899',
];

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const fileRef = useRef(null);
  const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';

  const [name, setName]               = useState(user?.name || '');
  const [selectedColor, setColor]     = useState(user?.avatar_color || '#7C5CBF');
  const [selectedAvatar, setAvatar]   = useState(user?.avatar_url || null);
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [uploadedFile, setFile]       = useState(null);
  const [tab, setTab]                 = useState('emoji'); // 'emoji' | 'upload'
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const isEmojiAvatar = selectedAvatar && !selectedAvatar.startsWith('/uploads');
  const displayAvatar = previewUrl || (selectedAvatar && !isEmojiAvatar ? `${BASE_URL}${selectedAvatar}` : null);
  const displayEmoji  = isEmojiAvatar ? selectedAvatar : null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAvatar(null);
    setTab('upload');
  };

  const handleEmojiSelect = (emoji) => {
    setAvatar(emoji);
    setPreviewUrl(null);
    setFile(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      let finalUser;

      if (uploadedFile) {
        const res = await uploadAvatar(uploadedFile);
        finalUser = res.data.user;
      } else {
        const payload = {
          name,
          avatar_color: selectedColor,
          avatar_url: selectedAvatar && !selectedAvatar.startsWith('/uploads') ? selectedAvatar : selectedAvatar,
        };
        const res = await updateProfile(payload);
        finalUser = res.data.user;
      }

      // Also update name and color if file upload was done
      if (uploadedFile && (name !== user.name || selectedColor !== user.avatar_color)) {
        const res2 = await updateProfile({ name, avatar_color: selectedColor });
        finalUser = { ...finalUser, ...res2.data.user };
      }

      updateUser(finalUser);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal">
        <div className="pm-header">
          <h2>Edit Profile</h2>
          <button className="pm-close" onClick={onClose}>✕</button>
        </div>

        {/* Avatar Preview */}
        <div className="pm-avatar-preview-row">
          <div 
            className="pm-avatar-preview"
            style={{ background: displayAvatar ? 'transparent' : selectedColor }}
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt="avatar" />
            ) : displayEmoji ? (
              <span className="pm-emoji-large">{displayEmoji}</span>
            ) : (
              <span className="pm-initials-large">
                {name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || '?'}
              </span>
            )}
          </div>
          <div className="pm-avatar-meta">
            <p className="pm-avatar-name">{name || 'Your Name'}</p>
            <p className="pm-avatar-email">{user?.email}</p>
          </div>
        </div>

        {/* Name */}
        <div className="pm-field">
          <label>Display Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Your full name"
          />
        </div>

        {/* Tabs */}
        <div className="pm-tabs">
          <button 
            className={`pm-tab ${tab === 'emoji' ? 'active' : ''}`} 
            onClick={() => setTab('emoji')}
          >
            Animal Avatars
          </button>
          <button 
            className={`pm-tab ${tab === 'upload' ? 'active' : ''}`} 
            onClick={() => setTab('upload')}
          >
            Upload Photo
          </button>
          <button 
            className={`pm-tab ${tab === 'color' ? 'active' : ''}`} 
            onClick={() => setTab('color')}
          >
            Color
          </button>
        </div>

        {/* Emoji picker */}
        {tab === 'emoji' && (
          <div className="pm-emoji-grid">
            {PRESET_AVATARS.map(a => (
              <button
                key={a.id}
                className={`pm-emoji-btn ${selectedAvatar === a.emoji ? 'selected' : ''}`}
                onClick={() => handleEmojiSelect(a.emoji)}
                title={a.label}
              >
                <span>{a.emoji}</span>
                <span className="pm-emoji-label">{a.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Upload photo */}
        {tab === 'upload' && (
          <div className="pm-upload-area">
            <input 
              ref={fileRef}
              type="file" 
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <div className="pm-upload-preview">
                <img src={previewUrl} alt="preview" />
                <button className="pm-remove-photo" onClick={() => { setPreviewUrl(null); setFile(null); }}>
                  Remove
                </button>
              </div>
            ) : (
              <button className="pm-upload-btn" onClick={() => fileRef.current.click()}>
                <span style={{ fontSize: '32px' }}>📷</span>
                <span>Click to upload photo</span>
                <span style={{ fontSize: '11px', opacity: 0.6 }}>JPG, PNG, WebP up to 5MB</span>
              </button>
            )}
          </div>
        )}

        {/* Color picker */}
        {tab === 'color' && (
          <div className="pm-color-grid">
            {AVATAR_COLORS.map(c => (
              <button
                key={c}
                className={`pm-color-btn ${selectedColor === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
        )}

        {error && <div className="pm-error">{error}</div>}

        <div className="pm-actions">
          <button className="pm-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="pm-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
