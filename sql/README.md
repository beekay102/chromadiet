# ChromaDiet — Database Setup

Everything needed to provision a Supabase project for ChromaDiet from scratch.

## Files in this folder

| File | What it does | Run order |
|---|---|---|
| `01_schema.sql` | Tables, RLS policies, signup trigger, my_recall_history view | First (setup) |
| `02_storage.sql` | Storage bucket policies (bucket itself created via Dashboard) | Second (setup) |
| `99_teardown.sql` | Drops everything 01 and 02 created. Use only for full reset. | Only when resetting |

The `01` and `02` scripts are **idempotent** — safe to re-run if you tweak something. The `99_teardown.sql` is destructive — see the "Resetting / tearing down" section below before running.

The legacy `05_clean_slate_wipe_recalls.sql` and `06_seed_demo_recalls.sql` files (if you have them) are no longer needed. The Admin tab in the running application performs both the wipe and the demo re-seed via `/api/admin`.

---

## Complete fresh-deploy walkthrough

If you're setting up a brand-new ChromaDiet instance — new Supabase project, new Vercel project — follow this whole sequence.

### Step 1: Create the Supabase project

1. Go to https://supabase.com/dashboard, sign in, click **New Project**
2. Pick an org, name the project (e.g., `chromadiet-prod`), pick a region close to your participants, set a strong database password
3. Wait ~2 minutes for provisioning to complete

### Step 2: Run `01_schema.sql`

1. Open the project → **SQL Editor** → **New Query**
2. Paste the entire contents of `01_schema.sql`
3. Click **Run** (Ctrl+Enter)
4. Scroll to the bottom — the verification queries should show:
   - 4 tables created
   - All 4 tables with `rowsecurity = true`
   - Policy counts: participants 3, recall_sessions 4, food_entries 4, recall_results 1
   - Trigger `on_auth_user_created` exists
   - View `my_recall_history` exists with `reloptions` containing `security_invoker=on`
5. If any verification query returns zero rows, scroll up in the output to find the error and fix before continuing.

### Step 3: Create the storage bucket via the Dashboard

The Supabase API doesn't allow bucket creation via SQL. This is one click:

1. **Dashboard → Storage → New Bucket**
2. Name: `chromadiet-photos`
3. **Public bucket: OFF** (this is critical — photos contain PII)
4. File size limit: `50 MB` (the application compresses anything over 10 MB before upload, but 50 MB gives some headroom)
5. Click **Create**

### Step 4: Run `02_storage.sql`

1. **SQL Editor → New Query**
2. Paste the entire contents of `02_storage.sql`
3. Click **Run**
4. Verification at the bottom should show:
   - 1 bucket row with `public = false`
   - 4 policy rows: `chromadiet_photos_delete`, `chromadiet_photos_insert`, `chromadiet_photos_read`, `chromadiet_photos_update`

### Step 5: Configure auth in the Supabase Dashboard

The application uses email + password auth.

1. **Authentication → Sign In / Providers** → confirm Email is enabled
2. **Authentication → Sign In / Providers → Email** → adjust to taste:
   - Enable email signup: ON
   - Confirm email: typically **OFF** for research studies (so participants get into the app immediately) but **ON** if your IRB requires email verification
   - Secure email change: ON
3. **Authentication → URL Configuration** → set:
   - Site URL: your production URL (e.g., `https://chromadiet.vercel.app`)
   - Redirect URLs: include both `http://localhost:3000` (for local dev) and your production URL — these are the URLs the password-reset email will redirect to

### Step 6: Grab the API keys

You need three keys for the application's environment variables.

**Dashboard → Project Settings → API:**

| What you need | Where to copy from | Used by |
|---|---|---|
| Project URL | "Project URL" field | Frontend + serverless functions |
| `anon` key | "Project API keys → anon public" | Frontend (RLS-bound queries) |
| `service_role` key | "Project API keys → service_role" + click reveal | Serverless functions only — NEVER goes to the browser |

The `service_role` key bypasses RLS and can do anything. Treat it like a database password.

### Step 7: Set up your first admin account

The application doesn't have a "first admin" workflow — every signup creates a participant with `role='participant'`. To get an admin account:

1. Sign up through the application UI normally with your real email
2. **Dashboard → SQL Editor → New Query**:
   ```sql
   UPDATE public.participants
   SET role = 'admin'
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOU@example.com');
   ```
3. Sign out and sign back in (so the JWT picks up the new role)

You should now see the **Admin** tab in the navigation. From there you can re-seed demo accounts and wipe data when needed.

### Step 8: Create demo accounts (optional)

If you want the Admin tab's "Re-seed demos" button to work, create the two demo accounts via the **Authentication → Users → Add User** screen:

| Email | Password | Notes |
|---|---|---|
| `demo-alice@chromadiet.app` | (your choice) | Will receive 3 high-variety demo recalls |
| `demo-bob@chromadiet.app`   | (your choice) | Will receive 3 gappy demo recalls |

