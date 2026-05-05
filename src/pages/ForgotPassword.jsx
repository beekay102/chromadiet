// =============================================================
// src/pages/ForgotPassword.jsx
// Sends a password-reset link via email. The link redirects to
// /reset-password where ResetPassword.jsx handles updating the
// password using the recovery session Supabase establishes.
// =============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

// Frame is declared OUTSIDE the component on purpose. Defining it inside
// would create a new component reference every render, causing React to
// unmount and remount the entire subtree (including the email input)
// every time state updates — which steals focus mid-typing.
function Frame({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      background: 'linear-gradient(180deg, #F0F7E8 0%, #E3EFD3 50%, #F0F7E8 100%)',
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" />
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-11 h-11 rounded-full shadow-sm" style={{
            background: 'conic-gradient(from 0deg, #7B3F9E, #C73E3E, #E89422, #D4A017, #5B8C3E, #7B3F9E)'
          }} />
          <div>
            <div style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold text-stone-900 leading-none tracking-tight">ChromaDiet</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mt-1">Reset password</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 p-8">{children}</div>
        <div className="text-center mt-6 text-xs text-stone-500">
          <strong className="text-stone-700">ChromaDiet</strong> · For IRB-approved studies and educational use
        </div>
      </div>
    </div>
  );
}

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    setSubmitting(true);
    try {
      await sendPasswordReset(email.trim());
      // Always show success even if the email isn't registered, to avoid
      // enumeration attacks. Supabase silently no-ops for unknown emails.
      setSent(true);
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Frame>
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-700" />
          </div>
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold text-stone-900 text-center mb-2">
          Check your email
        </h2>
        <p className="text-sm text-stone-600 text-center mb-6">
          If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
          The link expires in one hour.
        </p>
        <Link
          to="/login"
          className="block w-full text-center px-5 py-2.5 rounded-full bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition shadow-sm"
        >
          Back to sign in
        </Link>
      </Frame>
    );
  }

  return (
    <Frame>
      <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold mb-1">Forgot your password?</h1>
      <p className="text-sm text-stone-600 mb-6">
        Enter the email associated with your account and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            required
            className="w-full border border-stone-300 px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
            placeholder="you@example.com"
            disabled={submitting}
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
          className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold rounded-full hover:bg-emerald-800 transition shadow-sm disabled:opacity-60 disabled:cursor-wait"
        >
          {submitting ? 'Sending…' : (
            <>
              <Mail className="w-4 h-4" />
              Send reset link →
            </>
          )}
        </button>
      </form>

      <div className="mt-5 text-center">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </div>
    </Frame>
  );
}
