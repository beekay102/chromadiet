// =============================================================
// src/pages/Signup.jsx
// Self-signup for participants. Email confirmation is OFF in dev,
// so a successful signUp() returns a session immediately and we
// can navigate straight into the app.
//
// The metadata keys below MUST match what handle_new_user() reads
// from raw_user_meta_data (see 01_schema.sql section 8):
//   role, age_range, sex, cohort_code, consent_given_at, consent_version
// =============================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const AGE_RANGES = ['18-29', '30-39', '40-49', '50-59', '60-69', '70+'];
const SEXES = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'intersex', label: 'Intersex' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// Bump this whenever the consent text below is materially edited.
// Stored on the participants row so we can audit who agreed to which version.
const CONSENT_VERSION = 'v1.0-2026-05';

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [sex, setSex] = useState('');
  const [cohortCode, setCohortCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  function validate() {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!ageRange) return 'Please select your age range.';
    if (!sex) return 'Please select an option for sex.';
    if (!consent) return 'You must agree to the consent statement to participate.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // Metadata keys match handle_new_user trigger exactly.
      const data = await signUp(email.trim(), password, {
        role: 'participant',
        age_range: ageRange,
        sex,
        cohort_code: cohortCode.trim() || null,
        consent_given_at: new Date().toISOString(),
        consent_version: CONSENT_VERSION,
      });

      // With email confirmation disabled, signUp returns a session immediately.
      if (data?.session) {
        navigate('/', { replace: true });
        return;
      }

      // Fallback: confirmation is on or some edge case.
      setSuccess(true);
    } catch (err) {
      setError(err?.message || 'Sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'linear-gradient(180deg, #F0F7E8 0%, #E3EFD3 50%, #F0F7E8 100%)',
      }}>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" />
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-stone-200/70 p-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            </div>
          </div>
          <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold text-stone-900 text-center mb-2">
            Check your email
          </h2>
          <p className="text-sm text-stone-600 text-center mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <Link
            to="/login"
            className="block w-full text-center px-5 py-2.5 rounded-full bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition shadow-sm"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      background: 'linear-gradient(180deg, #F0F7E8 0%, #E3EFD3 50%, #F0F7E8 100%)',
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" />

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-11 h-11 rounded-full shadow-sm" style={{
            background: 'conic-gradient(from 0deg, #7B3F9E, #C73E3E, #E89422, #D4A017, #5B8C3E, #7B3F9E)'
          }} />
          <div>
            <div style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold text-stone-900 leading-none tracking-tight">ChromaDiet</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mt-1">Create participant account</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 p-7">
          <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold mb-1">Join the study.</h1>
          <p className="text-sm text-stone-600 mb-5">A few details and you're in. Takes about a minute.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full border border-stone-300 px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full border border-stone-300 px-3 py-2.5 pr-10 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                  placeholder="At least 8 characters"
                  disabled={loading}
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
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Confirm password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="w-full border border-stone-300 px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                disabled={loading}
              />
            </div>

            <hr className="border-stone-200" />

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Age range</label>
              <select
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                required
                className="w-full border border-stone-300 px-3 py-2.5 text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                disabled={loading}
              >
                <option value="">Select an age range</option>
                {AGE_RANGES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                required
                className="w-full border border-stone-300 px-3 py-2.5 text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                disabled={loading}
              >
                <option value="">Select an option</option>
                {SEXES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Cohort code <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={cohortCode}
                onChange={(e) => setCohortCode(e.target.value.toUpperCase())}
                className="w-full border border-stone-300 px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
                placeholder="e.g. STUDY-2026"
                disabled={loading}
              />
              <p className="text-[11px] text-stone-500 mt-1">Provided by your study coordinator if applicable.</p>
            </div>

            <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-200"
                disabled={loading}
              />
              <span className="text-xs text-stone-700 leading-snug">
                I agree to participate in the ChromaDiet research study and consent to the collection of dietary
                recall data, including food photographs and descriptions, for analysis. I understand my data will
                be stored securely and used only for research purposes. <span className="text-stone-400">({CONSENT_VERSION})</span>
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold rounded-full hover:bg-emerald-800 transition shadow-sm disabled:opacity-60 disabled:cursor-wait"
            >
              {loading ? 'Creating account…' : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create account →
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-stone-600">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-700 font-semibold hover:underline">Sign in</Link>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-stone-500">
          <strong className="text-stone-700">ChromaDiet</strong> · For IRB-approved studies and educational use
        </div>
      </div>
    </div>
  );
}