Then mark them as demo participants:

```sql
UPDATE public.participants
SET is_demo = TRUE,
    cohort_code = 'DEMO',
    age_range = '30-39',
    sex = 'female'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo-alice@chromadiet.app');

UPDATE public.participants
SET is_demo = TRUE,
    cohort_code = 'DEMO',
    age_range = '50-59',
    sex = 'male'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo-bob@chromadiet.app');
```

Now in the Admin tab, click **Re-seed demos** — both accounts get populated with 3 days of recall data each, scores pre-computed.

### Step 9: Configure environment variables

Both for local dev and for Vercel. The app needs four environment variables:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...                         # the anon key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...                      # NO VITE_ prefix
ANTHROPIC_API_KEY=sk-ant-api03-...                        # your Anthropic key
```

**For local dev:** put these in `.env.local` at the project root. This file MUST be gitignored (it already is in the default `.gitignore`).

**For Vercel:** Dashboard → Project → Settings → Environment Variables → add each one. Mark `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` as **Sensitive** so they're encrypted at rest.

The `VITE_` prefix is significant: it tells Vite to bake the variable into the browser bundle. The two keys WITHOUT the prefix (`SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY`) are server-only and must never reach the browser. Don't add `VITE_` to either of them.

### Step 10: Verify the application end-to-end

Run `vercel dev` locally (or push to Vercel and open the production URL):

1. Sign up a new test participant → should land on the home page with the Log Intake tab
2. Click Submit to Cohort with the default 5 entries → should see "Submitted" within a few seconds
3. Switch to My History → row appears with score = 69
4. Sign in as your admin account → Admin tab visible
5. Click **Re-seed demos** (if you set up Alice and Bob) → success message with scores 95/95/87 for Alice, 16/33/19 for Bob
6. Switch to Cohort View → averages and bar charts populate

If all six work, the deployment is fully functional.

---

## Resetting / tearing down the database

Sometimes you need to wipe the schema and start over — for example:

- **Switching to a fresh Supabase project** for a new study, with the old project to be archived
- **Iterating on schema design** during early development (smaller migrations get messy)
- **Recovering from a corrupted state** where you'd rather rebuild from scratch than diagnose
- **Decommissioning** a study after data has been exported and archived

`99_teardown.sql` drops everything that `01_schema.sql` and `02_storage.sql` created. After running it, the project's `public` schema is empty — but `auth.users` (signed-up accounts) and any data in `storage.buckets` are preserved.

### Step 1: Decide what you actually need to reset

Three increasingly destructive options. Pick the least-destructive one that solves your problem:

| Goal | What to do |
|---|---|
| Just clear the data — keep schema intact | Use the **Admin tab → Wipe all recalls** in the running app. Same effect, much less work. |
| Reset schema but keep accounts and bucket | Run `99_teardown.sql`, then re-run `01_schema.sql` and `02_storage.sql`. Existing auth users will sign in again normally and a fresh participants row will be created for each on first sign-in. |
| Completely fresh start including accounts and bucket | Run `99_teardown.sql`, then manually delete users (Auth → Users → select all → delete) and bucket (Storage → bucket settings → delete), then run setup from scratch. |

The **Admin tab → Wipe** is the right answer for routine "I want to clear demo data." Only reach for `99_teardown.sql` when the schema itself is the problem.

### Step 2: Take a backup if anything matters

If you have any real data in the project, take a backup first:

- **Dashboard → Database → Backups → Create backup** — creates a point-in-time snapshot you can restore from later. Free tier has limited retention; paid plans keep them longer.
- For a tighter export, use the **Database → Backup → Download backup** option to pull a `.sql` dump to your laptop.
- For just the application data without the schema, use the SQL Editor to `COPY` each table to CSV.

### Step 3: Empty the storage bucket first

Storage cleanup is a separate concern from the schema teardown — Supabase blocks direct `DELETE FROM storage.objects`, so the SQL teardown can't touch photos. Two options:

**Option A — use the Admin tab.** If the application is still running and you have admin access, click **Admin → Wipe all recalls** before running the teardown. This deletes both the database rows AND the storage objects in one call. Then run `99_teardown.sql` to drop the schema.

**Option B — manual via Dashboard.** Storage → `chromadiet-photos` → select all folders → Delete. Then run `99_teardown.sql`.

If you don't empty the bucket first, the storage objects become orphaned (no `food_entries` row references them) but they remain in the bucket consuming storage quota. They're not a security risk because the storage policies are dropped along with the schema, but they're wasted bytes.

### Step 4: Run the row-count check at the top of `99_teardown.sql`

Open Supabase Dashboard → SQL Editor → New Query → paste only this from the top of the teardown script:

```sql
SELECT
  (SELECT COUNT(*) FROM public.participants)     AS participants,
  (SELECT COUNT(*) FROM public.recall_sessions)  AS recall_sessions,
  (SELECT COUNT(*) FROM public.food_entries)     AS food_entries,
  (SELECT COUNT(*) FROM public.recall_results)   AS recall_results,
  (SELECT COUNT(*) FROM auth.users)              AS auth_users_KEPT;
