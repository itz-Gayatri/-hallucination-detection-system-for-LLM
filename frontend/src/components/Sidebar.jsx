import { Shield, Plus, Trash2, MessageSquare, User, LogOut, Search } from 'lucide-react';

export default function Sidebar({
  sessions, activeSessionId, sidebarSearch,
  onSearch, onNew, onSelect, onDelete, user, onLogout,
}) {
  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-surface-900 border-r border-surface-800 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-800">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100">TruthGuard AI</p>
          <p className="text-xs text-slate-500">Hallucination Detector</p>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 py-3">
        <button onClick={onNew} className="btn-primary w-full justify-center text-xs py-2">
          <Plus className="w-3.5 h-3.5" /> New Verification
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={sidebarSearch} onChange={(e) => onSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-surface-800 border border-surface-700 text-slate-300 text-xs
                       rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-6">No verifications yet</p>
        )}
        {filtered.map((s) => (
          <button key={s.id} onClick={() => onSelect(s.id)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left group transition-colors ${
              activeSessionId === s.id
                ? 'bg-brand-600/20 text-slate-100'
                : 'text-slate-400 hover:bg-surface-800 hover:text-slate-200'
            }`}>
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-xs truncate">{s.title}</span>
            <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              className="hidden group-hover:flex p-1 hover:text-red-400 transition-colors" aria-label="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          </button>
        ))}
      </div>

      {/* User footer */}
      <div className="border-t border-surface-800 p-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-600/30 rounded-full flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <button onClick={onLogout}
              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
              aria-label="Logout">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <a href="/login" className="btn-ghost w-full justify-center text-xs">
            <User className="w-3.5 h-3.5" /> Sign In
          </a>
        )}
      </div>
    </aside>
  );
}
