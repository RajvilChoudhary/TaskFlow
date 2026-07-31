import React from 'react';
import UserAvatar from './UserAvatar';
import './FilterBar.css';

export default function FilterBar({ labels, members, filterState, onChange, onClose }) {
  const toggleLabel = (id) => {
    const ids = filterState.label_ids.includes(id)
      ? filterState.label_ids.filter(l => l !== id)
      : [...filterState.label_ids, id];
    onChange({ ...filterState, label_ids: ids });
  };

  const toggleMember = (id) => {
    const ids = filterState.member_ids.includes(id)
      ? filterState.member_ids.filter(m => m !== id)
      : [...filterState.member_ids, id];
    onChange({ ...filterState, member_ids: ids });
  };

  const hasFilter = filterState.label_ids.length || filterState.member_ids.length || filterState.due;

  return (
    <div className="filter-bar">
      <div className="filter-bar-inner">
        {/* Labels */}
        <div className="filter-group">
          <span className="filter-group-label">Labels</span>
          <div className="filter-chips">
            {labels.map(l => (
              <button
                key={l.id}
                className={`filter-chip label-chip lg ${filterState.label_ids.includes(l.id) ? 'selected' : ''}`}
                style={{ background: l.color, opacity: filterState.label_ids.includes(l.id) ? 1 : 0.5 }}
                onClick={() => toggleLabel(l.id)}
                title={l.name}
              />
            ))}
          </div>
        </div>

        {/* Members */}
        <div className="filter-group">
          <span className="filter-group-label">Members</span>
          <div className="filter-chips">
            {members.map(m => (
              <button
                key={m.id}
                className={`avatar avatar-sm filter-member ${filterState.member_ids.includes(m.id) ? 'selected' : ''}`}
                style={{ opacity: filterState.member_ids.includes(m.id) ? 1 : 0.55, padding: 0, border: 'none', cursor: 'pointer' }}
                onClick={() => toggleMember(m.id)}
                title={m.name}
              >
                <UserAvatar user={m} size="sm" style={{ pointerEvents: 'none' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div className="filter-group">
          <span className="filter-group-label">Due date</span>
          <div className="filter-chips">
            {[['overdue','Overdue'],['upcoming','Due soon'],['noduedate','No date']].map(([val, label]) => (
              <button
                key={val}
                className={`btn btn-sm ${filterState.due === val ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onChange({ ...filterState, due: filterState.due === val ? '' : val })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {hasFilter && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onChange({ label_ids: [], member_ids: [], due: '' })}
          >
            ✕ Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
