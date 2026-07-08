import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getBoards, createBoard, deleteBoard } from '../api';
import { useAuth } from '../context/AuthContext';
import InvitationInbox from '../components/ui/InvitationInbox';
import './HomePage.css';

const BACKGROUNDS = [
  'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
  'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)',
  'linear-gradient(135deg,#f7971e 0%,#ffd200 100%)',
  'linear-gradient(135deg,#f953c6 0%,#b91d73 100%)',
  'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
  'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
  'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)',
  '#0052CC','#00875A','#6554C0',
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedBg, setSelectedBg] = useState(BACKGROUNDS[0]);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);
  const [mainWorkspaceExpanded, setMainWorkspaceExpanded] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const res = await getBoards();
      setBoards(res.data.reverse() || []);
    } finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await createBoard({ title: newTitle, background: selectedBg });
    setBoards(prev => [res.data, ...prev]);
    setNewTitle(''); 
    setShowCreate(false);
    navigate(`/board/${res.data.id}`);
  };

  const handleDelete = async (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm('Delete this board and all its contents?')) return;
    await deleteBoard(id);
    setBoards(prev => prev.filter(b => b.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center w-full h-screen bg-surface">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-surface-container-highest border-t-primary"></div>
    </div>
  );

  const recentlyViewed = boards.slice(0, 4);

  return (
    <div className="w-full relative bg-surface text-on-surface font-body overflow-x-hidden min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low flex flex-col py-4 z-20 overflow-y-auto border-r border-white/5">
        <div className="px-6 mb-8 flex items-center gap-2 mt-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9" height="9" rx="2" fill="#579DFF"/>
            <rect x="13" y="2" width="9" height="5" rx="2" fill="#579DFF"/>
            <rect x="2" y="13" width="9" height="9" rx="2" fill="#579DFF"/>
            <rect x="13" y="9" width="9" height="13" rx="2" fill="#579DFF"/>
          </svg>
          <h2 className="font-headline font-bold text-on-surface leading-tight text-xl tracking-tight">TaskFlow</h2>
        </div>
        <nav className="flex-1 space-y-1">
          <a className="flex items-center gap-3 px-4 py-2 mx-2 transition-all duration-200 bg-secondary-container text-on-surface rounded-md" href="#">
            <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>home</span>
            <span className="font-medium text-sm">Home</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 mx-2 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface rounded-md transition-colors" href="#">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-medium text-sm">Boards</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 mx-2 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface rounded-md transition-colors" href="#">
            <span className="material-symbols-outlined">auto_awesome_motion</span>
            <span className="font-medium text-sm">Templates</span>
          </a>
          <div className="pt-8 px-6 pb-2">
            <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Workspaces</h3>
          </div>
          <button 
            onClick={() => setWorkspaceExpanded(!workspaceExpanded)} 
            className="w-full flex items-center justify-between px-4 py-2 mx-2 text-on-surface-variant hover:bg-surface-container-highest rounded-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-tertiary">group</span>
              <span className="font-medium text-sm truncate max-w-[140px]" title={user?.name ? `${user.name}'s Workspace` : 'My Workspace'}>
                {user?.name ? `${user.name}'s Workspace` : 'My Workspace'}
              </span>
            </div>
            <span className="material-symbols-outlined text-xs transition-transform duration-200" style={{ transform: workspaceExpanded ? 'rotate(180deg)' : 'none' }}>
              expand_more
            </span>
          </button>
          
          {workspaceExpanded && (
            <div className="pl-12 pr-4 py-1 space-y-1 animation-fadeIn">
              {boards.map(b => (
                <Link key={b.id} to={`/board/${b.id}`} className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-on-surface py-1.5 transition-colors truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.background }}></span>
                  <span className="truncate">{b.title}</span>
                </Link>
              ))}
              {boards.length === 0 && (
                <span className="text-[11px] text-on-surface-variant/50 italic pl-4">No boards yet</span>
              )}
            </div>
          )}
        </nav>
        <div className="mt-auto space-y-1">
          <a className="flex items-center gap-3 px-4 py-2 mx-2 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface rounded-md transition-colors" href="#">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-medium text-sm">Settings</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 mx-2 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface rounded-md transition-colors" href="#">
            <span className="material-symbols-outlined">archive</span>
            <span className="font-medium text-sm">Archived</span>
          </a>
        </div>
      </aside>

      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-64 right-0 h-16 bg-surface/90 backdrop-blur px-6 flex items-center justify-between z-10 ghost-border border-b border-white/5">
        <div className="flex items-center gap-6 flex-1">
          <div className="relative w-full max-w-md group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
            <input className="w-full bg-surface-container ghost-border rounded-md pl-11 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary-container/40 transition-all border border-white/5" placeholder="Search boards..." type="text"/>
          </div>
          <button onClick={() => setShowCreate(true)} className="bg-primary-container text-on-primary-container px-4 py-2 rounded-md font-medium text-sm hover:brightness-110 active:scale-95 transition-all">
            Create
          </button>
        </div>
        <div className="flex items-center gap-4">
          {/* Invitation inbox bell */}
          <InvitationInbox />
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-full transition-colors">
            <span className="material-symbols-outlined max-w-[20px] max-h-[20px] leading-none block">help</span>
          </button>
          {/* User avatar with initials */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs border border-white/20 cursor-pointer select-none"
            style={{ background: user?.avatar_color || '#7C5CBF' }}
            title={user?.name || 'You'}
          >
            {user?.initials || '?'}
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-full transition-colors"
            title="Logout"
          >
            <span className="material-symbols-outlined max-w-[20px] max-h-[20px] leading-none block">logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="ml-64 pt-24 p-8 min-h-screen">
        
        {/* Recently Viewed Section */}
        {recentlyViewed.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-on-surface-variant">schedule</span>
            <h2 className="font-bold text-on-surface" style={{ fontSize: '1.25rem' }}>Recently viewed</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentlyViewed.map((board) => (
              <Link to={`/board/${board.id}`} key={board.id} className="group relative bg-surface-container-high rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-300 shadow-xl cursor-pointer block">
                <div className="absolute inset-0 z-0 opacity-40 group-hover:opacity-60 transition-opacity" style={{ background: board.background }}></div>
                <div className="h-24 bg-gradient-to-r from-surface-container to-transparent z-10 relative opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 relative z-10 bg-surface-container-high/80 backdrop-blur-sm shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                  <h3 className="font-bold text-on-surface text-sm mb-1">{board.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
        )}

        {/* Your Workspaces Section */}
        <section>
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-6">Your Workspaces</h3>
          <div className="flex items-center justify-between mb-8">
            <div 
              onClick={() => setMainWorkspaceExpanded(!mainWorkspaceExpanded)}
              className="flex items-center gap-4 cursor-pointer select-none group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shadow-inner font-bold text-white text-sm transition-transform group-hover:scale-105"
                style={{ background: user?.avatar_color || '#7C5CBF' }}
              >
                {user?.initials || '?'}
              </div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-on-surface group-hover:text-primary transition-colors" style={{ fontSize: '1.25rem' }}>
                  {user?.name ? `${user.name}'s Workspace` : 'My Workspace'}
                </h2>
                <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200" style={{ transform: mainWorkspaceExpanded ? 'rotate(180deg)' : 'none' }}>
                  expand_more
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-secondary-container text-on-surface rounded-md text-xs font-medium hover:bg-surface-container-highest transition-colors">
                <span className="material-symbols-outlined text-sm">dashboard</span>
                Boards
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-on-surface-variant rounded-md text-xs font-medium hover:bg-surface-container-highest transition-colors">
                <span className="material-symbols-outlined text-sm">person</span>
                Members
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-on-surface-variant rounded-md text-xs font-medium hover:bg-surface-container-highest transition-colors">
                <span className="material-symbols-outlined text-sm">settings</span>
                Settings
              </button>
            </div>
          </div>
          
          {mainWorkspaceExpanded && (
            /* Board Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animation-fadeIn">
              {boards.map(board => (
                <Link to={`/board/${board.id}`} key={board.id} className="group relative bg-surface-container-high rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-300 shadow-xl cursor-pointer block h-[140px] border border-white/5">
                  <div className="absolute inset-0 z-0 opacity-60 group-hover:opacity-80 transition-opacity" style={{ background: board.background }}></div>
                  <div className="absolute top-2 right-2 z-20">
                    <button onClick={(e) => handleDelete(e, board.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container/50 text-on-surface-variant hover:bg-error hover:text-on-error transition-colors backdrop-blur px-0 py-0 opacity-0 group-hover:opacity-100">
                      <span className="material-symbols-outlined text-sm leading-none block">delete</span>
                    </button>
                  </div>
                  <div className="h-full w-full bg-gradient-to-t from-surface-container-highest via-surface-container/20 to-transparent z-10 relative flex flex-col justify-end">
                    <div className="p-4 relative z-10 backdrop-blur-[2px]">
                      <h3 className="font-bold text-on-surface text-sm drop-shadow-md">{board.title}</h3>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Create New Board Placeholder */}
              <div onClick={() => setShowCreate(true)} className="group flex flex-col items-center justify-center h-[140px] bg-surface-container rounded-xl ghost-border hover:bg-surface-container-highest hover:border-primary/40 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-3xl mb-2">add_circle</span>
                <span className="text-xs font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">Create new board</span>
                <span className="text-[10px] text-on-surface-variant/60 mt-1">Unlimited remaining</span>
              </div>
            </div>
          )}
        </section>

        {/* Asymmetric Detail Section (Design System Bonus) */}
        <section className="mt-16 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 p-8 rounded-2xl bg-surface-container-low ghost-border relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
            <h4 className="font-bold text-on-surface mb-2" style={{ fontSize: '1.25rem' }}>Workspace Activity</h4>
            <p className="text-sm text-on-surface-variant mb-6 max-w-md relative z-10">Your team has completed 12 tasks in the last 24 hours. Enjoy using the premium Midnight Canvas theme!</p>
            <div className="flex -space-x-3 relative z-10">
              <div className="w-10 h-10 rounded-full border-2 border-surface-container-low overflow-hidden bg-surface-container">
                <img alt="Team member 1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7pY6Qc50gVZKlHkO6lckQt3LxfUB3njZrvfkFlH8y_45E4sy4ahU53kPWD0iVPqEkGovKID7kQ3753srkTBtIx5xk4nvGjGNuR_SOiPdW_Y1fCo87-JypQwW2-AIJHF-lcaaF8S7JShNDwUTfOfQfE5-6ITTCrJbMcGls9E3e5qLryk3aTGE8PBwz9sT-5rN_U38APsiCLS5NfM5EJUhQVsrkDKZU0xraCrERw213A82dVE-mBBU4Fby_EC4nXbUVKx-XmRD5QysQ" referrerPolicy="no-referrer"/>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-surface-container-low overflow-hidden bg-surface-container">
                <img alt="Team member 2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWZ6WCzb4sy6-DLioMD_vQyj9VK4KzgHAzPE8vT5eLXhYN5C8-knWbHQqd_4WQliWbhc2k40CSGQEcQHBNH68ojAVJ3wlnNwtcK742VYNcPIub_7NauWx_dpQBDOgTBWgjTf-d4llCai3BmI_DC8VIBHfCWLBuZcrM6R4zl7WbeeNVuiG2wd-eATsY_IUtkvj2et-nQ4FBS4_7-2NVVFCZZLMmFAfJtPOZWHKVjDhllH-zZEGnkJMOXwEE2rm9yU-W5KgZLdfqWDxt" referrerPolicy="no-referrer"/>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-surface-container-low flex items-center justify-center text-[10px] font-bold text-on-surface">
                +8
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 p-8 rounded-2xl bg-gradient-to-br from-tertiary/20 to-surface-container ghost-border flex flex-col justify-between border border-white/5">
            <div>
              <span className="material-symbols-outlined text-tertiary mb-4" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
              <h4 className="font-bold text-on-surface mb-2" style={{ fontSize: '1.25rem' }}>Try Templates</h4>
              <p className="text-xs text-on-surface-variant">Accelerate your workflow with curated editorial boards.</p>
            </div>
            <button className="mt-6 w-full py-2 bg-tertiary-container text-on-tertiary-container rounded-md text-xs font-bold hover:brightness-110 transition-all">
              Browse Gallery
            </button>
          </div>
        </section>
      </main>

      {/* Create Board Modal (Preserved Functionality) */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 transition-all backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-container rounded-xl w-full max-w-sm shadow-2xl overflow-hidden ghost-border border border-white/10 scale-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="font-bold text-on-surface">Create board</h3>
              <button className="text-on-surface-variant hover:bg-surface-container-highest p-1 rounded-md transition-colors flex items-center justify-center" onClick={() => setShowCreate(false)}>
                <span className="material-symbols-outlined text-sm block leading-none w-5 h-5 flex items-center justify-center">close</span>
              </button>
            </div>

            <div className="p-4 bg-surface-container-low transition-colors duration-300 relative overflow-hidden" style={{ background: selectedBg }}>
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="mx-auto w-48 h-28 rounded-md bg-white/10 backdrop-blur shadow-lg border border-white/20 flex p-2 gap-2 relative z-10">
                <div className="w-12 bg-white/20 rounded h-full flex flex-col gap-1.5 p-1.5">
                  <div className="h-2 bg-white/40 rounded w-full"></div>
                  <div className="h-8 bg-white/30 rounded w-full"></div>
                </div>
                <div className="w-12 bg-white/20 rounded h-4/6 flex flex-col gap-1.5 p-1.5">
                  <div className="h-2 bg-white/40 rounded w-full"></div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-surface-container">
              <div className="text-[10px] font-bold text-on-surface-variant mb-2 uppercase tracking-widest">Background</div>
              <div className="grid grid-cols-5 gap-2 mb-5">
                {BACKGROUNDS.map((bg, i) => (
                  <button
                    key={i} type="button"
                    className={`h-10 rounded-md shadow-sm border border-white/5 hover:border-white/30 transition-all flex items-center justify-center ${selectedBg === bg ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container' : ''}`}
                    style={{ background: bg }}
                    onClick={() => setSelectedBg(bg)}
                  >
                    {selectedBg === bg && <span className="material-symbols-outlined text-white text-sm">check</span>}
                  </button>
                ))}
              </div>

              <form onSubmit={handleCreate}>
                <label className="block text-[10px] font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                  Board title <span className="text-error">*</span>
                </label>
                <input
                  className="w-full bg-surface-container-low border border-white/10 rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all mb-4"
                  placeholder="Enter board title…"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                />
                
                <button
                  type="submit"
                  className="w-full py-2 bg-primary-container text-on-primary-container rounded-md text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100 flex items-center justify-center gap-2"
                  disabled={!newTitle.trim()}
                >
                  Create
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
