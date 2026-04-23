import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import LoadingSpinner from './ui/LoadingSpinner';

export default function ChatInput({ onSend, loading, initialText = '' }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => { if (initialText) setText(initialText); }, [initialText]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; }
  }, [text]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (text.trim() && !loading) { onSend(text.trim()); setText(''); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={`flex items-end gap-3 bg-surface-800 border rounded-2xl px-4 py-3 transition-all duration-200 ${
        text ? 'border-brand-500/50 shadow-lg shadow-brand-500/5' : 'border-surface-700'
      }`}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste an AI response to verify... (Enter to send, Shift+Enter for new line)"
          disabled={loading}
          rows={1}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 text-sm
                     resize-none focus:outline-none leading-relaxed py-0.5"
          aria-label="Message to verify"
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          {text && (
            <button type="button" onClick={() => setText('')}
              className="text-slate-600 hover:text-slate-400 transition-colors p-1" aria-label="Clear">
              <X className="w-4 h-4" />
            </button>
          )}
          <button type="submit" disabled={!text.trim() || loading}
            className="w-8 h-8 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed
                       rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95"
            aria-label="Send">
            {loading ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-600 text-center mt-2">
        TruthGuard verifies responses against Wikipedia, WHO, and SymPy
      </p>
    </form>
  );
}
