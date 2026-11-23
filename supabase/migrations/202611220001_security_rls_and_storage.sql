-- ============================================================================
-- Ard Al-Sawad Iraq — Security Migration 0001
-- Role-Based Admin Authorization, Table RLS (`landmarks`, `governorates_content`),
-- and Storage Bucket Policies (`landmark-photos`)
--
-- Non-destructive & idempotent: preserves all existing tables, rows, and files.
-- ============================================================================

-- 1. Trusted Admin Role Verification Function
-- IMPORTANT:
--   - Inspects ONLY server-controlled JWT claims (`app_metadata` or top-level
--     custom claims signed by Supabase Auth / Custom Access Token Hook).
--   - NEVER trusts `user_metadata` (which users can self-modify via updateUser).
--   - NEVER treats every `authenticated` user as an admin.
CREATE OR REPLACE FUNCTION public.is_ard_alsawad_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'admin'
      OR coalesce((auth.jwt() -> 'app_metadata' -> 'roles') ? 'admin', false)
      OR lower(coalesce(auth.jwt() ->> 'app_role', '')) = 'admin'
      OR coalesce((auth.jwt() ->> 'is_admin')::boolean, false)
    );
$$;

REVOKE ALL ON FUNCTION public.is_ard_alsawad_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_ard_alsawad_admin() TO anon, authenticated;

-- 2. Ensure Core Tables Exist Without Dropping or Modifying Existing Data
CREATE TABLE IF NOT EXISTS public.landmarks (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  governorate_id text NOT NULL,
  governorate_ar text NOT NULL DEFAULT '',
  category text NOT NULL CHECK (category IN ('religious', 'archaeological', 'nature_tourism')),
  category_ar text NOT NULL DEFAULT '',
  era text NOT NULL DEFAULT '',
  coordinates jsonb NOT NULL DEFAULT '{"lat": null, "lng": null}'::jsonb,
  description_ar text NOT NULL DEFAULT '',
  historical_architectural_ar text,
  significance_ar text,
  dress_code_etiquette_ar text,
  accessibility_ar text,
  best_time_to_visit text NOT NULL DEFAULT '',
  visitor_tips text NOT NULL DEFAULT '',
  unesco_site boolean NOT NULL DEFAULT false,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  wikimedia_search_query text NOT NULL DEFAULT '',
  google_maps_url text NOT NULL DEFAULT '',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.governorates_content (
  governorate_id text PRIMARY KEY,
  nicknames_ar jsonb NOT NULL DEFAULT '[]'::jsonb,
  overview_ar text NOT NULL DEFAULT '',
  cultural_identity_ar text NOT NULL DEFAULT '',
  traditions_cuisine_ar text NOT NULL DEFAULT '',
  best_time_to_visit_ar text NOT NULL DEFAULT '',
  cover_image_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Strict Row Level Security on `public.landmarks`
ALTER TABLE public.landmarks ENABLE ROW LEVEL SECURITY;

-- Remove overly permissive legacy policies if present
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'landmarks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.landmarks', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY "landmarks_public_read"
  ON public.landmarks
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "landmarks_admin_insert"
  ON public.landmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "landmarks_admin_update"
  ON public.landmarks
  FOR UPDATE
  TO authenticated
  USING (public.is_ard_alsawad_admin())
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "landmarks_admin_delete"
  ON public.landmarks
  FOR DELETE
  TO authenticated
  USING (public.is_ard_alsawad_admin());

-- 4. Strict Row Level Security on `public.governorates_content`
ALTER TABLE public.governorates_content ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'governorates_content'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.governorates_content', pol.policyname);
  END LOOP;
END
$$;

CREATE POLICY "governorates_content_public_read"
  ON public.governorates_content
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "governorates_content_admin_insert"
  ON public.governorates_content
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "governorates_content_admin_update"
  ON public.governorates_content
  FOR UPDATE
  TO authenticated
  USING (public.is_ard_alsawad_admin())
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "governorates_content_admin_delete"
  ON public.governorates_content
  FOR DELETE
  TO authenticated
  USING (public.is_ard_alsawad_admin());

-- 5. Hardened Storage Bucket & RLS Policies for `landmark-photos`
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landmark-photos',
  'landmark-photos',
  true,
  5242880, -- 5 MB max per uploaded photo
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop any legacy permissive policies targeting landmark-photos
DROP POLICY IF EXISTS "Public read landmark photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload landmark photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update landmark photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete landmark photos" ON storage.objects;
DROP POLICY IF EXISTS "landmark_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "landmark_photos_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "landmark_photos_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "landmark_photos_admin_delete" ON storage.objects;

CREATE POLICY "landmark_photos_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'landmark-photos');

CREATE POLICY "landmark_photos_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'landmark-photos'
    AND public.is_ard_alsawad_admin()
    AND (storage.foldername(name))[1] IN ('landmarks', 'governorates')
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    AND position('..' in name) = 0
  );

CREATE POLICY "landmark_photos_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'landmark-photos'
    AND public.is_ard_alsawad_admin()
  )
  WITH CHECK (
    bucket_id = 'landmark-photos'
    AND public.is_ard_alsawad_admin()
    AND (storage.foldername(name))[1] IN ('landmarks', 'governorates')
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    AND position('..' in name) = 0
  );

CREATE POLICY "landmark_photos_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'landmark-photos'
    AND public.is_ard_alsawad_admin()
  );
