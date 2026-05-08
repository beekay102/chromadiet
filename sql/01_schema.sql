-- =============================================================
-- ChromaDiet — 01_schema.sql
-- =============================================================
-- Single consolidated schema setup. Run this once on a fresh
-- Supabase project to provision everything the application needs.
--
-- Idempotent — uses IF NOT EXISTS, CREATE OR REPLACE, and DROP IF
-- EXISTS where appropriate. Safe to re-run if you tweak something.
--
-- WHAT THIS FILE DOES
--   1. Creates the four core tables (participants, recall_sessions,
--      food_entries, recall_results)
--   2. Creates indexes for foreign keys and common query patterns
--   3. Enables row-level security on every table
--   4. Defines RLS policies for participant / staff / admin scopes
--   5. Creates the auth.users → participants trigger so a participant
--      row exists for every signup
--   6. Defines the my_recall_history view used by the UI
--
-- WHAT THIS FILE DOES NOT DO
--   - Storage bucket setup → see 02_storage.sql
--   - Demo seed data → use the Admin tab in the running app
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → New Query → paste this file
--   → Run. Watch for any red errors.
-- =============================================================


-- =============================================================
-- 1. EXTENSIONS
-- =============================================================
-- pgcrypto provides gen_random_uuid() — used as the default for
-- session and entry primary keys. Supabase usually has it enabled
-- but enabling explicitly is harmless.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =============================================================
-- 2. TABLES
-- =============================================================

