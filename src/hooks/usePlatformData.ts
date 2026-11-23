import { useCallback, useEffect, useState } from 'react';
import { CULTURAL_ARTICLES, INITIAL_TOURISM_SERVICES } from '../data/cultureData';
import { DIGITAL_MUSEUM_ARTIFACTS } from '../data/museumData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  AuditLogEntry,
  CulturalArticle,
  MuseumArtifact,
  SiteSettingsConfig,
  TourismServiceListing,
  VisitorReview,
} from '../types/tourism';
import { verifyAuthorizedAdminSession } from '../utils/adminAuth';
import {
  buildAuditLogEntry,
  createVisitorReview,
  DEFAULT_SITE_SETTINGS,
  moderateVisitorReview,
  normalizeSiteSettings,
  reportVisitorReview,
  validateNewsletterEmail,
} from '../utils/platformStore';

interface DbReviewRow {
  id: string;
  landmark_id: string;
  landmark_name_ar: string;
  author_name: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'hidden';
  reported_count: number;
  report_reasons?: string[] | null;
  created_at: string;
}

interface DbAuditRow {
  id: string;
  action_ar: string;
  entity_type: string;
  entity_id?: string | null;
  details_ar: string;
  created_at: string;
}

interface DbArticleRow {
  id: string;
  title_ar: string;
  subtitle_ar: string;
  category: CulturalArticle['category'];
  category_ar: string;
  read_time_minutes: number;
  image_url: string;
  excerpt_ar: string;
  body_paragraphs_ar: string[];
  regions_ar: string[];
  published_at: string;
  status: 'published' | 'draft';
}

interface DbServiceRow {
  id: string;
  name_ar: string;
  service_type: TourismServiceListing['service_type'];
  service_type_ar: string;
  governorate_id: string;
  governorate_ar: string;
  area_ar: string;
  description_ar: string;
  price_range_ar: string;
  phone?: string | null;
  whatsapp?: string | null;
  website_url?: string | null;
  image_url: string;
  verification_status: 'verified' | 'pending_verification';
  features_ar: string[];
}

function mapDbReview(row: DbReviewRow): VisitorReview {
  return {
    id: row.id,
    landmarkId: row.landmark_id,
    landmarkNameAr: row.landmark_name_ar,
    authorName: row.author_name,
    rating: Number(row.rating),
    comment: row.comment,
    status: row.status,
    reportedCount: Number(row.reported_count ?? 0),
    reportReasons: Array.isArray(row.report_reasons) ? row.report_reasons : [],
    createdAt: row.created_at,
  };
}

function mapDbAudit(row: DbAuditRow): AuditLogEntry {
  return {
    id: row.id,
    action_ar: row.action_ar,
    entity_type: row.entity_type,
    entity_id: row.entity_id ?? undefined,
    details_ar: row.details_ar,
    timestamp: row.created_at,
  };
}

function mapDbArticle(row: DbArticleRow): CulturalArticle {
  return {
    id: row.id,
    title_ar: row.title_ar,
    subtitle_ar: row.subtitle_ar,
    category: row.category,
    category_ar: row.category_ar,
    read_time_minutes: Number(row.read_time_minutes || 3),
    image_url: row.image_url,
    excerpt_ar: row.excerpt_ar,
    body_paragraphs_ar: Array.isArray(row.body_paragraphs_ar) ? row.body_paragraphs_ar : [],
    regions_ar: Array.isArray(row.regions_ar) ? row.regions_ar : [],
    published_at: row.published_at,
    status: row.status,
  };
}

function mapDbService(row: DbServiceRow): TourismServiceListing {
  return {
    id: row.id,
    name_ar: row.name_ar,
    service_type: row.service_type,
    service_type_ar: row.service_type_ar,
    governorate_id: row.governorate_id,
    governorate_ar: row.governorate_ar,
    area_ar: row.area_ar,
    description_ar: row.description_ar,
    price_range_ar: row.price_range_ar,
    phone: row.phone ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    website_url: row.website_url ?? undefined,
    image_url: row.image_url,
    verification_status: row.verification_status,
    features_ar: Array.isArray(row.features_ar) ? row.features_ar : [],
  };
}

