-- =============================================================
-- ChromaDiet — 99_teardown.sql
-- =============================================================
-- COMPLETELY DESTROYS the ChromaDiet schema in this Supabase
-- project. After running this, the project will have:
--   - No participants, recall_sessions, food_entries, recall_results
--   - No my_recall_history view
--   - No is_staff() / is_admin() / generate_participant_code()
--     / handle_new_user() functions
--   - No on_auth_user_created trigger on auth.users
--   - No chromadiet_photos_* policies on storage.objects
--
-- WHAT THIS FILE DOES NOT DO
--   - Does NOT delete auth.users (sign-in accounts remain)
--   - Does NOT delete the chromadiet-photos bucket itself
--     (delete via Dashboard if needed — see README section)
--   - Does NOT delete files inside the bucket
--     (DELETE FROM storage.objects is blocked by Supabase;
--      use the Dashboard or the Admin tab's Wipe action first)
--
-- IRREVERSIBLE. Running this on a project with real participant
-- data will erase that data. Read the GUARD section below.
-- =============================================================


-- =============================================================
-- GUARD
-- =============================================================
-- This script intentionally does NOT include a confirmation
-- prompt — Postgres SQL doesn't support interactive confirmation
-- in a script. The protection is procedural, not technical:
--
--   1. The script lives in a separate file, not 01_schema.sql.
--      You have to deliberately open and run it.
--
--   2. Before running, manually run the row-count query below
--      to see what you're about to destroy.
--
--   3. Take a backup if the data matters
--      (Supabase Dashboard → Database → Backups → Create backup).
--
-- Run this row-count check BEFORE the DROP statements:

SELECT
  (SELECT COUNT(*) FROM public.participants)     AS participants,
  (SELECT COUNT(*) FROM public.recall_sessions)  AS recall_sessions,
  (SELECT COUNT(*) FROM public.food_entries)     AS food_entries,
  (SELECT COUNT(*) FROM public.recall_results)   AS recall_results,
  (SELECT COUNT(*) FROM auth.users)              AS auth_users_KEPT;

-- If those numbers shock you, STOP. Don't run the rest.
-- If they're expected (or zero, for a fresh project), continue.


-- =============================================================
-- 1. DROP TRIGGER ON auth.users
-- =============================================================
-- Drop this first so signups during the teardown don't try to
-- write into a participants table that's about to disappear.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;


-- =============================================================
-- 2. DROP STORAGE POLICIES
-- =============================================================
-- These reference is_staff(), so drop before the function.
-- Storage policies live on storage.objects and don't disappear
-- when the chromadiet-photos bucket is deleted.

DROP POLICY IF EXISTS chromadiet_photos_read    ON storage.objects;
DROP POLICY IF EXISTS chromadiet_photos_insert  ON storage.objects;
DROP POLICY IF EXISTS chromadiet_photos_update  ON storage.objects;
DROP POLICY IF EXISTS chromadiet_photos_delete  ON storage.objects;


-- =============================================================
-- 3. DROP THE VIEW
-- =============================================================
-- Drop before the underlying tables so we don't get a cascade
-- error from the view definition referencing them.

DROP VIEW IF EXISTS public.my_recall_history;


-- =============================================================
-- 4. DROP TABLES
-- =============================================================
-- CASCADE handles the foreign keys between tables and any
-- policies still attached. Order: leaves first, root last.

DROP TABLE IF EXISTS public.recall_results  CASCADE;
DROP TABLE IF EXISTS public.food_entries    CASCADE;
DROP TABLE IF EXISTS public.recall_sessions CASCADE;
DROP TABLE IF EXISTS public.participants    CASCADE;


-- =============================================================
-- 5. DROP FUNCTIONS
-- =============================================================
-- Helper functions used by RLS policies and signup trigger.
-- Drop after their callers (policies, trigger) are gone.

DROP FUNCTION IF EXISTS public.is_staff();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.generate_participant_code(UUID);
DROP FUNCTION IF EXISTS public.handle_new_user();


-- =============================================================
-- 6. VERIFICATION
-- =============================================================
-- Each query should return zero rows.

-- 6.1 No tables
SELECT 'tables_remaining' AS check_type, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('participants', 'recall_sessions', 'food_entries', 'recall_results');
-- Expected: 0 rows.

-- 6.2 No view
SELECT 'view_remaining' AS check_type, table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'my_recall_history';
-- Expected: 0 rows.

-- 6.3 No functions
SELECT 'functions_remaining' AS check_type, p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_staff', 'is_admin', 'generate_participant_code', 'handle_new_user');
-- Expected: 0 rows.

-- 6.4 No trigger
SELECT 'trigger_remaining' AS check_type, tgname
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
-- Expected: 0 rows.

-- 6.5 No storage policies
SELECT 'storage_policies_remaining' AS check_type, policyname
FROM pg_policies
WHERE schemaname = 'storage'
  AND policyname LIKE 'chromadiet_photos_%';
-- Expected: 0 rows.

-- 6.6 auth.users still intact
SELECT 'auth_users_preserved' AS check_type, COUNT(*) AS user_count
FROM auth.users;
-- Expected: count > 0 (your signed-up users are preserved).
