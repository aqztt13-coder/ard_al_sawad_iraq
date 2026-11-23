# Supabase Security & Deployment Configuration — Ard Al-Sawad

This guide documents the **required manual Supabase configuration steps** to activate the database-level Row Level Security (RLS), Storage bucket policies, and trusted admin role authorization for **Ard Al-Sawad**.

---

## 1. Apply the SQL Migrations (Non-Destructive)

Run the two migration files in order inside the **Supabase Dashboard → SQL Editor** (or via `supabase db push` if using the Supabase CLI):

1. `supabase/migrations/202611220001_security_rls_and_storage.sql`
   - Creates `public.is_ard_alsawad_admin()` checking trusted `app_metadata` / JWT claims only.
   - Enables strict RLS on `public.landmarks` and `public.governorates_content` (public read, admin-only write).
   - Configures the `landmark-photos` bucket (5 MB limit, JPEG/PNG/WebP only) and applies admin-only write/delete Storage policies.
2. `supabase/migrations/202611220002_platform_data_tables.sql`
   - Creates `public.visitor_reviews` with mandatory `pending` status on public inserts, public read restricted to `approved` reviews, and a controlled `report_visitor_review` RPC.
   - Creates `public.site_settings`, append-only `public.admin_audit_logs`, `public.cultural_articles`, `public.museum_artifacts`, `public.tourism_services`, and write-only `public.newsletter_subscribers` (protecting visitor emails from public reads).

All statements are idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE`) and preserve existing rows and uploaded files.

---

## 2. Disable Public User Sign-Ups in Supabase Auth

Public admin self-registration has been removed from the frontend, and must also be disabled at the Supabase Auth layer:

1. Open **Supabase Dashboard → Authentication → Providers → Email**.
2. Disable **Allow new users to sign up** (or **Authentication → Settings → User Signups → Disable**).
3. Create administrator accounts exclusively from **Supabase Dashboard → Authentication → Users → Add User** (or via a secure server-side Admin API script).

---

## 3. Assign the Trusted `admin` Role via `app_metadata`

Never assign roles inside `user_metadata` (because users can modify their own `user_metadata`). Assign the role inside `raw_app_meta_data` using the Supabase SQL Editor (running as `postgres` / service role):

```sql
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'your-authorized-admin@example.com';
```

After updating `raw_app_meta_data`, the administrator must **sign out and sign back in** so Supabase issues a fresh JWT containing `"app_metadata": { "role": "admin" }`.

> **Optional (Custom Access Token Hook):** `public.is_ard_alsawad_admin()` also supports top-level JWT claims `"app_role": "admin"` or `"is_admin": true`, or `"app_metadata": { "roles": ["admin"] }`, if you prefer using a Supabase Auth Custom Access Token Hook.

---

## 4. Configure Frontend Environment Variables

Set the following public client environment variables in your deployment platform (or local `.env` — never commit `.env` to Git):

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-supabase-publishable-or-anon-key>"
```

- **Never** place `SUPABASE_SERVICE_ROLE_KEY` or database passwords in frontend code, `.env.example`, or any `VITE_*` variable.
- If a previously hardcoded publishable key was exposed in repository history and you want a clean slate, rotate keys in **Supabase Dashboard → Project Settings → API Keys**.
