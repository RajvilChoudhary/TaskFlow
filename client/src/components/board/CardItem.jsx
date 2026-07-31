import React from 'react';
import dayjs from 'dayjs';
import UserAvatar from '../ui/UserAvatar';
import './CardItem.css';

export default function CardItem({ card, labelMap, memberMap, onClick, onToggleComplete }) {
  const labels    = (card.label_ids || []).map(id => labelMap[id]).filter(Boolean);
  const memberIds = card.member_ids || [];

  const dueDate   = card.due_date ? dayjs(card.due_date) : null;
  const now       = dayjs();
  const isOverdue  = dueDate && dueDate.isBefore(now) && !card.completed;
  const isUpcoming = dueDate && dueDate.isAfter(now) && dueDate.diff(now, 'day') <= 3;
  const hasCover   = card.cover_color || card.cover_image;

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    if (onToggleComplete) onToggleComplete(card.id, !card.completed);
  };

  return (
    <div
      className={`card-item ${card.completed ? 'card-completed' : ''}`}
      onClick={onClick}
      id={`card-${card.id}`}
    >
      {/* Cover */}
      {hasCover && (
        <div
          className="card-cover"
          style={{
            background: card.cover_image
              ? `url(${config.ASSET_URL}${card.cover_image}) center/cover`
              : card.cover_color,
          }}
        />
      )}

      <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        {/* Complete checkbox on the left */}
        <button
          className={`card-complete-btn ${card.completed ? 'is-complete' : ''}`}
          onClick={handleCheckboxClick}
          title={card.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            {card.completed
              ? <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
              : <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            }
          </svg>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Labels */}
          {labels.length > 0 && (
            <div className="card-labels">
              {labels.map(label => (
                <span
                  key={label.id}
                  className="label-chip"
                  style={{ background: label.color }}
                  title={label.name}
                />
              ))}
            </div>
          )}

          {/* Title */}
          <p className={`card-title ${card.completed ? 'card-title-done' : ''}`}>{card.title}</p>

          {/* Badges row */}
          <div className="card-badges">
            {dueDate && (
              <span className={`due-badge ${isOverdue ? 'overdue' : isUpcoming ? 'upcoming' : ''} ${card.completed ? 'done' : ''}`}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zM.5 1h15a.5.5 0 0 1 .5.5V2a.5.5 0 0 1-.5.5H.5A.5.5 0 0 1 0 2v-.5A.5.5 0 0 1 .5 1zm0 3h15v10.5a.5.5 0 0 1-.5.5H1a.5.5 0 0 1-.5-.5V4h.5z"/>
                </svg>
                {dueDate.format('MMM D')}
              </span>
            )}
            {card.checklist_total > 0 && (
              <span className={`badge ${card.checklist_done === card.checklist_total ? 'badge-done' : ''}`}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 3a.5.5 0 0 1 0 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4H1.5a.5.5 0 0 1 0-1h13zm-1.5 1H3v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4zm-6.5 2a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 .5-.5zm3 0a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 .5-.5z"/></svg>
                {card.checklist_done}/{card.checklist_total}
              </span>
            )}
            {card.comment_count > 0 && (
              <span className="badge">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894z"/></svg>
                {card.comment_count}
              </span>
            )}
            {card.attachment_count > 0 && (
              <span className="badge">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z"/></svg>
                {card.attachment_count}
              </span>
            )}
            {memberIds.length > 0 && (
              <div className="card-members">
                {memberIds.slice(0, 3).map(mid => {
                  const m = memberMap[mid];
                  if (!m) return null;
                  return <UserAvatar key={mid} user={m} size="sm" title={m.name} />;
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