```

Confirm the numbers match your expectation. If `participants = 47` but you thought you were tearing down a fresh project, **stop** — you're about to destroy 47 rows of real data. If they're zero or close to it, proceed.

### Step 5: Run the full teardown script

SQL Editor → paste the entire `99_teardown.sql` → Run. Should complete in a few seconds. The verification queries at the bottom should all return zero rows except the last (`auth_users_preserved`), which confirms accounts weren't touched.

### Step 6: Optional — delete the storage bucket

If you want to remove the chromadiet-photos bucket entirely (e.g., decommissioning the study):

- Dashboard → Storage → click `chromadiet-photos` → Settings (gear icon) → **Delete bucket**
- Confirms with the bucket name
- Bucket and any remaining objects are gone

If you're going to re-run `01_schema.sql` and `02_storage.sql` to rebuild, **leave the bucket alone** — re-creating it is a manual Dashboard step you'd just have to repeat.

### Step 7: Optional — delete auth users

If you want to wipe sign-in accounts too:

- Dashboard → Authentication → Users → bulk-select via the checkboxes → Delete

Or via SQL (admin context only):

```sql
-- WARNING: deletes all sign-in accounts. Cascades to public.participants
-- via the foreign key, but participants is already dropped if you ran
-- 99_teardown.sql first, so the cascade is a no-op.
DELETE FROM auth.users;
```

After this you're back to a completely empty project — same state as right after `Step 1: Create the Supabase project` above.

### Step 8: Rebuild (if rebuilding)

If you're tearing down to start over rather than to decommission:

1. Run `01_schema.sql` again — recreates tables, policies, trigger, view
2. Run `02_storage.sql` again — recreates storage policies (assumes bucket still exists; if you deleted it in Step 6, recreate it via Dashboard first)
3. Re-create your admin account (Step 7 of the setup walkthrough above)
4. Re-create demo accounts if needed (Step 8 of setup)
5. Re-seed demos via the Admin tab in the running app

The whole rebuild typically takes 5 minutes once you've done it once.

---

## What's NOT in these scripts

- **No seed data.** Demo accounts and demo recalls are managed entirely from the Admin tab in the running application. If you want to bootstrap a study with synthetic data, do it via the app, not via SQL.
- **No food database.** The 40-food reference list (FOOD_DB) and the science constants (NHANES_MEAN, COLOR_CATEGORIES, CUT_POINTS) live in `src/lib/foodDb.js` as JavaScript constants. They're shipped in the application bundle, not stored in PostgreSQL.
- **No backup/migration tooling.** Supabase has its own backup options (Dashboard → Database → Backups). For point-in-time recovery on production studies, enable PITR in your Supabase plan.

---

## Updating an existing deployment

If you change `01_schema.sql` (e.g., adding a column) and want to apply it to an existing project:

- The script is idempotent for additions but does not handle removals or type changes. Adding a new column or new policy is safe; renaming or dropping is not.
- For non-additive schema changes, write a small migration script that does the specific change (e.g., `ALTER TABLE ... DROP COLUMN ...`) and run it once. Then update `01_schema.sql` to reflect the new authoritative state.
- Always test schema migrations on a separate Supabase project (a "staging" project) before running them on production.

---

## Troubleshooting

**"new row violates row-level security policy" when submitting a recall**
The `recall_sessions` insert is being blocked. Check that `recall_sessions_insert_own` policy exists with `auth.uid() = user_id`. Also confirm the client is passing the user's JWT in the request — sometimes auth state gets out of sync; signing out and back in fixes it.

**"Demo account demo-alice@chromadiet.app not found" from the Re-seed button**
The auth.users row doesn't exist. Create the demo accounts via the Authentication dashboard (Step 8 above).

**Cohort View shows mean score 0.0 even though I have submissions**
This was a bug we fixed during development — it should never happen now. If it does, check that `recall_results` rows actually exist for those sessions (`SELECT count(*) FROM recall_results;`). If they don't, your `/api/finalize` endpoint isn't running. Check the Vercel function logs for errors, most commonly a missing `SUPABASE_SERVICE_ROLE_KEY` env var.

**My History shows scores as `—`**
Same root cause as the previous issue — `recall_results` is empty for those sessions. Either `/api/finalize` is failing, or you're looking at recalls that predate the Step 4 deployment. The Admin tab → Re-seed demos action will populate scored recalls from scratch.

**View `my_recall_history` returns rows from other users when I'm a participant**
The view doesn't have `security_invoker = on` set. Re-run the relevant section of `01_schema.sql`, or directly:
```sql
ALTER VIEW public.my_recall_history SET (security_invoker = on);
```
