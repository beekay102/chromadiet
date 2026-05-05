// =============================================================
// src/pages/ResetPassword.jsx
// User lands here from the email link. The supabase client (with
// detectSessionInUrl: true) parses the recovery token from the URL
// fragment and emits a PASSWORD_RECOVERY event, which establishes
// a temporary session that's only good for calling updateUser({ password }).
//
// Why we listen via supabase.auth.onAuthStateChange directly here
// (and not through AuthContext): the context surfaces session/user
// but not the specific PASSWORD_RECOVERY event, which is what tells
// us "yes, a valid recovery link delivered the user here."
//
// Edge cases handled:
//   - Link expired or invalid → user sees an error and a link to
//     request a fresh reset email.
//   - Already signed in normally (not via recovery) → we still
//     allow the password change because a real session is also
//     authorized to update it.
// =============================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { KeyRound, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

// Frame is declared OUTSIDE the component on purpose. Defining it inside
// would create a new component reference every render, causing React to
// unmount and remount the entire subtree (including the password inputs)
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
            <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mt-1">Set new password</div>
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

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, session: contextSession } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryError, setRecoveryError] = useState(null);

  // Use a ref so the setTimeout fallback can read the latest readiness
  // without going stale (closure-over-state problem).
  const recoveryReadyRef = useRef(false);
  useEffect(() => { recoveryReadyRef.current = recoveryReady; }, [recoveryReady]);

  useEffect(() => {
    let cancelled = false;

    // If AuthContext already has a session (user signed in normally), allow them
    // to change their password without requiring a recovery flow.
    if (contextSession) {
      setRecoveryReady(true);
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, sess) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && sess)) {
        setRecoveryReady(true);
        setRecoveryError(null);
      }
    });

    // Fallback: if neither a context session nor a PASSWORD_RECOVERY event
    // materializes within ~1.5s, the link is probably expired/invalid.
    const t = setTimeout(() => {
      if (!cancelled && !recoveryReadyRef.current) {
        setRecoveryError('This reset link is invalid or has expired. Please request a new one.');
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(t);
      listener?.subscription?.unsubscribe();
    };
  }, [contextSession]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      // Give the user a moment to read the success message, then send them in.
      setTimeout(() => navigate('/', { replace: true }), 2000);
    } catch (err) {
      setError(err?.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Frame>
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold text-stone-900 mb-2">
            Password updated
          </h2>
          <p className="text-sm text-stone-600">Redirecting you to the app…</p>
        </div>
      </Frame>
    );
  }

  if (recoveryError) {
    return (
      <Frame>
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-rose-700" />
          </div>
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-semibold text-stone-900 text-center mb-2">
          Link expired
        </h2>
        <p className="text-sm text-stone-600 text-center mb-6">{recoveryError}</p>
        <Link
          to="/forgot-password"
          className="block w-full text-center px-5 py-2.5 rounded-full bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition shadow-sm"
        >
          Request a new reset link
        </Link>
      </Frame>
    );
  }

  if (!recoveryReady) {
    return (
      <Frame>
        <div className="text-center py-4 text-sm text-stone-500">Verifying reset link…</div>
      </Frame>
    );
  }

  return (
    <Frame>
      <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold mb-1">Set a new password</h1>
      <p className="text-sm text-stone-600 mb-6">
        Choose a strong password you don't use anywhere else.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">New password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              required
              className="w-full border border-stone-300 px-3 py-2.5 pr-10 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
              placeholder="At least 8 characters"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">Confirm new password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            className="w-full border border-stone-300 px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
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
          {submitting ? 'Updating…' : (
            <>
              <KeyRound className="w-4 h-4" />
              Update password →
            </>
          )}
        </button>
      </form>
    </Frame>
  );
}
