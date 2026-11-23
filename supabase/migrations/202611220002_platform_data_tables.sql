-- ============================================================================
-- Ard Al-Sawad Iraq — Security Migration 0002
-- Database Persistence & Strict RLS for Platform Data:
--   - visitor_reviews (pre-publication moderation enforced at DB level)
--   - site_settings (singleton admin-managed platform settings)
--   - admin_audit_logs (append-only admin audit trail)
--   - cultural_articles, museum_artifacts, tourism_services
--   - newsletter_subscribers (write-only for public, admin-only reads)
--
-- Non-destructive & idempotent. Requires 202611220001_security_rls_and_storage.sql.
-- ============================================================================

-- 1. Visitor Reviews (Moderation Required Before Publication)
CREATE TABLE IF NOT EXISTS public.visitor_reviews (
  id text PRIMARY KEY,
  landmark_id text NOT NULL,
  landmark_name_ar text NOT NULL,
  author_name text NOT NULL CHECK (char_length(trim(author_name)) BETWEEN 2 AND 60),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (char_length(trim(comment)) BETWEEN 8 AND 800),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
  reported_count integer NOT NULL DEFAULT 0 CHECK (reported_count >= 0),
  report_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  moderated_at timestamptz,
  moderated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_visitor_reviews_landmark_status
  ON public.visitor_reviews (landmark_id, status, created_at DESC);

ALTER TABLE public.visitor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visitor_reviews_read_approved_or_admin" ON public.visitor_reviews;
DROP POLICY IF EXISTS "visitor_reviews_public_insert_pending_only" ON public.visitor_reviews;
DROP POLICY IF EXISTS "visitor_reviews_admin_update" ON public.visitor_reviews;
DROP POLICY IF EXISTS "visitor_reviews_admin_delete" ON public.visitor_reviews;

-- Public visitors can ONLY read approved reviews; admins can read all (including pending/hidden)
CREATE POLICY "visitor_reviews_read_approved_or_admin"
  ON public.visitor_reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved' OR public.is_ard_alsawad_admin());

-- Public visitors can ONLY submit pending reviews (cannot self-approve or forge moderation fields)
CREATE POLICY "visitor_reviews_public_insert_pending_only"
  ON public.visitor_reviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND reported_count = 0
    AND report_reasons = '[]'::jsonb
    AND moderated_at IS NULL
    AND moderated_by IS NULL
  );

-- Only authorized admins can approve, hide, or update reviews
CREATE POLICY "visitor_reviews_admin_update"
  ON public.visitor_reviews
  FOR UPDATE
  TO authenticated
  USING (public.is_ard_alsawad_admin())
  WITH CHECK (public.is_ard_alsawad_admin());

-- Only authorized admins can delete reviews
CREATE POLICY "visitor_reviews_admin_delete"
  ON public.visitor_reviews
  FOR DELETE
  TO authenticated
  USING (public.is_ard_alsawad_admin());

-- Safe controlled RPC for visitors to report an approved review without exposing UPDATE permission
CREATE OR REPLACE FUNCTION public.report_visitor_review(
  p_review_id text,
  p_reason text DEFAULT 'محتوى غير ملائم'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_reason text;
  v_updated integer;
BEGIN
  v_clean_reason := left(coalesce(nullif(trim(p_reason), ''), 'محتوى غير ملائم'), 200);

  UPDATE public.visitor_reviews
  SET
    reported_count = reported_count + 1,
    report_reasons = CASE
      WHEN jsonb_array_length(report_reasons) < 50
      THEN report_reasons || to_jsonb(v_clean_reason)
      ELSE report_reasons
    END
  WHERE id = p_review_id
    AND status = 'approved';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END
$$;

REVOKE ALL ON FUNCTION public.report_visitor_review(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_visitor_review(text, text) TO anon, authenticated;

-- 2. Site Settings (Singleton Row, Public Read, Admin Write)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  settings jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_insert" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_delete" ON public.site_settings;

CREATE POLICY "site_settings_public_read"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "site_settings_admin_insert"
  ON public.site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "site_settings_admin_update"
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_ard_alsawad_admin())
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "site_settings_admin_delete"
  ON public.site_settings
  FOR DELETE
  TO authenticated
  USING (public.is_ard_alsawad_admin());

-- 3. Admin Audit Logs (Append-Only, Admin Read & Insert Only — No Update/Delete)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id text PRIMARY KEY,
  action_ar text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details_ar text NOT NULL,
  actor_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON public.admin_audit_logs (created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_logs_admin_read" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "admin_audit_logs_admin_insert" ON public.admin_audit_logs;

CREATE POLICY "admin_audit_logs_admin_read"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_ard_alsawad_admin());

CREATE POLICY "admin_audit_logs_admin_insert"
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_ard_alsawad_admin()
    AND (actor_id IS NULL OR actor_id = auth.uid())
  );

