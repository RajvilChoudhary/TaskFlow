import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import {
  getCard, updateCard, deleteCard,
  addCardLabel, removeCardLabel,
  addCardMember, removeCardMember,
  createChecklist, deleteChecklist, addChecklistItem, updateChecklistItem, deleteChecklistItem,
  getComments, addComment, deleteComment,
  uploadAttachment, deleteAttachment,
  createBoardLabel, updateLabel, deleteLabel,
  getActivity
} from '../../api';
import { config } from '../../config';
import './CardModal.css';

const LABEL_COLORS = [
  '#4BCE97','#F5CD47','#FAA53D','#F87168','#9F8FEF',
  '#579DFF','#6CC3E0','#94C748','#E774BB','#8C9BAB',
];

export default function CardModal({ card: initialCard, labels: boardLabels, boardMembers, onClose, onCardUpdated, onCardDeleted, onLabelsChanged, refreshTrigger }) {
  const [card, setCard]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [labels, setLabels]         = useState(boardLabels);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal]         = useState('');
  const [editingDesc, setEditingDesc]   = useState(false);
  const [descVal, setDescVal]           = useState('');

  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showAddChecklist, setShowAddChecklist] = useState(false);

  const [newChecklistTitle, setNewChecklistTitle] = useState('Checklist');
  const [newItemTexts, setNewItemTexts] = useState({});
  const [newComment, setNewComment]     = useState('');
  const [dueDateVal, setDueDateVal]     = useState('');

  const [editingLabelId, setEditingLabelId] = useState(null);
  const [editingLabelName, setEditingLabelName] = useState('');
  const [editingLabelColor, setEditingLabelColor] = useState('');

  const fileRef = useRef(null);

  useEffect(() => {
    fetchCard();
  }, [initialCard.id, refreshTrigger]);

  const fetchCard = async () => {
    try {
      const res = await getCard(initialCard.id);
      setCard(res.data);
      setTitleVal(res.data.title);
      setDescVal(res.data.description || '');
      setDueDateVal(res.data.due_date ? dayjs(res.data.due_date).format('YYYY-MM-DDTHH:mm') : '');
    } finally { setLoading(false); }
  };

  const refreshCard = async () => {
    const res = await getCard(initialCard.id);
    setCard(res.data);
    onCardUpdated(res.data);
  };

  // --- TITLE ---
  const handleTitleSave = async () => {
    if (!titleVal.trim()) { setTitleVal(card.title); setEditingTitle(false); return; }
    await updateCard(card.id, { title: titleVal });
    await refreshCard();
    setEditingTitle(false);
  };

  // --- DESCRIPTION ---
  const handleDescSave = async () => {
    await updateCard(card.id, { description: descVal });
    await refreshCard();
    setEditingDesc(false);
  };

  // --- LABELS ---
  const toggleLabel = async (labelId) => {
    const has = card.labels.some(l => l.id === labelId);
    if (has) await removeCardLabel(card.id, labelId);
    else await addCardLabel(card.id, labelId);
    await refreshCard();
  };

  const handleCreateLabel = async () => {
    const color = LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)];
    const res = await createBoardLabel(card.board_id, { name: '', color });
    const newLabels = [...labels, res.data];
    setLabels(newLabels);
    onLabelsChanged(newLabels);
    setEditingLabelId(res.data.id);
    setEditingLabelName('');
    setEditingLabelColor(res.data.color);
  };

  const handleSaveLabel = async (labelId) => {
    const res = await updateLabel(labelId, { name: editingLabelName, color: editingLabelColor });
    const newLabels = labels.map(l => l.id === labelId ? res.data : l);
    setLabels(newLabels);
    onLabelsChanged(newLabels);
    setEditingLabelId(null);
    await refreshCard();
  };

  const handleDeleteLabel = async (labelId) => {
    await deleteLabel(labelId);
    const newLabels = labels.filter(l => l.id !== labelId);
    setLabels(newLabels);
    onLabelsChanged(newLabels);
    setEditingLabelId(null);
    await refreshCard();
  };

  // --- MEMBERS ---
  const toggleMember = async (userId) => {
    const has = card.members.some(m => m.id === userId);
    if (has) await removeCardMember(card.id, userId);
    else await addCardMember(card.id, userId);
    await refreshCard();
  };

  // --- DUE DATE ---
  const handleDueDateSave = async () => {
    await updateCard(card.id, { due_date: dueDateVal || null });
    await refreshCard();
    setShowDatePicker(false);
  };

  // --- CHECKLISTS ---
  const handleAddChecklist = async (e) => {
    e.preventDefault();
    await createChecklist(card.id, { title: newChecklistTitle });
    setNewChecklistTitle('Checklist');
    setShowAddChecklist(false);
    await refreshCard();
  };

  const handleDeleteChecklist = async (clId) => {
    await deleteChecklist(clId);
    await refreshCard();
  };

  const handleAddItem = async (e, clId) => {
    e.preventDefault();
    const text = newItemTexts[clId] || '';
    if (!text.trim()) return;
    await addChecklistItem(clId, { title: text });
    setNewItemTexts(prev => ({ ...prev, [clId]: '' }));
    await refreshCard();
  };

  const handleToggleItem = async (itemId, completed) => {
    // Optimistic update: flip the bit instantly so the tick stays visible
    setCard(prev => ({
      ...prev,
      checklists: prev.checklists.map(cl => ({
        ...cl,
        items: cl.items.map(it =>
          it.id === itemId ? { ...it, completed: completed ? 1 : 0 } : it
        ),
      })),
    }));
    // Sync with server in the background
    try {
      const res = await updateChecklistItem(itemId, { completed: completed ? 1 : 0 });
      // Update the specific item with server data
      setCard(prev => ({
        ...prev,
        checklists: prev.checklists.map(cl => ({
          ...cl,
          items: cl.items.map(it => it.id === itemId ? res.data : it)
        }))
      }));
      // Optional: Inform parent of the change (though lists don't show individual item completion bits, just counts)
      onCardUpdated({ ...card, checklists: card.checklists.map(cl => ({ ...cl, items: cl.items.map(it => it.id === itemId ? res.data : it) })) });
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
      await refreshCard();
    }
  };

  const handleDeleteItem = async (itemId) => {
    await deleteChecklistItem(itemId);
    await refreshCard();
  };

  // --- COMMENTS ---
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment(card.id, { content: newComment });
    setNewComment('');
    await refreshCard();
  };

  const handleDeleteComment = async (commentId) => {
    await deleteComment(commentId);
    await refreshCard();
  };

  // --- COVER ---
  const handleCoverColor = async (color) => {
    await updateCard(card.id, { cover_color: color, cover_image: null });
    await refreshCard();
    setShowCoverPicker(false);
  };
  const handleRemoveCover = async () => {
    await updateCard(card.id, { cover_color: null, cover_image: null });
    await refreshCard();
    setShowCoverPicker(false);
  };

  // --- ATTACHMENTS ---
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    await uploadAttachment(card.id, fd);
    await refreshCard();
  };

  const handleDeleteAttachment = async (attId) => {
    await deleteAttachment(attId);
    await refreshCard();
  };

  // --- ARCHIVE ---
  const handleArchive = async () => {
    if (!window.confirm('Archive this card?')) return;
    try {
      await deleteCard(card.id);
      onCardDeleted(card.id);
    } catch (err) {
      console.error('Failed to archive card:', err);
      alert('Failed to archive card. Please try again.');
    }
  };

  if (loading || !card) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e => e.stopPropagation()}>
        <div className="spinner"></div>
      </div>
    </div>
  );

  const cardLabels  = card.labels  || [];
  const cardMembers = card.members || [];
  const dueDate = card.due_date ? dayjs(card.due_date) : null;
  const isOverdue = dueDate && dueDate.isBefore(dayjs());

  return (
    <div className="modal-overlay" onClick={onClose} id="card-modal-overlay">
      <div className="modal-box card-modal" onClick={e => e.stopPropagation()}>
        {/* Cover */}
        {(card.cover_color || card.cover_image) && (
          <div className="card-modal-cover" style={{
            background: card.cover_image ? `url(${config.ASSET_URL}${card.cover_image}) center/cover` : card.cover_color,
          }}></div>
        )}

        {/* Close */}
        <button className="modal-close-btn icon-btn" onClick={onClose} id="close-card-modal">✕</button>

        <div className="card-modal-body">
          {/* ---- LEFT COLUMN ---- */}
          <div className="card-modal-main">
            {/* TITLE */}
            <div className="cm-section" style={{ paddingLeft: 40 }}>
              <div className="cm-row-icon">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" style={{ marginTop: 3, opacity: 0 }}><rect x="1" y="1" width="14" height="4" rx="1"/></svg>
              </div>
              {editingTitle ? (
                <div style={{ flex: 1 }}>
                  <textarea
                    className="textarea card-title-input"
                    value={titleVal}
                    onChange={e => setTitleVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTitleSave(); } if (e.key === 'Escape') { setTitleVal(card.title); setEditingTitle(false); } }}
                    autoFocus style={{ fontSize: 18, fontWeight: 600, minHeight: 48 }}
                    id="card-title-input"
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleTitleSave}>Save</button>
                    <button className="icon-btn" onClick={() => { setTitleVal(card.title); setEditingTitle(false); }}>✕</button>
                  </div>
                </div>
              ) : (
                <h2 className="card-modal-title" onClick={() => setEditingTitle(true)} id="card-modal-title">{card.title}</h2>
              )}
            </div>

            {/* LABELS ROW */}
            {cardLabels.length > 0 && (
              <div className="cm-meta-row">
                <div className="cm-meta-block">
                  <div className="section-title">Labels</div>
                  <div className="cm-labels-row">
                    {cardLabels.map(l => (
                      <span key={l.id} className="label-chip lg" style={{ background: l.color }} title={l.name} />
                    ))}
                    <button className="cm-add-pill" onClick={() => setShowLabelPicker(true)}>+</button>
                  </div>
                </div>
              </div>
            )}

            {/* MEMBERS ROW */}
            {cardMembers.length > 0 && (
              <div className="cm-meta-row">
                <div className="cm-meta-block">
                  <div className="section-title">Members</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    {cardMembers.map(m => (
                      <div key={m.id} className="avatar" style={{ background: m.avatar_color }} title={m.name}>{m.initials}</div>
                    ))}
                    <button className="cm-add-pill" onClick={() => setShowMemberPicker(true)}>+</button>
                  </div>
                </div>
              </div>
            )}

            {/* DUE DATE */}
            {dueDate && (
              <div className="cm-meta-row">
                <div className="cm-meta-block">
                  <div className="section-title">Due date</div>
                  <span className={`due-badge ${isOverdue ? 'overdue' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setShowDatePicker(true)}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5z"/></svg>
                    {dueDate.format('MMM D, YYYY')} {isOverdue && '(overdue)'}
                  </span>
                </div>
              </div>
            )}

            {/* DESCRIPTION */}
            <div className="cm-section">
              <div className="cm-row-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
              </div>
              <div className="cm-section-content">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <h3 className="cm-section-heading">Description</h3>
                  {!editingDesc && <button className="btn btn-secondary btn-sm" onClick={() => setEditingDesc(true)}>Edit</button>}
                </div>
                {editingDesc ? (
                  <div>
                    <textarea
                      id="card-description"
                      className="textarea"
                      value={descVal}
                      onChange={e => setDescVal(e.target.value)}
                      placeholder="Add a more detailed description…"
                      autoFocus rows={4}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={handleDescSave}>Save</button>
                      <button className="icon-btn" onClick={() => { setDescVal(card.description || ''); setEditingDesc(false); }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <p className="cm-desc-text" onClick={() => setEditingDesc(true)}>
                    {card.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Add a description…</span>}
                  </p>
                )}
              </div>
            </div>

            {/* ATTACHMENTS */}
            {card.attachments?.length > 0 && (
              <div className="cm-section">
                <div className="cm-row-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z"/></svg>
                </div>
                <div className="cm-section-content">
                  <h3 className="cm-section-heading" style={{ marginBottom: 8 }}>Attachments</h3>
                  {card.attachments.map(att => (
                    <div key={att.id} className="attachment-row">
                      <a href={`${config.ASSET_URL}${att.url}`} target="_blank" rel="noopener noreferrer" className="attachment-name">
                        📎 {att.original_name}
                      </a>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteAttachment(att.id)}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CHECKLISTS */}
            {card.checklists?.map(cl => {
              const done  = cl.items.filter(i => i.completed).length;
              const total = cl.items.length;
              const pct   = total ? Math.round((done / total) * 100) : 0;
              return (
                <div key={cl.id} className="cm-section">
                  <div className="cm-row-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 3a.5.5 0 0 1 0 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4H1.5a.5.5 0 0 1 0-1h13zm-1.5 1H3v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4z"/></svg>
                  </div>
                  <div className="cm-section-content">
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 4 }}>
                      <h3 className="cm-section-heading">{cl.title}</h3>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleDeleteChecklist(cl.id)}>Delete</button>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 28 }}>{pct}%</span>
                      <div className="progress-bar-wrap" style={{ flex: 1 }}>
                        <div className={`progress-bar-fill ${pct === 100 ? 'complete' : ''}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                    {cl.items.map(item => (
                      <div key={item.id} className="checklist-item">
                        <input
                          type="checkbox"
                          className="checklist-checkbox"
                          checked={!!item.completed}
                          onChange={e => handleToggleItem(item.id, e.target.checked)}
                          id={`check-${item.id}`}
                        />
                        <label htmlFor={`check-${item.id}`} className={`checklist-item-label ${item.completed ? 'done' : ''}`}>
                          {item.title}
                        </label>
                        <button className="icon-btn checklist-delete" onClick={() => handleDeleteItem(item.id)}>✕</button>
                      </div>
                    ))}
                    {/* Add item inline */}
                    <form className="add-item-form" onSubmit={e => handleAddItem(e, cl.id)}>
                      <input
                        className="input" placeholder="Add an item…"
                        value={newItemTexts[cl.id] || ''}
                        onChange={e => setNewItemTexts(prev => ({ ...prev, [cl.id]: e.target.value }))}
                        id={`add-item-${cl.id}`}
                      />
                      <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 4 }}>Add</button>
                    </form>
                  </div>
                </div>
              );
            })}

            {/* ACTIVITY */}
            <div className="cm-section">
              <div className="cm-row-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-.5.5.5.5 0 0 1-.5-.5v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
              </div>
              <div className="cm-section-content">
                <h3 className="cm-section-heading" style={{ marginBottom: 12 }}>Activity</h3>
                {/* Add comment */}
                <form className="comment-form" onSubmit={handleAddComment}>
                  <div className="avatar" style={{ background: '#7C5CBF', flexShrink: 0 }}>RC</div>
                  <div style={{ flex: 1 }}>
                    <textarea
                      id="add-comment-input"
                      className="textarea"
                      placeholder="Write a comment…"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      rows={2}
                      style={{ minHeight: 52 }}
                    />
                    {newComment && (
                      <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 4 }}>Save</button>
                    )}
                  </div>
                </form>

                {/* Activity feed */}
                <div className="activity-feed">
                  {card.comments?.map(c => (
                    <div key={c.id} className="activity-item">
                      <div className="avatar avatar-sm" style={{ background: c.avatar_color }}>{c.initials}</div>
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className="activity-user">{c.user_name}</span>
                          <span className="activity-time">{dayjs(c.created_at).format('MMM D, h:mm A')}</span>
                        </div>
                        <div className="comment-bubble">{c.content}</div>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 4px', marginTop: 2 }} onClick={() => handleDeleteComment(c.id)}>Delete</button>
                      </div>
                    </div>
                  ))}

                  {card.activity?.filter(a => a.action !== 'added_comment').map(a => (
                    <div key={a.id} className="activity-item">
                      <div className="avatar avatar-sm" style={{ background: a.avatar_color }}>{a.initials}</div>
                      <div className="activity-content">
                        <span className="activity-user">{a.user_name} </span>
                        <span className="activity-action">{a.action.replace(/_/g, ' ')}</span>
                        <span className="activity-time"> · {dayjs(a.created_at).format('MMM D')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ---- RIGHT SIDEBAR ---- */}
          <div className="card-modal-sidebar">
            <div className="section-title" style={{ marginBottom: 8 }}>Add to card</div>

            <SidebarBtn icon="👤" label="Members" onClick={() => { setShowMemberPicker(v => !v); setShowLabelPicker(false); }} />
            <SidebarBtn icon="🏷" label="Labels" onClick={() => { setShowLabelPicker(v => !v); setShowMemberPicker(false); }} />
            <SidebarBtn icon="✓" label="Checklist" onClick={() => { setShowAddChecklist(v => !v); }} />
            <SidebarBtn icon="📅" label="Dates" onClick={() => setShowDatePicker(v => !v)} />
            <SidebarBtn icon="📎" label="Attachment" onClick={() => fileRef.current?.click()} />
            <SidebarBtn icon="🎨" label="Cover" onClick={() => setShowCoverPicker(v => !v)} />
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} id="attachment-upload" />

            {/* LABEL PICKER */}
            {showLabelPicker && (
              <div className="sidebar-panel">
                <div className="panel-header">
                  <span>Labels</span>
                  <button className="icon-btn" onClick={() => { setShowLabelPicker(false); setEditingLabelId(null); }}>✕</button>
                </div>
                {editingLabelId ? (
                  <div style={{ padding: '8px 0' }}>
                    <input className="input" value={editingLabelName} onChange={e => setEditingLabelName(e.target.value)} placeholder="Label name" style={{ marginBottom: 8 }} />
                    <div className="color-grid">
                      {LABEL_COLORS.map(c => (
                        <button key={c} className={`color-swatch ${editingLabelColor === c ? 'active' : ''}`}
                          style={{ background: c }} onClick={() => setEditingLabelColor(c)} />
                      ))}
                    </div>
                    <div style={{ display:'flex', gap: 6, marginTop: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveLabel(editingLabelId)}>Save</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteLabel(editingLabelId)}>Delete</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingLabelId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {labels.map(l => (
                      <div key={l.id} className="label-picker-row">
                        <div
                          className={`label-picker-chip ${card.labels.some(cl => cl.id === l.id) ? 'selected' : ''}`}
                          style={{ background: l.color }}
                          onClick={() => toggleLabel(l.id)}
                        >
                          {card.labels.some(cl => cl.id === l.id) && <span>✓</span>}
                          {l.name}
                        </div>
                        <button className="icon-btn" onClick={() => { setEditingLabelId(l.id); setEditingLabelName(l.name); setEditingLabelColor(l.color); }}>✏️</button>
                      </div>
                    ))}
                    <button className="btn btn-secondary w-full btn-sm" style={{ marginTop: 8 }} onClick={handleCreateLabel}>+ Create a new label</button>
                  </>
                )}
              </div>
            )}

            {/* MEMBER PICKER */}
            {showMemberPicker && (
              <div className="sidebar-panel">
                <div className="panel-header">
                  <span>Members</span>
                  <button className="icon-btn" onClick={() => setShowMemberPicker(false)}>✕</button>
                </div>
                {boardMembers.map(m => {
                  const assigned = card.members.some(cm => cm.id === m.id);
                  return (
                    <div key={m.id} className="member-picker-row" onClick={() => toggleMember(m.id)}>
                      <div className="avatar avatar-sm" style={{ background: m.avatar_color }}>{m.initials}</div>
                      <span>{m.name}</span>
                      {assigned && <span style={{ marginLeft: 'auto', color: 'var(--btn-success)' }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* DATE PICKER */}
            {showDatePicker && (
              <div className="sidebar-panel">
                <div className="panel-header">
                  <span>Due date</span>
                  <button className="icon-btn" onClick={() => setShowDatePicker(false)}>✕</button>
                </div>
                <input
                  type="datetime-local"
                  className="input" style={{ marginBottom: 8 }}
                  value={dueDateVal}
                  onChange={e => setDueDateVal(e.target.value)}
                  id="due-date-picker"
                />
                <div style={{ display:'flex', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleDueDateSave}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setDueDateVal(''); handleDueDateSave(); }}>Remove</button>
                </div>
              </div>
            )}

            {/* CHECKLIST FORM */}
            {showAddChecklist && (
              <div className="sidebar-panel">
                <div className="panel-header">
                  <span>Add checklist</span>
                  <button className="icon-btn" onClick={() => setShowAddChecklist(false)}>✕</button>
                </div>
                <form onSubmit={handleAddChecklist}>
                  <input className="input" value={newChecklistTitle} onChange={e => setNewChecklistTitle(e.target.value)}
                    placeholder="Checklist title" style={{ marginBottom: 8 }} id="checklist-title-input" />
                  <button type="submit" className="btn btn-primary btn-sm">Add</button>
                </form>
              </div>
            )}

            {/* COVER PICKER */}
            {showCoverPicker && (
              <div className="sidebar-panel">
                <div className="panel-header">
                  <span>Cover</span>
                  <button className="icon-btn" onClick={() => setShowCoverPicker(false)}>✕</button>
                </div>
                <div className="color-grid">
                  {['#F87168','#FAA53D','#F5CD47','#4BCE97','#579DFF','#9F8FEF','#6CC3E0','#E774BB','#B3C0CC','#172B4D'].map(c => (
                    <button key={c} className="color-swatch" style={{ background: c }} onClick={() => handleCoverColor(c)} />
                  ))}
                </div>
                {(card.cover_color || card.cover_image) && (
                  <button className="btn btn-secondary w-full btn-sm" style={{ marginTop: 8 }} onClick={handleRemoveCover}>Remove cover</button>
                )}
              </div>
            )}

            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '12px 0' }}></div>
            <div className="section-title" style={{ marginBottom: 8 }}>Actions</div>
            <SidebarBtn icon="🗄" label="Archive" onClick={handleArchive} danger />
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarBtn({ icon, label, onClick, danger }) {
  return (
    <button
      className={`sidebar-action-btn ${danger ? 'danger' : ''}`}
      onClick={onClick}
      id={`sidebar-btn-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <span>{icon}</span> {label}
    </button>
  );
}
