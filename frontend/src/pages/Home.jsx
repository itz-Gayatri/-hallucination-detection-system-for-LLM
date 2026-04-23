import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Brain, Globe, Zap, Plus, Trash2, MessageSquare, User, LogOut, Search } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { verifyAPI, chatAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const WELCOME_FEATURES = [
  { icon: Brain,  label: 'Semantic AI',     desc: 'Real sentence embeddings' },
  { icon: Globe,  label: 'Multilingual',    desc: 'English, Hindi, Marathi' },
  { icon: Zap,    label: 'Math Engine',     desc: 'SymPy verification' },
  { icon: Shield, label: 'Trusted Sources', desc: 'Wikipedia + WHO' },
];

export default function Home() {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialText, setInitialText] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const messagesEndRef = useRef(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const textParam = params.get('text');
    if (textParam) {
      setInitialText(decodeURIComponent(textParam));
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    chatAPI.list().then((res) => {
      const backendChats = res.data || [];
      setSessions((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const merged = [...prev];
        backendChats.forEach((c) => {
          if (!existingIds.has(c._id))
            merged.push({ id: c._id, title: c.title, messages: [], fromBackend: true });
        });
        return merged;
      });
    }).catch(() => {});
  }, [user]);

  const handleNewSession = useCallback(() => {
    const id = `local-${Date.now()}`;
    setSessions((prev) => [{ id, title: 'New Verification', messages: [] }, ...prev]);
    setActiveSessionId(id);
  }, []);

  const handleSend = useCallback(async (text) => {
    if (loading) return;
    let sessionId = activeSessionId;
    if (!sessionId) {
      const id = `local-${Date.now()}`;
      const title = text.slice(0, 45) + (text.length > 45 ? '...' : '');
      setSessions((prev) => [{ id, title, messages: [] }, ...prev]);
      setActiveSessionId(id);
      sessionId = id;
    }

    const msgId = `msg-${Date.now()}`;
    setSessions((prev) => prev.map((s) =>
      s.id === sessionId
        ? { ...s, messages: [...s.messages, { id: msgId, question: text, answer: '', verification: null, isVerifying: true }],
            title: s.messages.length === 0 ? text.slice(0, 45) : s.title }
        : s
    ));
    setLoading(true);

    try {
      const res = await verifyAPI.verify(text);
      const data = res.data;
      const answerText = buildAnswerText(data);

      setSessions((prev) => prev.map((s) =>
        s.id === sessionId
          ? { ...s, messages: s.messages.map((m) =>
              m.id === msgId ? { ...m, answer: answerText, verification: data, isVerifying: false } : m
            )}
          : s
      ));

      if (user) {
        try {
          let backendChatId = sessionId;
          if (sessionId.startsWith('local-')) {
            const chat = await chatAPI.create(text.slice(0, 50));
            backendChatId = chat.data._id;
            setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, id: backendChatId } : s));
            setActiveSessionId(backendChatId);
          }
          await chatAPI.saveMessage(backendChatId, { question: text, answer: answerText, verification: data });
        } catch (_) {}
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed. Check your connection.');
      setSessions((prev) => prev.map((s) =>
        s.id === sessionId ? { ...s, messages: s.messages.filter((m) => m.id !== msgId) } : s
      ));
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, loading, user]);

  const handleSelectSession = useCallback(async (sessionId) => {
    setActiveSessionId(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || session.messages.length > 0 || sessionId.startsWith('local-')) return;
    try {
      const res = await chatAPI.get(sessionId);
      const backendMessages = (res.data.messages || []).map((m, i) => ({
        id: `hist-${sessionId}-${i}`,
        question: m.question || '',
        answer: m.answer || m.verification?.correct_answer?.slice(0, 300) || '',
        verification: m.verification || null,
        isVerifying: false,
      }));
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, messages: backendMessages } : s));
    } catch (_) {}
  }, [sessions]);

  const handleDeleteSession = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
    if (!id.startsWith('local-')) chatAPI.delete(id).catch(() => {});
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
      }} />

      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface-900 border-r border-surface-800 flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-800">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-100">TruthGuard AI</p>
            <p className="text-xs text-slate-500">Hallucination Detector</p>
          </div>
        </div>
        <div className="px-3 py-3">
          <button onClick={handleNewSession} className="btn-primary w-full justify-center text-xs py-2">
            <Plus className="w-3.5 h-3.5" /> New Verification
          </button>
        </div>
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-surface-800 border border-surface-700 text-slate-300 text-xs
                         rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {filteredSessions.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-6">No verifications yet</p>
          )}
          {filteredSessions.map((s) => (
            <button key={s.id} onClick={() => handleSelectSession(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left group transition-colors ${
                activeSessionId === s.id ? 'bg-brand-600/20 text-slate-100' : 'text-slate-400 hover:bg-surface-800 hover:text-slate-200'
              }`}>
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 text-xs truncate">{s.title}</span>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                className="hidden group-hover:flex p-1 hover:text-red-400 transition-colors" aria-label="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
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
              <button onClick={logout}
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

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-surface-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-semibold text-slate-200">
              {activeSession?.title || 'TruthGuard AI'}
            </span>
            {messages.length > 0 && (
              <span className="text-xs text-slate-500 ml-1">
                · {messages.length} verification{messages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {!user && <a href="/login" className="btn-primary text-xs px-3 py-1.5">Sign in</a>}
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <AnimatePresence>
              {messages.length === 0 && !loading && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-center space-y-6 pt-12">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600/10 border border-brand-500/20 rounded-full">
                    <div className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
                    <span className="text-xs text-brand-300 font-medium">AI Hallucination Detection</span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-100 mb-2">Is your AI telling the truth?</h1>
                    <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                      Paste any AI-generated response below. TruthGuard verifies it against trusted sources
                      and shows accuracy, hallucination score, and the correct answer — all inline.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
                    {WELCOME_FEATURES.map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="card text-center p-3 hover:border-brand-500/30 transition-colors">
                        <Icon className="w-4 h-4 text-brand-400 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-slate-200">{label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-6">
              {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
            </div>
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-surface-800 bg-surface-950/90 backdrop-blur-sm px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSend} loading={loading} initialText={initialText} />
          </div>
        </div>
      </main>
    </div>
  );
}

function buildAnswerText(data) {
  if (data.inputType === 'math') {
    const results = data.mathResults || [];
    if (results.length > 0) return results.map((r) => r.explanation || r.error || 'Unable to verify').join('\n');
    return data.correctAnswer || 'Math verification complete.';
  }
  if (data.correctAnswer) return data.correctAnswer.slice(0, 300) + (data.correctAnswer.length > 300 ? '...' : '');
  return 'Verification complete. See details below.';
}
