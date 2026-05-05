// =============================================================
// src/lib/supabase.js
// Single Supabase client instance shared across the app.
// =============================================================

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Loud failure during dev rather than silent breakage
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase env vars. Add VITE_SUPABASE_URL and ' +
    'VITE_SUPABASE_ANON_KEY to .env.local and restart vercel dev.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // for password-reset deep links
  },
});
