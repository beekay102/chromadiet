-- =============================================================
-- ChromaDiet — 02_storage.sql
-- =============================================================
-- Storage bucket setup. The chromadiet-photos bucket holds
-- participant food photos.
--
-- IMPORTANT: This file ONLY creates the storage policies. The
-- bucket itself must be created via the Supabase Dashboard:
--
--   Dashboard → Storage → New Bucket
--     Name:   chromadiet-photos
--     Public: OFF (private)
--     File size limit: 50 MB (or whatever your study allows)
--
-- Once the bucket exists, run this script to install the
-- access policies that match our application's usage.
--
-- Run AFTER 01_schema.sql (this file references is_staff() and
-- is_admin() defined there).
-- =============================================================


-- =============================================================
-- 1. STORAGE POLICIES
-- =============================================================
-- The storage.objects table is owned by Supabase. We can write
-- policies on it but cannot ALTER its structure.

-- Drop existing policies first (idempotent re-run).
DROP POLICY IF EXISTS chromadiet_photos_read     ON storage.objects;
DROP POLICY IF EXISTS chromadiet_photos_insert   ON storage.objects;
DROP POLICY IF EXISTS chromadiet_photos_update   ON storage.objects;
DROP POLICY IF EXISTS chromadiet_photos_delete   ON storage.objects;


-- ─── 1.1 READ ───────────────────────────────────────────
-- A user can read photos whose storage path begins with their own
-- user_id. Staff/admin can read everyone's photos.
--
-- The path convention is: {user_id}/{session_id}/{display_order}.jpg
-- so we check that the first folder of the path matches auth.uid().
CREATE POLICY chromadiet_photos_read
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chromadiet-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_staff()
    )
  );


-- ─── 1.2 INSERT ─────────────────────────────────────────
-- A user can upload a new photo only if the path begins with
-- their own user_id. Prevents one user from writing into another
-- user's folder.
CREATE POLICY chromadiet_photos_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chromadiet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ─── 1.3 UPDATE ─────────────────────────────────────────
-- Updates are rare (we typically just delete + re-upload) but the
-- policy is included for completeness.
CREATE POLICY chromadiet_photos_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'chromadiet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ─── 1.4 DELETE ─────────────────────────────────────────
-- A user can delete their own photos (used when they remove an
-- entry mid-form). Admins can delete any photo via /api/admin's
-- service-role key, which bypasses these policies entirely.
CREATE POLICY chromadiet_photos_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chromadiet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- =============================================================
-- 2. VERIFICATION
-- =============================================================

-- 2.1 Bucket exists and is private
SELECT 'bucket' AS check_type, id, public
FROM storage.buckets
WHERE id = 'chromadiet-photos';
-- Expected: 1 row, public = false.
-- If this returns 0 rows, create the bucket via the Dashboard
-- before continuing.

-- 2.2 All four policies exist
SELECT 'policy' AS check_type, policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'chromadiet_photos_%'
ORDER BY policyname;
-- Expected: 4 rows (read SELECT, insert INSERT, update UPDATE, delete DELETE).
