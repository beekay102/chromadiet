// =============================================================
// src/pages/Login.jsx
// Email + password login. Includes a "Try as demo" dropdown with
// two pre-seeded demo accounts (alice = high score, bob = low score).
// =============================================================

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, AlertCircle, ChevronDown } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    label: 'Alice — high-variety eater',
    email: 'demo-alice@chromadiet.app',
    password: 'demo-alice-2026',
    description: 'A varied 24-hr recall scoring high on diversity and color coverage. Great for showing the success state.',
  },
  {
    label: 'Bob — gappy intake',
    email: 'demo-bob@chromadiet.app',
    password: 'demo-bob-2026',
    description: 'A limited recall missing several flavonoid classes and color groups. Good for showing the gaps & opportunities feature.',
  },
];

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const redirectTo = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Vague error message to prevent account enumeration
      setError("Email or password didn't match. Try again or reset your password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (account) => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(account.email, account.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(`Demo account "${account.label}" isn't ready. The researcher needs to seed it first.`);
    } finally {
      setSubmitting(false);
      setShowDemo(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      background: 'linear-gradient(180deg, #F0F7E8 0%, #E3EFD3 50%, #F0F7E8 100%)',
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" />

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-11 h-11 rounded-full shadow-sm" style={{
            background: 'conic-gradient(from 0deg, #7B3F9E, #C73E3E, #E89422, #D4A017, #5B8C3E, #7B3F9E)'
          }} />
          <div>
            <div style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold text-stone-900 leading-none tracking-tight">ChromaDiet</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mt-1">Color Pigment & Flavonoid Analyzer</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 p-8">
          <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-semibold mb-1">Welcome back.</h1>
          <p className="text-sm text-stone-600 mb-6">Sign in to log a 24-hour recall or view your history.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-stone-300 px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="text-xs font-semibold text-stone-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-emerald-700 hover:underline">Forgot it?</Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-stone-300 px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold rounded-full hover:bg-emerald-800 transition shadow-sm disabled:opacity-60 disabled:cursor-wait"
            >
              {submitting ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px bg-stone-200 flex-1" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-stone-400">or</span>
            <div className="h-px bg-stone-200 flex-1" />
          </div>

          {/* Demo dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDemo(!showDemo)}
              type="button"
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 transition"
            >
              <Sparkles size={14} /> Try as demo <ChevronDown size={14} className={`transition-transform ${showDemo ? 'rotate-180' : ''}`} />
            </button>
            {showDemo && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden z-10">
                {DEMO_ACCOUNTS.map(a => (
                  <button
                    key={a.email}
                    onClick={() => handleDemoLogin(a)}
                    type="button"
                    disabled={submitting}
                    className="w-full text-left px-4 py-3 hover:bg-purple-50 transition disabled:opacity-60 border-b border-stone-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-stone-900">{a.label}</div>
                    <div className="text-xs text-stone-600 mt-0.5 leading-relaxed">{a.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-sm text-stone-600">
            New here? <Link to="/signup" className="text-emerald-700 font-semibold hover:underline">Create an account</Link>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-stone-500">
          <strong className="text-stone-700">ChromaDiet</strong> · For IRB-approved studies and educational use
        </div>
      </div>
    </div>
  );
}