-- ─── 2.1 participants ───────────────────────────────────
-- One row per signed-up user. Created automatically by the
-- handle_new_user trigger (see Section 5) when an auth.users row
-- is inserted, so signing up always produces a participants row.
CREATE TABLE IF NOT EXISTS public.participants (
  user_id           UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_code  TEXT         UNIQUE NOT NULL,
  age_range         TEXT,
  sex               TEXT,
  cohort_code       TEXT,
  is_demo           BOOLEAN      NOT NULL DEFAULT FALSE,
  role              TEXT         NOT NULL DEFAULT 'participant'
                                  CHECK (role IN ('participant', 'staff', 'admin')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for cohort filtering (Cohort View tab queries by cohort_code).
CREATE INDEX IF NOT EXISTS participants_cohort_code_idx
  ON public.participants (cohort_code) WHERE cohort_code IS NOT NULL;


-- ─── 2.2 recall_sessions ────────────────────────────────
-- One row per submitted 24-hour recall.
CREATE TABLE IF NOT EXISTS public.recall_sessions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recall_date   DATE         NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'submitted'
                              CHECK (status IN ('submitted', 'reviewed', 'archived')),
  submitted_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recall_sessions_user_id_idx
  ON public.recall_sessions (user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS recall_sessions_submitted_at_idx
  ON public.recall_sessions (submitted_at DESC);


-- ─── 2.3 food_entries ───────────────────────────────────
-- One row per food item logged in a recall. user_id is denormalized
-- (technically derivable via session_id) for RLS policy efficiency.
CREATE TABLE IF NOT EXISTS public.food_entries (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID         NOT NULL REFERENCES public.recall_sessions(id) ON DELETE CASCADE,
  user_id              UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_occasion        TEXT         NOT NULL DEFAULT 'Other',
  food_id              TEXT,
  portion_g            NUMERIC,
  description          TEXT,
  photo_storage_path   TEXT,
  ai_scan_used         BOOLEAN      NOT NULL DEFAULT FALSE,
  ai_confidence        NUMERIC,
  ai_reasoning         TEXT,
  components           JSONB,
  display_order        INT          NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS food_entries_session_idx
  ON public.food_entries (session_id, display_order);

CREATE INDEX IF NOT EXISTS food_entries_user_idx
  ON public.food_entries (user_id);


-- ─── 2.4 recall_results ─────────────────────────────────
-- One row per recall, computed by /api/finalize.js after submit.
-- Written using the service-role key (clients never insert here).
CREATE TABLE IF NOT EXISTS public.recall_results (
  session_id            UUID         PRIMARY KEY REFERENCES public.recall_sessions(id) ON DELETE CASCADE,
  user_id               UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score           INT          NOT NULL,
  total_flavonoids_mg   REAL         NOT NULL DEFAULT 0,
  classes_present       INT          NOT NULL DEFAULT 0,
  colors_present        INT          NOT NULL DEFAULT 0,
  myplate_groups_hit    INT          NOT NULL DEFAULT 0,
  fruit_count           INT          NOT NULL DEFAULT 0,
  veg_count             INT          NOT NULL DEFAULT 0,
  flav_totals           JSONB        NOT NULL DEFAULT '{}'::jsonb,
  color_pigment_mg      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  myplate_counts        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  fruit_color_counts    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  veg_color_counts      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  sources               JSONB        NOT NULL DEFAULT '{}'::jsonb,
  sufficiency           JSONB        NOT NULL DEFAULT '{}'::jsonb,
  score_breakdown       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  algorithm_version     TEXT         NOT NULL,
  computed_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recall_results_user_idx
  ON public.recall_results (user_id);


-- =============================================================
-- 3. ROW-LEVEL SECURITY
-- =============================================================
-- Every table has RLS enabled. Without policies, a table with RLS
-- enabled returns zero rows for every query — the database refuses
-- to leak data even if the application code has bugs.

ALTER TABLE public.participants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_results   ENABLE ROW LEVEL SECURITY;


-- ─── Helper: is_staff() / is_admin() ────────────────────
-- These functions are SECURITY DEFINER so they can read
-- participants.role even from contexts where RLS would otherwise
-- block. They're used by every staff/admin policy below.

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.participants
    WHERE user_id = auth.uid() AND role IN ('staff', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.participants
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;


-- ─── 3.1 Policies on participants ───────────────────────
-- Drop existing policies first so this script is idempotent.
DROP POLICY IF EXISTS participants_select_own_or_staff ON public.participants;
DROP POLICY IF EXISTS participants_update_own           ON public.participants;
DROP POLICY IF EXISTS participants_insert_self          ON public.participants;

CREATE POLICY participants_select_own_or_staff
  ON public.participants FOR SELECT
  USING (auth.uid() = user_id OR public.is_staff());

CREATE POLICY participants_update_own
  ON public.participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INSERT is handled by the signup trigger (Section 5) but we still
-- need a policy so the trigger's INSERT succeeds under the user's
-- authentication context.
CREATE POLICY participants_insert_self
  ON public.participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ─── 3.2 Policies on recall_sessions ────────────────────
DROP POLICY IF EXISTS recall_sessions_select_own_or_staff ON public.recall_sessions;
DROP POLICY IF EXISTS recall_sessions_insert_own           ON public.recall_sessions;
DROP POLICY IF EXISTS recall_sessions_update_own           ON public.recall_sessions;
DROP POLICY IF EXISTS recall_sessions_delete_own           ON public.recall_sessions;

CREATE POLICY recall_sessions_select_own_or_staff
  ON public.recall_sessions FOR SELECT
  USING (auth.uid() = user_id OR public.is_staff());

CREATE POLICY recall_sessions_insert_own
  ON public.recall_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY recall_sessions_update_own
  ON public.recall_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY recall_sessions_delete_own
  ON public.recall_sessions FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 3.3 Policies on food_entries ───────────────────────
DROP POLICY IF EXISTS food_entries_select_own_or_staff ON public.food_entries;
DROP POLICY IF EXISTS food_entries_insert_own           ON public.food_entries;
DROP POLICY IF EXISTS food_entries_update_own           ON public.food_entries;
DROP POLICY IF EXISTS food_entries_delete_own           ON public.food_entries;

CREATE POLICY food_entries_select_own_or_staff
  ON public.food_entries FOR SELECT
  USING (auth.uid() = user_id OR public.is_staff());

CREATE POLICY food_entries_insert_own
  ON public.food_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY food_entries_update_own
  ON public.food_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY food_entries_delete_own
  ON public.food_entries FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 3.4 Policies on recall_results ─────────────────────
-- READ is permitted for the owner and for staff/admin.
-- INSERT/UPDATE/DELETE go through the service-role key
-- (in /api/finalize.js and /api/admin.js) which bypasses RLS,
-- so we don't need write policies for ordinary users.
DROP POLICY IF EXISTS recall_results_select_own_or_staff ON public.recall_results;

CREATE POLICY recall_results_select_own_or_staff
  ON public.recall_results FOR SELECT
  USING (auth.uid() = user_id OR public.is_staff());


-- =============================================================
-- 4. PARTICIPANT CODE GENERATOR
-- =============================================================
-- Generates a deterministic-looking but random participant code
-- like "P-1EC735" from a UUID. Used by the signup trigger.
CREATE OR REPLACE FUNCTION public.generate_participant_code(uid UUID)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'P-' || UPPER(SUBSTRING(REPLACE(uid::TEXT, '-', '') FROM 1 FOR 6));
$$;


-- =============================================================
-- 5. AUTO-CREATE PARTICIPANTS ROW ON SIGNUP
-- =============================================================
-- Whenever Supabase Auth creates a new auth.users row (signup),
-- this trigger creates the matching participants row so the rest
-- of the app can rely on it always existing.
--
-- The trigger reads age_range / sex / cohort_code from
-- raw_user_meta_data (set by the signup form) if present.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.participants (
    user_id,
    participant_code,
    age_range,
    sex,
    cohort_code,
    is_demo,
    role
  )
  VALUES (
    NEW.id,
    public.generate_participant_code(NEW.id),
    NEW.raw_user_meta_data ->> 'age_range',
    NEW.raw_user_meta_data ->> 'sex',
    NEW.raw_user_meta_data ->> 'cohort_code',
    COALESCE((NEW.raw_user_meta_data ->> 'is_demo')::boolean, FALSE),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'participant')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =============================================================
-- 6. my_recall_history VIEW
-- =============================================================
-- Read-optimized view used by the My History tab and Cohort View.
-- Joins recall_sessions, recall_results, and participants into
-- one row per submission with all demographics needed for filters.
--
-- CRITICAL: security_invoker = on. Without this, Postgres 15+
-- evaluates the view with the CREATOR's privileges (i.e., bypasses
-- RLS), which would let any participant read everyone else's data.

CREATE OR REPLACE VIEW public.my_recall_history AS
SELECT
  s.id            AS session_id,
  s.user_id,
  s.recall_date,
  s.submitted_at,
  s.status,
  s.notes,
  r.total_score,
  r.total_flavonoids_mg,
  r.classes_present,
  r.colors_present,
  r.myplate_groups_hit,
  r.fruit_count,
  r.veg_count,
  r.flav_totals,
  r.algorithm_version,
  (SELECT COUNT(*) FROM public.food_entries WHERE session_id = s.id) AS entry_count,
  (SELECT COUNT(*) FROM public.food_entries WHERE session_id = s.id AND photo_storage_path IS NOT NULL) AS photo_count,
  p.participant_code,
  p.age_range,
  p.sex,
  p.cohort_code,
  p.is_demo
FROM public.recall_sessions s
LEFT JOIN public.recall_results r ON r.session_id = s.id
LEFT JOIN public.participants  p ON p.user_id    = s.user_id
WHERE s.status IN ('submitted', 'reviewed', 'archived');

ALTER VIEW public.my_recall_history SET (security_invoker = on);


-- =============================================================
-- 7. VERIFICATION
-- =============================================================
-- Run these to confirm everything was created. Each query should
-- return rows; zero rows means something didn't get created.

-- 7.1 Tables exist
SELECT 'tables' AS check_type, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('participants', 'recall_sessions', 'food_entries', 'recall_results');
-- Expected: 4 rows.

-- 7.2 RLS enabled on every table
SELECT 'rls' AS check_type, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('participants', 'recall_sessions', 'food_entries', 'recall_results');
-- Expected: 4 rows, all rowsecurity = true.

-- 7.3 Policies exist
SELECT 'policies' AS check_type, tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
-- Expected: participants 3, recall_sessions 4, food_entries 4, recall_results 1.

-- 7.4 Trigger exists
SELECT 'trigger' AS check_type, tgname
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
-- Expected: 1 row.

-- 7.5 View exists with security_invoker
SELECT 'view' AS check_type,
       c.relname AS view_name,
       c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'my_recall_history';
-- Expected: 1 row, reloptions contains "security_invoker=on".
