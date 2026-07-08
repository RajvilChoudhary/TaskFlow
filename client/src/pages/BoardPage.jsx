import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getBoard, createList, updateList, reorderList, deleteList, createCard, updateCard, moveCard, updateBoard } from '../api';
import ListColumn from '../components/board/ListColumn';
import CardModal from '../components/card/CardModal';
import FilterBar from '../components/ui/FilterBar';
import InboxSidebar from '../components/board/InboxSidebar';
import BottomNav from '../components/layout/BottomNav';
import ShareModal from '../components/board/ShareModal';
import './BoardPage.css';

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [board, setBoard]         = useState(null);
  const [lists, setLists]         = useState([]);
  const [inboxCards, setInboxCards] = useState([]);
  const [labels, setLabels]       = useState([]);
  const [members, setMembers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [openCard, setOpenCard]   = useState(null);
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [filterState, setFilterState] = useState({ label_ids: [], member_ids: [], due: '' });
  const [showFilter, setShowFilter] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Split-screen views — by default only Board is active (Inbox off)
  const [activeViews, setActiveViews] = useState({ inbox: false, planner: false, board: true });

  const toggleView = (view) => {
    setActiveViews(prev => {
      // If toggling off the ONLY active view, do nothing (must have at least one view open)
      const next = { ...prev, [view]: !prev[view] };
      if (!next.inbox && !next.planner && !next.board) return prev;
      return next;
    });
  };

  const fetchBoard = useCallback(async () => {
    try {
      const res = await getBoard(id);
      setBoard(res.data);
      setBoardTitle(res.data.title);
      setLabels(res.data.labels || []);
      setMembers(res.data.members || []);
      setLists(res.data.lists || []);
      setInboxCards(res.data.inboxCards || []);
    } catch { navigate('/'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Auto-open card from ?openCard= query param (from search)
  useEffect(() => {
    if (!location.search) return;
    const params = new URLSearchParams(location.search);
    const openCardId = params.get('openCard');
    if (!openCardId || loading) return;
    // Find the card in lists or inbox
    const allCards = [
      ...lists.flatMap(l => l.cards),
      ...inboxCards
    ];
    const target = allCards.find(c => String(c.id) === openCardId);
    if (target) {
      setOpenCard(target);
      // Clean the URL without triggering a reload
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, loading, lists, inboxCards]);

  // ---- DRAG & DROP ----
  const onDragEnd = async (result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'LIST') {
      const newLists = Array.from(lists);
      const [moved] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, moved);
      setLists(newLists);
      const newPos = calculatePosition(newLists, destination.index);
      await reorderList(moved.id, { position: newPos });
      return;
    }

    // CARD
    const isSrcInbox = source.droppableId === 'inbox';
    const isDstInbox = destination.droppableId === 'inbox';
    
    // Get source array
    let srcCards = isSrcInbox ? Array.from(inboxCards) : Array.from((lists.find(l => String(l.id) === source.droppableId) || { cards: [] }).cards);
    
    // Get dest array
    let dstCards = source.droppableId === destination.droppableId
      ? srcCards
      : isDstInbox ? Array.from(inboxCards) : Array.from((lists.find(l => String(l.id) === destination.droppableId) || { cards: [] }).cards);

    if (!srcCards || !dstCards) return;

    const [movedCard] = srcCards.splice(source.index, 1);
    dstCards.splice(destination.index, 0, movedCard);

    // Update States
    if (isSrcInbox) setInboxCards(srcCards);
    if (isDstInbox) setInboxCards(dstCards);

    setLists(prev => prev.map(l => {
      if (!isSrcInbox && String(l.id) === source.droppableId) return { ...l, cards: srcCards };
      if (!isDstInbox && source.droppableId !== destination.droppableId && String(l.id) === destination.droppableId) return { ...l, cards: dstCards };
      return l;
    }));

    const newPos = calculatePosition(dstCards, destination.index);
    const destListId = isDstInbox ? null : Number(destination.droppableId);
    await moveCard(movedCard.id, { list_id: destListId, position: newPos });
  };

  const calculatePosition = (arr, index) => {
    const prev = index > 0 ? arr[index - 1]?.position ?? 0 : 0;
    const next = index < arr.length - 1 ? arr[index + 1]?.position ?? prev + 2 : prev + 2;
    return (prev + next) / 2;
  };

  // ---- LIST ACTIONS ----
  const handleAddList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    const res = await createList({ board_id: id, title: newListTitle });
    setLists(prev => [...prev, res.data]);
    setNewListTitle(''); setAddingList(false);
  };

  const handleUpdateList = async (listId, title) => {
    await updateList(listId, { title });
    setLists(prev => prev.map(l => l.id === listId ? { ...l, title } : l));
  };

  const handleDeleteList = async (listId) => {
    // Optimistic: remove from UI immediately
    setLists(prev => prev.filter(l => l.id !== listId));
    try {
      await deleteList(listId);
    } catch (err) {
      // Rollback: re-fetch if API failed
      console.error('Failed to archive list:', err);
      alert('Failed to archive list. Please try again.');
      fetchBoard();
    }
  };

  // ---- CARD ACTIONS ----
  const handleAddCard = async (listId, title) => {
    const res = await createCard({ list_id: listId, board_id: id, title });
    if (listId === null) {
      setInboxCards(prev => [...prev, res.data]);
    } else {
      setLists(prev => prev.map(l => l.id === listId ? { ...l, cards: [...l.cards, res.data] } : l));
    }
  };

  const handleOpenCard = (card) => setOpenCard(card);

  const handleCardUpdated = (updatedCard) => {
    if (updatedCard.list_id === null) {
      setInboxCards(prev => prev.map(c => c.id === updatedCard.id ? { ...c, ...updatedCard } : c));
    } else {
      setLists(prev => prev.map(l => ({ ...l, cards: l.cards.map(c => c.id === updatedCard.id ? { ...c, ...updatedCard } : c) })));
    }
  };

  const handleCardDeleted = (cardId) => {
    setInboxCards(prev => prev.filter(c => c.id !== cardId));
    setLists(prev => prev.map(l => ({ ...l, cards: l.cards.filter(c => c.id !== cardId) })));
    setOpenCard(null);
  };

  const handleToggleCardComplete = async (cardId, completed) => {
    try {
      // Optimistic update
      const toggle = (c) => c.id === cardId ? { ...c, completed: completed ? 1 : 0 } : c;
      setLists(prev => prev.map(l => ({ ...l, cards: l.cards.map(toggle) })));
      setInboxCards(prev => prev.map(toggle));
      
      const res = await updateCard(cardId, { completed });
      
      // Merge with server response to keep rich data (checklists, members, labels)
      const synced = (c) => c.id === cardId ? { ...c, ...res.data } : c;
      setLists(prev => prev.map(l => ({ ...l, cards: l.cards.map(synced) })));
      setInboxCards(prev => prev.map(synced));
      if (openCard?.id === cardId) setOpenCard(prev => ({ ...prev, ...res.data }));
    } catch (err) {
      console.error('Failed to toggle card complete status:', err);
      fetchBoard(); // Only revert on genuine error
    }
  };

  const handleTitleSave = async () => {
    if (!boardTitle.trim()) { setBoardTitle(board.title); }
    else if (boardTitle !== board.title) {
      await updateBoard(id, { title: boardTitle });
      setBoard(prev => ({ ...prev, title: boardTitle }));
    }
    setEditingTitle(false);
  };

  const getFilteredLists = () => {
    const { label_ids, member_ids, due } = filterState;
    const hasFilter = label_ids.length || member_ids.length || due;
    if (!hasFilter) return lists;
    return lists.map(l => ({
      ...l,
      cards: filterCardsArr(l.cards, label_ids, member_ids, due)
    }));
  };

  const filterCardsArr = (cardsArr, label_ids, member_ids, due) => {
    return cardsArr.filter(card => {
      // Coerce to Number to handle string/number type mismatches from DB
      const cardLabelIds = (card.label_ids || []).map(Number);
      const cardMemberIds = (card.member_ids || []).map(Number);
      if (label_ids.length && !label_ids.some(lid => cardLabelIds.includes(Number(lid)))) return false;
      if (member_ids.length && !member_ids.some(mid => cardMemberIds.includes(Number(mid)))) return false;
      if (due === 'overdue'  && (!card.due_date || new Date(card.due_date) >= new Date())) return false;
      if (due === 'upcoming' && (!card.due_date || new Date(card.due_date) < new Date())) return false;
      if (due === 'noduedate' && card.due_date) return false;
      return true;
    });
  };

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background: 'var(--bg-page)' }}>
      <div className="spinner"></div>
    </div>
  );

  const filteredLists = getFilteredLists();
  const filteredInbox = filterState.label_ids.length || filterState.member_ids.length || filterState.due 
    ? filterCardsArr(inboxCards, filterState.label_ids, filterState.member_ids, filterState.due)
    : inboxCards;

  return (
    <div className="board-page" style={{ background: board?.background }}>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="split-layout">
          
          {/* INBOX PANE */}
          <div className={`split-pane inbox-pane${activeViews.inbox ? (!activeViews.board ? ' full' : '') : ' collapsed'}`}>
            <div className="pane-content-wrapper" style={{ width: '100%', minWidth: 340, height: '100%' }}>
              <InboxSidebar 
                cards={filteredInbox} 
                onAddCard={handleAddCard} 
                onOpenCard={handleOpenCard} 
              />
            </div>
          </div>

          {/* BOARD PANE */}
          <div className={`split-pane board-pane ${activeViews.board ? (!activeViews.inbox ? 'full' : '') : 'collapsed'}`}>
            <div className="pane-content-wrapper" style={{ minWidth: 600, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="board-header">
                <div className="board-header-left">
                  {editingTitle ? (
                    <input
                      className="board-title-input"
                      value={boardTitle}
                      onChange={e => setBoardTitle(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setBoardTitle(board.title); setEditingTitle(false); } }}
                      autoFocus
                    />
                  ) : (
                    <h1 className="board-title" onClick={() => setEditingTitle(true)} id="board-title-heading">
                      {board?.title}
                    </h1>
                  )}
                  <div className="board-members">
                    {members.slice(0, 4).map(m => (
                      <div key={m.id} className="avatar avatar-sm" style={{ background: m.avatar_color }} title={m.name}>{m.initials}</div>
                    ))}
                    {members.length > 4 && <div className="avatar avatar-sm" style={{ background: 'var(--bg-input)' }}>+{members.length - 4}</div>}
                  </div>
                </div>

                <div className="board-header-right">
                  <button className={`btn btn-secondary btn-sm`} onClick={() => setShowShareModal(true)}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>
                    Share
                  </button>
                  <button className={`btn btn-secondary btn-sm ${showFilter ? 'active' : ''}`} onClick={() => setShowFilter(v => !v)}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
                    Filters
                  </button>
                </div>
              </div>

              {showFilter && (
                <FilterBar labels={labels} members={members} filterState={filterState} onChange={setFilterState} onClose={() => setShowFilter(false)} />
              )}

              <Droppable droppableId="board" type="LIST" direction="horizontal">
                {(provided) => (
                  <div className="board-canvas" ref={provided.innerRef} {...provided.droppableProps}>
                    {filteredLists.map((list, index) => (
                      <Draggable key={list.id} draggableId={`list-${list.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} className={`list-wrapper ${snapshot.isDragging ? 'dragging' : ''}`}>
                            <ListColumn
                              list={list} labels={labels} members={members} dragHandleProps={provided.dragHandleProps}
                              onUpdateList={handleUpdateList} onDeleteList={handleDeleteList}
                              onAddCard={handleAddCard} onOpenCard={handleOpenCard} filterState={filterState}
                              onToggleCardComplete={handleToggleCardComplete}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    <div className="add-list-wrapper">
                      {addingList ? (
                        <form className="add-list-form" onSubmit={handleAddList}>
                          <input className="input" placeholder="Enter list title…" value={newListTitle} onChange={e => setNewListTitle(e.target.value)} autoFocus />
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <button type="submit" className="btn btn-primary btn-sm">Add list</button>
                            <button type="button" className="icon-btn" onClick={() => { setAddingList(false); setNewListTitle(''); }}>✕</button>
                          </div>
                        </form>
                      ) : (
                        <button className="add-list-btn" onClick={() => setAddingList(true)}>+ Add another list</button>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>
      </DragDropContext>

      <BottomNav activeViews={activeViews} toggleView={toggleView} />

      {openCard && (
        <CardModal
          card={openCard} labels={labels} boardMembers={members}
          onClose={() => setOpenCard(null)} onCardUpdated={handleCardUpdated} onCardDeleted={handleCardDeleted} onLabelsChanged={(newLabels) => setLabels(newLabels)}
        />
      )}

      {showShareModal && (
        <ShareModal 
          boardId={id} 
          onClose={() => setShowShareModal(false)} 
        />
      )}
    </div>
  );
}
