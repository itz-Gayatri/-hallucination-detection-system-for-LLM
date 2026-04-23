import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await signup(form.name, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">TruthGuard AI</h1>
          <p className="text-slate-400 text-sm mt-1">{isSignup ? 'Create your account' : 'Sign in to your account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {isSignup && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                required placeholder="Your name"
                className="w-full bg-surface-900 border border-surface-700 text-slate-100 text-sm
                           rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              required placeholder="you@example.com"
              className="w-full bg-surface-900 border border-surface-700 text-slate-100 text-sm
                         rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              required placeholder="••••••••" minLength={6}
              className="w-full bg-surface-900 border border-surface-700 text-slate-100 text-sm
                         rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? <LoadingSpinner size="sm" /> : null}
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>

          <p className="text-center text-xs text-slate-500">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" onClick={() => { setIsSignup(!isSignup); setError(''); }}
              className="text-brand-400 hover:text-brand-300 transition-colors">
              {isSignup ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </form>

        <p className="text-center mt-4">
          <a href="/" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
            Continue without account →
          </a>
        </p>
      </div>
    </div>
  );
}
