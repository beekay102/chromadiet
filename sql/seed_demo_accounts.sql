-- =============================================================
-- ChromaDiet — Seed Demo Accounts
-- =============================================================
-- Run ONCE in the Supabase SQL Editor (as the postgres role) to
-- seed the two demo participant accounts shown in the Login page
-- "Try as demo" dropdown.
--
--   Alice — demo-alice@chromadiet.app / demo-alice-2026
--           High-variety, balanced eater
--   Bob   — demo-bob@chromadiet.app   / demo-bob-2026
--           Gappy intake, narrower diet
--
-- Passwords match DEMO_ACCOUNTS in src/pages/Login.jsx exactly.
-- If you change them here, change them there too.
--
-- This script is idempotent — safe to re-run. ON CONFLICT clauses
-- skip rows that already exist.
--
-- IMPORTANT: direct INSERT INTO auth.users may or may not fire the
-- handle_new_user() trigger depending on your Supabase project's
-- configuration. To be safe, this script ALSO does an explicit
-- INSERT into public.participants (with the same generated
-- participant_code logic the trigger uses) so the rows definitely
-- exist regardless. The participants INSERT uses ON CONFLICT DO
-- NOTHING so if the trigger DID fire, the second insert is a
-- harmless no-op.
-- =============================================================

-- ── Pre-flight ────────────────────────────────────────────────
-- pgcrypto provides crypt() and gen_salt() for password hashing
-- and gen_random_uuid() for the user IDs. Already enabled by
-- 01_schema.sql but declared here for safety.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- ALICE
-- =============================================================
DO $$
DECLARE
  alice_id UUID;
BEGIN
  -- If Alice already exists, reuse her UUID. Otherwise create.
  SELECT id INTO alice_id FROM auth.users WHERE email = 'demo-alice@chromadiet.app';

  IF alice_id IS NULL THEN
    alice_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      alice_id,
      'authenticated', 'authenticated',
      'demo-alice@chromadiet.app',
      crypt('demo-alice-2026', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'role',             'participant',
        'age_range',        '30-39',
        'sex',              'female',
        'cohort_code',      'DEMO',
        'consent_given_at', NOW()::text,
        'consent_version',  'v1.0-2026-05',
        'display_name',     'Alice (Demo — high variety)'
      ),
      NOW(), NOW(),
      '', '', '', ''
    );
  END IF;

  -- Fallback: ensure participants row exists with the same
  -- participant_code format the trigger uses ('P-' || first 6 hex
  -- chars of the user id, uppercased). ON CONFLICT skips if the
  -- trigger already created the row.
  INSERT INTO public.participants (
    user_id, participant_code, role,
    age_range, sex, cohort_code,
    consent_given_at, consent_version, is_demo
  ) VALUES (
    alice_id,
    'P-' || upper(substring(replace(alice_id::text, '-', '') from 1 for 6)),
    'participant',
    '30-39', 'female', 'DEMO',
    NOW(), 'v1.0-2026-05', TRUE
  ) ON CONFLICT (user_id) DO UPDATE
    SET is_demo = TRUE,
        cohort_code = 'DEMO';
  -- ON CONFLICT updates is_demo because the trigger doesn't read
  -- is_demo from metadata — we have to force it on after the row
  -- is created, whether by trigger or by us.
END$$;

-- =============================================================
-- BOB
-- =============================================================
DO $$
DECLARE
  bob_id UUID;
BEGIN
  SELECT id INTO bob_id FROM auth.users WHERE email = 'demo-bob@chromadiet.app';

  IF bob_id IS NULL THEN
    bob_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      bob_id,
      'authenticated', 'authenticated',
      'demo-bob@chromadiet.app',
      crypt('demo-bob-2026', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'role',             'participant',
        'age_range',        '50-59',
        'sex',              'male',
        'cohort_code',      'DEMO',
        'consent_given_at', NOW()::text,
        'consent_version',  'v1.0-2026-05',
        'display_name',     'Bob (Demo — gappy intake)'
      ),
      NOW(), NOW(),
      '', '', '', ''
    );
  END IF;

  INSERT INTO public.participants (
    user_id, participant_code, role,
    age_range, sex, cohort_code,
    consent_given_at, consent_version, is_demo
  ) VALUES (
    bob_id,
    'P-' || upper(substring(replace(bob_id::text, '-', '') from 1 for 6)),
    'participant',
    '50-59', 'male', 'DEMO',
    NOW(), 'v1.0-2026-05', TRUE
  ) ON CONFLICT (user_id) DO UPDATE
    SET is_demo = TRUE,
        cohort_code = 'DEMO';
END$$;

-- =============================================================
-- SANITY CHECK
-- =============================================================
-- Verify both auth users and their participants rows exist:
SELECT
  u.email,
  p.participant_code,
  p.role,
  p.age_range,
  p.sex,
  p.cohort_code,
  p.is_demo,
  p.consent_version
FROM auth.users u
LEFT JOIN public.participants p ON p.user_id = u.id
WHERE u.email IN ('demo-alice@chromadiet.app', 'demo-bob@chromadiet.app')
ORDER BY u.email;

-- Expected: 2 rows, both with non-null participant_code, role='participant',
-- cohort_code='DEMO', is_demo=true.
--
-- If participant_code or other columns are NULL, the trigger didn't
-- fire AND the fallback INSERT above somehow didn't run either —
-- check for errors in the SQL Editor output and re-run.

-- =============================================================
-- TROUBLESHOOTING
-- =============================================================
-- If the SQL Editor refuses to insert into auth.users with a
-- permission error, your project probably restricts that table.
-- Fall back to creating the users via the Supabase Dashboard:
--
--   Authentication → Users → Add user → "Create new user"
--   ─ Email: demo-alice@chromadiet.app
--   ─ Password: demo-alice-2026
--   ─ Auto-confirm: ✓ ON
--   ─ User metadata (JSON):
--     {
--       "role":"participant","age_range":"30-39","sex":"female",
--       "cohort_code":"DEMO","consent_given_at":"2026-05-03T00:00:00Z",
--       "consent_version":"v1.0-2026-05","display_name":"Alice (Demo)"
--     }
--
-- Repeat for Bob (50-59 / male / "Bob (Demo)" / password demo-bob-2026).
--
-- After creating both via the dashboard, run JUST this UPDATE to
-- mark them as demo accounts (the trigger doesn't set is_demo):
--
--   UPDATE public.participants
--   SET is_demo = TRUE, cohort_code = 'DEMO'
--   WHERE user_id IN (
--     SELECT id FROM auth.users
--     WHERE email IN ('demo-alice@chromadiet.app','demo-bob@chromadiet.app')
--   );
-- =============================================================