-- 4. Admin-Managed Content: Cultural Articles ("Live Iraq")
CREATE TABLE IF NOT EXISTS public.cultural_articles (
  id text PRIMARY KEY,
  title_ar text NOT NULL,
  subtitle_ar text NOT NULL DEFAULT '',
  category text NOT NULL,
  category_ar text NOT NULL DEFAULT '',
  read_time_minutes integer NOT NULL DEFAULT 3 CHECK (read_time_minutes BETWEEN 1 AND 60),
  image_url text NOT NULL DEFAULT '',
  excerpt_ar text NOT NULL DEFAULT '',
  body_paragraphs_ar jsonb NOT NULL DEFAULT '[]'::jsonb,
  regions_ar jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_at text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cultural_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cultural_articles_public_read" ON public.cultural_articles;
DROP POLICY IF EXISTS "cultural_articles_admin_insert" ON public.cultural_articles;
DROP POLICY IF EXISTS "cultural_articles_admin_update" ON public.cultural_articles;
DROP POLICY IF EXISTS "cultural_articles_admin_delete" ON public.cultural_articles;

CREATE POLICY "cultural_articles_public_read"
  ON public.cultural_articles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR public.is_ard_alsawad_admin());

CREATE POLICY "cultural_articles_admin_insert"
  ON public.cultural_articles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "cultural_articles_admin_update"
  ON public.cultural_articles
  FOR UPDATE
  TO authenticated
  USING (public.is_ard_alsawad_admin())
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "cultural_articles_admin_delete"
  ON public.cultural_articles
  FOR DELETE
  TO authenticated
  USING (public.is_ard_alsawad_admin());

-- 5. Admin-Managed Content: Museum Artifacts
CREATE TABLE IF NOT EXISTS public.museum_artifacts (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.museum_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "museum_artifacts_public_read" ON public.museum_artifacts;
DROP POLICY IF EXISTS "museum_artifacts_admin_insert" ON public.museum_artifacts;
DROP POLICY IF EXISTS "museum_artifacts_admin_update" ON public.museum_artifacts;
DROP POLICY IF EXISTS "museum_artifacts_admin_delete" ON public.museum_artifacts;

CREATE POLICY "museum_artifacts_public_read"
  ON public.museum_artifacts
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "museum_artifacts_admin_insert"
  ON public.museum_artifacts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "museum_artifacts_admin_update"
  ON public.museum_artifacts
  FOR UPDATE
  TO authenticated
  USING (public.is_ard_alsawad_admin())
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "museum_artifacts_admin_delete"
  ON public.museum_artifacts
  FOR DELETE
  TO authenticated
  USING (public.is_ard_alsawad_admin());

-- 6. Admin-Managed Content: Tourism Services Directory
CREATE TABLE IF NOT EXISTS public.tourism_services (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('accommodation', 'restaurant', 'guide_transport')),
  service_type_ar text NOT NULL DEFAULT '',
  governorate_id text NOT NULL,
  governorate_ar text NOT NULL DEFAULT '',
  area_ar text NOT NULL DEFAULT '',
  description_ar text NOT NULL DEFAULT '',
  price_range_ar text NOT NULL DEFAULT 'غير متوفر حالياً',
  phone text,
  whatsapp text,
  website_url text,
  image_url text NOT NULL DEFAULT '',
  verification_status text NOT NULL DEFAULT 'pending_verification'
    CHECK (verification_status IN ('verified', 'pending_verification')),
  features_ar jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tourism_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tourism_services_public_read" ON public.tourism_services;
DROP POLICY IF EXISTS "tourism_services_admin_insert" ON public.tourism_services;
DROP POLICY IF EXISTS "tourism_services_admin_update" ON public.tourism_services;
DROP POLICY IF EXISTS "tourism_services_admin_delete" ON public.tourism_services;

CREATE POLICY "tourism_services_public_read"
  ON public.tourism_services
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "tourism_services_admin_insert"
  ON public.tourism_services
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "tourism_services_admin_update"
  ON public.tourism_services
  FOR UPDATE
  TO authenticated
  USING (public.is_ard_alsawad_admin())
  WITH CHECK (public.is_ard_alsawad_admin());

CREATE POLICY "tourism_services_admin_delete"
  ON public.tourism_services
  FOR DELETE
  TO authenticated
  USING (public.is_ard_alsawad_admin());

-- 7. Newsletter Subscribers (Public Insert Only; Admin-Only Read/Delete to Protect Email PII)
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  email text PRIMARY KEY CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  subscribed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_public_insert" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_admin_read" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_admin_delete" ON public.newsletter_subscribers;

CREATE POLICY "newsletter_public_insert"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$');

CREATE POLICY "newsletter_admin_read"
  ON public.newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (public.is_ard_alsawad_admin());

CREATE POLICY "newsletter_admin_delete"
  ON public.newsletter_subscribers
  FOR DELETE
  TO authenticated
  USING (public.is_ard_alsawad_admin());
