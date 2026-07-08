import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getBoards, createBoard, globalSearch } from '../../api';
import './Header.css';

const BACKGROUNDS = [
  'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
  'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)',
  'linear-gradient(135deg,#f7971e 0%,#ffd200 100%)',
  'linear-gradient(135deg,#f953c6 0%,#b91d73 100%)',
  'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
  'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
  'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
  'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)',
  '#0052CC','#00875A','#FF5630','#6554C0','#172B4D',
];

export default function Header() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const { id: boardId } = useParams();

  const [showCreate, setShowCreate]       = useState(false);
  const [showBoards, setShowBoards]       = useState(false);
  const [boards, setBoards]               = useState([]);
  const [newTitle, setNewTitle]           = useState('');
  const [selectedBg, setSelectedBg]       = useState(BACKGROUNDS[0]);
  const [searchVal, setSearchVal]         = useState('');
  const [searchResults, setSearchResults] = useState({ boards: [], lists: [], cards: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch]       = useState(false);

  const createRef = useRef(null);
  const boardsRef = useRef(null);
  const searchRef = useRef(null);
  const searchTimer = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (createRef.current && !createRef.current.contains(e.target)) setShowCreate(false);
      if (boardsRef.current && !boardsRef.current.contains(e.target)) setShowBoards(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch boards for switcher
  const openBoards = async () => {
    setShowBoards(v => !v);
    const res = await getBoards();
    setBoards(res.data);
  };

  // Create board
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await createBoard({ title: newTitle, background: selectedBg });
    setNewTitle(''); setShowCreate(false);
    navigate(`/board/${res.data.id}`);
  };

  // Search
  const handleSearchChange = (val) => {
    setSearchVal(val);
    setShowSearch(true);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setSearchResults({ boards: [], lists: [], cards: [] }); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await globalSearch(val);
        setSearchResults(res.data);
      } catch(e) {
        setSearchResults({ boards: [], lists: [], cards: [] });
      } finally { setSearchLoading(false); }
    }, 300);
  };

  const handleResultClick = (type, item) => {
    setShowSearch(false);
    setSearchVal('');
    setSearchResults({ boards: [], lists: [], cards: [] });

    if (type === 'board') {
      navigate(`/board/${item.id}`);
    } else if (type === 'list') {
      // If the list has cards, open the first one; otherwise just go to board
      if (item.first_card_id) {
        navigate(`/board/${item.board_id}?openCard=${item.first_card_id}`);
      } else {
        navigate(`/board/${item.board_id}`);
      }
    } else if (type === 'card') {
      navigate(`/board/${item.board_id}?openCard=${item.id}`);
    }
  };

  return (
    <header className="header">
      {/* Left */}
      <div className="header-left">
        <Link to="/" className="header-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9" height="9" rx="2" fill="#579DFF"/>
            <rect x="13" y="2" width="9" height="5" rx="2" fill="#579DFF"/>
            <rect x="2" y="13" width="9" height="9" rx="2" fill="#579DFF"/>
            <rect x="13" y="9" width="9" height="13" rx="2" fill="#579DFF"/>
          </svg>
          <span className="header-logo-text">TaskFlow</span>
        </Link>

        {/* Boards switcher */}
        <div className="header-dropdown-wrap" ref={boardsRef}>
          <button className="header-btn" onClick={openBoards} id="boards-switcher-btn">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
            Boards
          </button>
          {showBoards && (
            <div className="boards-dropdown dropdown-menu" style={{ width: 340, left: 0, top: '100%', marginTop: 4 }}>
              <div className="dropdown-header">Your boards</div>
              {boards.map(b => (
                <Link key={b.id} to={`/board/${b.id}`} className="board-dropdown-item" onClick={() => setShowBoards(false)}>
                  <span className="board-thumb" style={{ background: b.background }}></span>
                  <span className="truncate">{b.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Create */}
        <div className="header-dropdown-wrap" ref={createRef}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(v => !v)} id="create-board-btn">
            + Create
          </button>
          {showCreate && (
            <div className="create-dropdown dropdown-menu" style={{ width: 300, left: 0, top: '100%', marginTop: 4 }}>
              <div className="dropdown-header">Create board</div>
              <form onSubmit={handleCreate} style={{ padding: '0 12px 12px' }}>
                <div className="bg-picker">
                  {BACKGROUNDS.map((bg, i) => (
                    <button
                      key={i} type="button"
                      className={`bg-swatch ${selectedBg === bg ? 'active' : ''}`}
                      style={{ background: bg }}
                      onClick={() => setSelectedBg(bg)}
                    />
                  ))}
                </div>
                <div className="form-field" style={{ marginTop: 12 }}>
                  <label className="form-label">Board title <span style={{ color: 'var(--btn-danger)' }}>*</span></label>
                  <input
                    className="input" id="new-board-title"
                    placeholder="Enter board title…"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <button id="submit-create-board" type="submit" className="btn btn-primary w-full" style={{ marginTop: 10 }}
                  disabled={!newTitle.trim()}>
                  Create board
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Center — Search */}
      <div className="header-search-wrap" ref={searchRef}>
        <div className="header-search">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.415l-3.868-3.833ZM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"/>
          </svg>
          <input
            id="global-search"
            className="search-input"
            placeholder="Search…"
            value={searchVal}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => setShowSearch(true)}
          />
        </div>
        {showSearch && searchVal && (
          <div className="search-results dropdown-menu" style={{ top: '100%', marginTop: 4, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            {searchLoading ? (
              <div className="dropdown-item" style={{ justifyContent: 'center' }}><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div></div>
            ) : (searchResults.boards.length === 0 && searchResults.lists.length === 0 && searchResults.cards.length === 0) ? (
              <div className="dropdown-item" style={{ color: 'var(--text-muted)' }}>No results found</div>
            ) : (
              <>
                {searchResults.boards.length > 0 && (
                  <>
                    <div className="dropdown-header">Boards</div>
                    {searchResults.boards.map(board => (
                      <div key={`b-${board.id}`} className="dropdown-item result-item" onClick={() => handleResultClick('board', board)}>
                        <div className="result-thumb" style={{ background: board.background }}></div>
                        <div className="result-info">
                          <div className="result-title truncate">{board.title}</div>
                          <div className="result-sub">TaskFlow Workspace</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {searchResults.lists.length > 0 && (
                  <>
                    <div className="dropdown-header">Lists</div>
                    {searchResults.lists.map(list => (
                      <div key={`l-${list.id}`} className="dropdown-item result-item" onClick={() => handleResultClick('list', list)}>
                        <div className="result-icon-box pink">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/><line x1="1" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="2"/></svg>
                        </div>
                        <div className="result-info">
                          <div className="result-title truncate">{list.title}</div>
                          <div className="result-sub">{list.board_title}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {searchResults.cards.length > 0 && (
                  <>
                    <div className="dropdown-header">Cards</div>
                    {searchResults.cards.map(card => (
                      <div key={`c-${card.id}`} className="dropdown-item result-item" onClick={() => handleResultClick('card', card)}>
                        <div className="result-icon-box blue">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="14" height="4" rx="1"/><rect x="1" y="7" width="10" height="4" rx="1"/><rect x="1" y="13" width="12" height="2" rx="1"/></svg>
                        </div>
                        <div className="result-info">
                          <div className="result-title truncate">{card.title}</div>
                          <div className="result-sub">{card.board_title}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <div className="dropdown-footer-link" onClick={() => setShowSearch(false)}>
                   <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.415l-3.868-3.833ZM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"/></svg>
                   Advanced search
                   <span className="shortcut">↵</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="header-right">
        <button className="icon-btn" id="notification-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
          </svg>
        </button>
        <div className="avatar" style={{ background: currentUser.avatar_color }}>
          {currentUser.initials}
        </div>
      </div>
    </header>
  );
}