export interface PlatformActionResult {
  ok: boolean;
  messageAr?: string;
  errorAr?: string;
}

/**
 * Manages database-backed persistence for visitor reviews, site settings,
 * admin audit logs, managed cultural/museum/service content, and newsletter
 * subscriptions. Enforces admin role checks on all privileged writes and relies
 * on Supabase Postgres RLS as the authoritative security boundary.
 */
export function usePlatformData(isAdmin: boolean) {
  const [siteSettings, setSiteSettings] = useState<SiteSettingsConfig>(DEFAULT_SITE_SETTINGS);
  const [reviews, setReviews] = useState<VisitorReview[]>([]);
  const [articles, setArticles] = useState<CulturalArticle[]>(CULTURAL_ARTICLES);
  const [artifacts, setArtifacts] = useState<MuseumArtifact[]>(DIGITAL_MUSEUM_ARTIFACTS);
  const [services, setServices] = useState<TourismServiceListing[]>(INITIAL_TOURISM_SERVICES);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const ensureAuthorizedAdmin = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured) return false;
    const verification = await verifyAuthorizedAdminSession(supabase.auth);
    return verification.authorized;
  }, []);

  const refreshPublicPlatformData = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    try {
      const [settingsRes, reviewsRes, articlesRes, artifactsRes, servicesRes] =
        await Promise.all([
          supabase.from('site_settings').select('settings').eq('id', 'default').maybeSingle(),
          supabase
            .from('visitor_reviews')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200),
          supabase
            .from('cultural_articles')
            .select('*')
            .order('published_at', { ascending: false }),
          supabase.from('museum_artifacts').select('payload'),
          supabase.from('tourism_services').select('*'),
        ]);

      if (!settingsRes.error && settingsRes.data?.settings) {
        setSiteSettings(
          normalizeSiteSettings(settingsRes.data.settings as Partial<SiteSettingsConfig>)
        );
      }

      if (!reviewsRes.error && Array.isArray(reviewsRes.data)) {
        setReviews((reviewsRes.data as DbReviewRow[]).map(mapDbReview));
      }

      if (!articlesRes.error && Array.isArray(articlesRes.data) && articlesRes.data.length > 0) {
        setArticles((articlesRes.data as DbArticleRow[]).map(mapDbArticle));
      }

      if (
        !artifactsRes.error &&
        Array.isArray(artifactsRes.data) &&
        artifactsRes.data.length > 0
      ) {
        const mapped = artifactsRes.data
          .map((row) => (row as { payload?: MuseumArtifact }).payload)
          .filter((item): item is MuseumArtifact => Boolean(item && item.id));
        if (mapped.length > 0) setArtifacts(mapped);
      }

      if (!servicesRes.error && Array.isArray(servicesRes.data) && servicesRes.data.length > 0) {
        setServices((servicesRes.data as DbServiceRow[]).map(mapDbService));
      }
    } catch {
      // Offline fallback keeps bundled read-only data intact
    }
  }, []);

  const refreshAdminAuditLogs = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) {
      setAuditLogs([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && Array.isArray(data)) {
        setAuditLogs((data as DbAuditRow[]).map(mapDbAudit));
      }
    } catch {
      // Keep current in-memory audit list if temporarily offline
    }
  }, [isAdmin]);

  useEffect(() => {
    void refreshPublicPlatformData();
  }, [refreshPublicPlatformData, isAdmin]);

  useEffect(() => {
    void refreshAdminAuditLogs();
  }, [refreshAdminAuditLogs]);

  const recordAudit = useCallback(
    async (action_ar: string, entity_type: string, details_ar: string, entity_id?: string) => {
      if (!(await ensureAuthorizedAdmin())) return;
      const entry = buildAuditLogEntry({ action_ar, entity_type, details_ar, entity_id });

      const { error } = await supabase.from('admin_audit_logs').insert({
        id: entry.id,
        action_ar: entry.action_ar,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id ?? null,
        details_ar: entry.details_ar,
        created_at: entry.timestamp,
      });

      if (!error) {
        setAuditLogs((prev) => [entry, ...prev].slice(0, 200));
      }
    },
    [ensureAuthorizedAdmin]
  );

  /**
   * Public visitor review submission.
   * Always submits with `status: 'pending'` so database RLS + moderation queue
   * require administrator approval before the review becomes publicly visible.
   */
  const submitReview = useCallback(
    async (params: {
      landmarkId: string;
      landmarkNameAr: string;
      authorName: string;
      rating: number;
      comment: string;
    }): Promise<PlatformActionResult> => {
      const built = createVisitorReview(params, reviews);
      if (!built.ok || !built.review) {
        return { ok: false, errorAr: built.errorAr ?? 'تعذر التحقق من بيانات المراجعة.' };
      }

      if (!isSupabaseConfigured) {
        return {
          ok: false,
          errorAr: 'خدمة إرسال المراجعات غير مفعّلة في هذه البيئة حالياً.',
        };
      }

      const review = built.review;
      const { error } = await supabase.from('visitor_reviews').insert({
        id: review.id,
        landmark_id: review.landmarkId,
        landmark_name_ar: review.landmarkNameAr,
        author_name: review.authorName,
        rating: review.rating,
        comment: review.comment,
        status: 'pending',
        reported_count: 0,
        report_reasons: [],
        created_at: review.createdAt,
      });

      if (error) {
        return {
          ok: false,
          errorAr: 'تعذر حفظ المراجعة في قاعدة البيانات حالياً. يُرجى المحاولة لاحقاً.',
        };
      }

      // Only add pending review to local list if current viewer is an admin;
      // public visitors never see unapproved reviews in the published list.
      if (isAdmin) {
        setReviews((prev) => [review, ...prev]);
      }

      return {
        ok: true,
        messageAr:
          'شكراً لمشاركتك! تم استلام مراجعتك بنجاح وستظهر للزوار بعد مراجعتها واعتمادها من قِبل الإدارة.',
      };
    },
    [isAdmin, reviews]
  );

  const reportReview = useCallback(async (reviewId: string, reason: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.rpc('report_visitor_review', {
      p_review_id: reviewId,
      p_reason: reason.trim() || 'محتوى غير ملائم',
    });
    if (!error) {
      setReviews((prev) => reportVisitorReview(reviewId, reason, prev));
    }
  }, []);

  const moderateReview = useCallback(
    async (
      reviewId: string,
      action: 'approve' | 'hide' | 'delete'
    ): Promise<PlatformActionResult> => {
      if (!(await ensureAuthorizedAdmin())) {
        return { ok: false, errorAr: 'هذا الإجراء متاح لحساب المدير المخوّل فقط.' };
      }

      if (action === 'delete') {
        const { error } = await supabase
          .from('visitor_reviews')
          .delete()
          .eq('id', reviewId);
        if (error) {
          return { ok: false, errorAr: 'تعذر حذف المراجعة من قاعدة البيانات.' };
        }
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        const nextStatus = action === 'approve' ? 'approved' : 'hidden';
        const updatePayload: Record<string, unknown> = {
          status: nextStatus,
          moderated_at: new Date().toISOString(),
          moderated_by: sessionData.session?.user?.id ?? null,
        };
        if (action === 'approve') {
          updatePayload.reported_count = 0;
        }
        const { error } = await supabase
          .from('visitor_reviews')
          .update(updatePayload)
          .eq('id', reviewId);
        if (error) {
          return { ok: false, errorAr: 'تعذر تحديث حالة المراجعة في قاعدة البيانات.' };
        }
      }

      setReviews((prev) => moderateVisitorReview(reviewId, action, prev));
      const labelMap = {
        approve: 'اعتماد مراجعة',
        hide: 'إخفاء مراجعة',
        delete: 'حذف مراجعة',
      };
      void recordAudit(labelMap[action], 'review', `تحديث حالة المراجعة (${reviewId})`, reviewId);
      return { ok: true, messageAr: 'تم تحديث حالة المراجعة بنجاح.' };
    },
    [ensureAuthorizedAdmin, recordAudit]
  );

  const updateSiteSettings = useCallback(
    async (next: SiteSettingsConfig): Promise<PlatformActionResult> => {
      if (!(await ensureAuthorizedAdmin())) {
        return { ok: false, errorAr: 'هذا الإجراء متاح لحساب المدير المخوّل فقط.' };
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const normalized = normalizeSiteSettings(next);

      const { error } = await supabase.from('site_settings').upsert(
        {
          id: 'default',
          settings: normalized,
          updated_at: new Date().toISOString(),
          updated_by: sessionData.session?.user?.id ?? null,
        },
        { onConflict: 'id' }
      );

      if (error) {
        return { ok: false, errorAr: 'تعذر حفظ إعدادات المنصة في قاعدة البيانات.' };
      }

      setSiteSettings(normalized);
      void recordAudit('تحديث إعدادات المنصة', 'settings', 'حفظ إعدادات الواجهة الرئيسية وSEO');
      return { ok: true, messageAr: 'تم حفظ إعدادات المنصة ونشرها بنجاح.' };
    },
    [ensureAuthorizedAdmin, recordAudit]
  );

  const saveArticles = useCallback(
    async (next: CulturalArticle[], logDetail: string): Promise<PlatformActionResult> => {
      if (!(await ensureAuthorizedAdmin())) {
        return { ok: false, errorAr: 'هذا الإجراء متاح لحساب المدير المخوّل فقط.' };
      }

      const payloads = next.map((article) => ({
        id: article.id,
        title_ar: article.title_ar,
        subtitle_ar: article.subtitle_ar,
        category: article.category,
        category_ar: article.category_ar,
        read_time_minutes: article.read_time_minutes,
        image_url: article.image_url,
        excerpt_ar: article.excerpt_ar,
        body_paragraphs_ar: article.body_paragraphs_ar,
        regions_ar: article.regions_ar,
        published_at: article.published_at,
        status: article.status,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('cultural_articles')
        .upsert(payloads, { onConflict: 'id' });

      if (error) {
        return { ok: false, errorAr: 'تعذر حفظ المقالات الثقافية في قاعدة البيانات.' };
      }

      setArticles(next);
      void recordAudit('إدارة محتوى عِش العراق', 'article', logDetail);
      return { ok: true, messageAr: 'تم حفظ المقالات بنجاح.' };
    },
    [ensureAuthorizedAdmin, recordAudit]
  );

  const saveServices = useCallback(
    async (next: TourismServiceListing[], logDetail: string): Promise<PlatformActionResult> => {
      if (!(await ensureAuthorizedAdmin())) {
        return { ok: false, errorAr: 'هذا الإجراء متاح لحساب المدير المخوّل فقط.' };
      }

      const payloads = next.map((svc) => ({
        id: svc.id,
        name_ar: svc.name_ar,
        service_type: svc.service_type,
        service_type_ar: svc.service_type_ar,
        governorate_id: svc.governorate_id,
        governorate_ar: svc.governorate_ar,
        area_ar: svc.area_ar,
        description_ar: svc.description_ar,
        price_range_ar: svc.price_range_ar,
        phone: svc.phone ?? null,
        whatsapp: svc.whatsapp ?? null,
        website_url: svc.website_url ?? null,
        image_url: svc.image_url,
        verification_status: svc.verification_status,
        features_ar: svc.features_ar,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('tourism_services')
        .upsert(payloads, { onConflict: 'id' });

      if (error) {
        return { ok: false, errorAr: 'تعذر حفظ الخدمات السياحية في قاعدة البيانات.' };
      }

      setServices(next);
      void recordAudit('إدارة الخدمات السياحية', 'service', logDetail);
      return { ok: true, messageAr: 'تم حفظ الخدمات بنجاح.' };
    },
    [ensureAuthorizedAdmin, recordAudit]
  );

  const restoreBackup = useCallback(
    async (snapshot: {
      settings: SiteSettingsConfig;
      reviews: VisitorReview[];
      articles: CulturalArticle[];
      artifacts: MuseumArtifact[];
      services: TourismServiceListing[];
    }): Promise<PlatformActionResult> => {
      if (!(await ensureAuthorizedAdmin())) {
        return { ok: false, errorAr: 'هذا الإجراء متاح لحساب المدير المخوّل فقط.' };
      }

      const settingsRes = await updateSiteSettings(snapshot.settings);
      if (!settingsRes.ok) return settingsRes;

      if (snapshot.articles.length > 0) {
        const articlesRes = await saveArticles(
          snapshot.articles,
          'استعادة مقالات عِش العراق من النسخة الاحتياطية'
        );
        if (!articlesRes.ok) return articlesRes;
      }

      if (snapshot.services.length > 0) {
        const servicesRes = await saveServices(
          snapshot.services,
          'استعادة الخدمات السياحية من النسخة الاحتياطية'
        );
        if (!servicesRes.ok) return servicesRes;
      }

      if (snapshot.artifacts.length > 0) {
        const { error: artErr } = await supabase.from('museum_artifacts').upsert(
          snapshot.artifacts.map((art) => ({
            id: art.id,
            payload: art,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'id' }
        );
        if (artErr) {
          return { ok: false, errorAr: 'تعذر استعادة مقتنيات المتحف إلى قاعدة البيانات.' };
        }
        setArtifacts(snapshot.artifacts);
      }

      void recordAudit(
        'استعادة نسخة احتياطية',
        'backup',
        'استعادة إعدادات ومحتوى المنصة إلى قاعدة البيانات'
      );
      return { ok: true, messageAr: 'تمت استعادة النسخة الاحتياطية إلى قاعدة البيانات بنجاح.' };
    },
    [ensureAuthorizedAdmin, recordAudit, saveArticles, saveServices, updateSiteSettings]
  );

  const subscribeNewsletter = useCallback(
    async (emailRaw: string): Promise<{ ok: boolean; messageAr: string }> => {
      const checked = validateNewsletterEmail(emailRaw);
      if (!checked.ok) {
        return { ok: false, messageAr: checked.messageAr ?? 'يرجى إدخال بريد إلكتروني صحيح.' };
      }

      if (!isSupabaseConfigured) {
        return {
          ok: false,
          messageAr: 'خدمة الاشتراك في النشرة غير مفعّلة في هذه البيئة حالياً.',
        };
      }

      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: checked.email });

      if (error) {
        if (error.code === '23505') {
          return {
            ok: true,
            messageAr: 'هذا البريد مسجل بالفعل في النشرة الثقافية.',
          };
        }
        return {
          ok: false,
          messageAr: 'تعذر تسجيل الاشتراك حالياً. يُرجى المحاولة لاحقاً.',
        };
      }

      return {
        ok: true,
        messageAr: 'تم تسجيل اشتراكك بنجاح في تحديثات أرض السواد.',
      };
    },
    []
  );

  return {
    siteSettings,
    reviews,
    articles,
    artifacts,
    services,
    auditLogs,
    refreshPublicPlatformData,
    recordAudit,
    submitReview,
    reportReview,
    moderateReview,
    updateSiteSettings,
    saveArticles,
    saveServices,
    restoreBackup,
    subscribeNewsletter,
  };
}
