import {
  AuditLogEntry,
  CulturalArticle,
  Governorate,
  Landmark,
  LandmarkCategory,
  MuseumArtifact,
  PlatformAnalytics,
  SiteSettingsConfig,
  TourismServiceListing,
  VisitorReview,
} from '../types/tourism';
import { normalizeArabic } from './arabicSearch';

const STORAGE_KEYS = {
  reviews: 'ard_alsawad_visitor_reviews_v1',
  reviewRateLimit: 'ard_alsawad_review_last_submit_v1',
  settings: 'ard_alsawad_site_settings_v1',
  analytics: 'ard_alsawad_analytics_v1',
  auditLogs: 'ard_alsawad_audit_logs_v1',
  newsletter: 'ard_alsawad_newsletter_v1',
  customArticles: 'ard_alsawad_custom_articles_v1',
  customArtifacts: 'ard_alsawad_custom_artifacts_v1',
  customServices: 'ard_alsawad_custom_services_v1',
} as const;

export const DEFAULT_SITE_SETTINGS: SiteSettingsConfig = {
  siteTitleAr: 'أرض السواد — المنصة الوطنية للسياحة والتراث العراقي',
  heroHeadlineAr: 'اكتشف العراق... أرض الحضارات',
  heroSubtitleAr:
    'الدليل الرقمي الشامل للمعالم الأثرية والعتبات المقدسة والأهوار والمتحف الرقمي عبر محافظات العراق الثماني عشرة.',
  metaDescriptionAr:
    'أرض السواد — المنصة السياحية والتراثية الشاملة لاكتشاف المعالم الأثرية والدينية والطبيعية والمتحف الرقمي في العراق.',
  homepageSections: {
    featuredDestinations: true,
    governoratesGrid: true,
    archaeologicalHighlights: true,
    religiousLandmarks: true,
    marshlandsNature: true,
    recommendedItineraries: true,
    museumHighlights: true,
    culturalExperiences: true,
    seasonalRecommendations: true,
    latestStories: true,
    nationalInitiatives: true,
    newsletterSignup: true,
  },
};

export const EMPTY_ANALYTICS: PlatformAnalytics = {
  destinationViews: {},
  governorateViews: {},
  artifactViews: {},
  searchTerms: {},
  itinerarySavesCount: 0,
  newsletterSubscribersCount: 0,
};

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

/* ===========================
 * Site Settings & Homepage Config
 * =========================== */
export function loadSiteSettings(): SiteSettingsConfig {
  const saved = safeReadJson<Partial<SiteSettingsConfig>>(STORAGE_KEYS.settings, {});
  return {
    ...DEFAULT_SITE_SETTINGS,
    ...saved,
    homepageSections: {
      ...DEFAULT_SITE_SETTINGS.homepageSections,
      ...(saved.homepageSections ?? {}),
    },
  };
}

export function saveSiteSettings(settings: SiteSettingsConfig): void {
  safeWriteJson(STORAGE_KEYS.settings, settings);
}

/* ===========================
 * Visitor Reviews (Zero fabricated reviews)
 * =========================== */
export const REVIEW_RATE_LIMIT_MS = 30_000;

export function loadVisitorReviews(): VisitorReview[] {
  const loaded = safeReadJson<VisitorReview[]>(STORAGE_KEYS.reviews, []);
  return Array.isArray(loaded) ? loaded : [];
}

export function saveVisitorReviews(reviews: VisitorReview[]): void {
  safeWriteJson(STORAGE_KEYS.reviews, reviews);
}

export function validateReviewInput(input: {
  authorName: string;
  rating: number;
  comment: string;
}): { ok: boolean; errorAr?: string } {
  const name = input.authorName.trim();
  const comment = input.comment.trim();
  if (name.length < 2 || name.length > 60) {
    return { ok: false, errorAr: 'يرجى كتابة الاسم (من حرفين إلى 60 حرفاً).' };
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, errorAr: 'يرجى اختيار تقييم بين 1 و 5 نجوم.' };
  }
  if (comment.length < 8 || comment.length > 800) {
    return {
      ok: false,
      errorAr: 'يرجى كتابة تعليق مفيد لا يقل عن 8 أحرف ولا يتجاوز 800 حرف.',
    };
  }
  if (/<script|javascript:|onerror=/i.test(comment) || /<script/i.test(name)) {
    return { ok: false, errorAr: 'النص يحتوي على رموز غير مسموح بها.' };
  }
  return { ok: true };
}

export function createVisitorReview(
  params: {
    landmarkId: string;
    landmarkNameAr: string;
    authorName: string;
    rating: number;
    comment: string;
  },
  existingReviews: VisitorReview[],
  nowMs: number = Date.now(),
  lastSubmitMs?: number
): { ok: boolean; errorAr?: string; review?: VisitorReview; reviews: VisitorReview[] } {
  const validation = validateReviewInput(params);
  if (!validation.ok) {
    return { ok: false, errorAr: validation.errorAr, reviews: existingReviews };
  }

  const effectiveLast =
    typeof lastSubmitMs === 'number'
      ? lastSubmitMs
      : safeReadJson<number>(STORAGE_KEYS.reviewRateLimit, 0);

  if (effectiveLast > 0 && nowMs - effectiveLast < REVIEW_RATE_LIMIT_MS) {
    const remainingSec = Math.ceil((REVIEW_RATE_LIMIT_MS - (nowMs - effectiveLast)) / 1000);
    return {
      ok: false,
      errorAr: `يرجى الانتظار ${remainingSec} ثانية قبل إرسال مراجعة جديدة للحماية من التكرار.`,
      reviews: existingReviews,
    };
  }

  const review: VisitorReview = {
    id: `rev-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
    landmarkId: params.landmarkId,
    landmarkNameAr: params.landmarkNameAr,
    authorName: params.authorName.trim(),
    rating: params.rating,
    comment: params.comment.trim(),
    createdAt: new Date(nowMs).toISOString(),
    status: 'approved',
    reportedCount: 0,
    reportReasons: [],
  };

  safeWriteJson(STORAGE_KEYS.reviewRateLimit, nowMs);
  const next = [review, ...existingReviews];
  saveVisitorReviews(next);
  return { ok: true, review, reviews: next };
}

export function reportVisitorReview(
  reviewId: string,
  reason: string,
  reviews: VisitorReview[]
): VisitorReview[] {
  const next = reviews.map((rev) =>
    rev.id === reviewId
      ? {
          ...rev,
          reportedCount: rev.reportedCount + 1,
          reportReasons: [...(rev.reportReasons ?? []), reason.trim() || 'محتوى غير ملائم'],
        }
      : rev
  );
  saveVisitorReviews(next);
  return next;
}

export function moderateVisitorReview(
  reviewId: string,
  action: 'approve' | 'hide' | 'delete',
  reviews: VisitorReview[]
): VisitorReview[] {
  const next =
    action === 'delete'
      ? reviews.filter((r) => r.id !== reviewId)
      : reviews.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                status: action === 'approve' ? ('approved' as const) : ('hidden' as const),
                reportedCount: action === 'approve' ? 0 : r.reportedCount,
              }
            : r
        );
  saveVisitorReviews(next);
  return next;
}

export function computeLandmarkRatingSummary(
  landmarkId: string,
  reviews: VisitorReview[]
): { average: number | null; count: number; visibleReviews: VisitorReview[] } {
  const visibleReviews = reviews.filter(
    (r) => r.landmarkId === landmarkId && r.status === 'approved'
  );
  if (visibleReviews.length === 0) {
    return { average: null, count: 0, visibleReviews: [] };
  }
  const sum = visibleReviews.reduce((acc, r) => acc + r.rating, 0);
  return {
    average: Math.round((sum / visibleReviews.length) * 10) / 10,
    count: visibleReviews.length,
    visibleReviews,
  };
}

/* ===========================
 * Real Platform Analytics & Audit Trail
 * =========================== */
export function loadAnalytics(): PlatformAnalytics {
  const saved = safeReadJson<Partial<PlatformAnalytics>>(STORAGE_KEYS.analytics, {});
  return {
    ...EMPTY_ANALYTICS,
    ...saved,
    destinationViews: saved.destinationViews ?? {},
    governorateViews: saved.governorateViews ?? {},
    artifactViews: saved.artifactViews ?? {},
    searchTerms: saved.searchTerms ?? {},
  };
}

export function saveAnalytics(analytics: PlatformAnalytics): void {
  safeWriteJson(STORAGE_KEYS.analytics, analytics);
}

export function loadAuditLogs(): AuditLogEntry[] {
  const saved = safeReadJson<AuditLogEntry[]>(STORAGE_KEYS.auditLogs, []);
  return Array.isArray(saved) ? saved : [];
}

export function appendAuditLog(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
  existing: AuditLogEntry[]
): AuditLogEntry[] {
  const record: AuditLogEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  const next = [record, ...existing].slice(0, 200);
  safeWriteJson(STORAGE_KEYS.auditLogs, next);
  return next;
}

/* ===========================
 * Newsletter Subscription
 * =========================== */
export interface NewsletterSubscriber {
  email: string;
  subscribedAt: string;
}

export function loadNewsletterSubscribers(): NewsletterSubscriber[] {
  const saved = safeReadJson<NewsletterSubscriber[]>(STORAGE_KEYS.newsletter, []);
  return Array.isArray(saved) ? saved : [];
}

export function subscribeNewsletter(
  emailRaw: string,
  existing: NewsletterSubscriber[]
): { ok: boolean; messageAr: string; subscribers: NewsletterSubscriber[] } {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return {
      ok: false,
      messageAr: 'يرجى إدخال بريد إلكتروني صحيح.',
      subscribers: existing,
    };
  }
  if (existing.some((s) => s.email === email)) {
    return {
      ok: true,
      messageAr: 'هذا البريد مسجل بالفعل في النشرة الثقافية.',
      subscribers: existing,
    };
  }
  const next = [{ email, subscribedAt: new Date().toISOString() }, ...existing];
  safeWriteJson(STORAGE_KEYS.newsletter, next);
  return {
    ok: true,
    messageAr: 'تم تسجيل اشتراكك بنجاح في تحديثات أرض السواد.',
    subscribers: next,
  };
}

/* ===========================
 * Admin Managed Content (Articles, Artifacts, Services)
 * =========================== */
export function loadCustomArticles(defaults: CulturalArticle[]): CulturalArticle[] {
  const saved = safeReadJson<CulturalArticle[] | null>(STORAGE_KEYS.customArticles, null);
  return Array.isArray(saved) && saved.length > 0 ? saved : defaults;
}

export function saveCustomArticles(articles: CulturalArticle[]): void {
  safeWriteJson(STORAGE_KEYS.customArticles, articles);
}

export function loadCustomArtifacts(defaults: MuseumArtifact[]): MuseumArtifact[] {
  const saved = safeReadJson<MuseumArtifact[] | null>(STORAGE_KEYS.customArtifacts, null);
  return Array.isArray(saved) && saved.length > 0 ? saved : defaults;
}

export function saveCustomArtifacts(artifacts: MuseumArtifact[]): void {
  safeWriteJson(STORAGE_KEYS.customArtifacts, artifacts);
}

export function loadCustomServices(
  defaults: TourismServiceListing[]
): TourismServiceListing[] {
  const saved = safeReadJson<TourismServiceListing[] | null>(
    STORAGE_KEYS.customServices,
    null
  );
  return Array.isArray(saved) && saved.length > 0 ? saved : defaults;
}

export function saveCustomServices(services: TourismServiceListing[]): void {
  safeWriteJson(STORAGE_KEYS.customServices, services);
}

/* ===========================
 * CSV / Spreadsheet Importer with Validation & Duplicate Detection
 * =========================== */
export interface CsvColumnMapping {
  name_ar: string;
  name_en: string;
  governorate_ar: string;
  category: string;
  era: string;
  description_ar: string;
  lat: string;
  lng: string;
  unesco_site: string;
}

export interface CsvImportRowResult {
  rowIndex: number;
  status: 'valid' | 'duplicate' | 'error';
  reasonAr?: string;
  landmark?: Landmark;
}

export interface CsvImportPreview {
  headers: string[];
  rows: CsvImportRowResult[];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
}

/**
 * RFC-4180 compliant lightweight CSV line parser supporting quoted fields.
 */
export function parseCsvTable(csvText: string): { headers: string[]; dataRows: string[][] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  const cleaned = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  if (!cleaned) return { headers: [], dataRows: [] };

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (ch === '\n') {
      currentRow.push(currentCell.trim());
      lines.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += ch;
    }
  }
  currentRow.push(currentCell.trim());
  lines.push(currentRow);

  const nonEmpty = lines.filter((r) => r.some((cell) => cell.length > 0));
  if (nonEmpty.length === 0) return { headers: [], dataRows: [] };
  return {
    headers: nonEmpty[0],
    dataRows: nonEmpty.slice(1),
  };
}

export function autoDetectCsvMapping(headers: string[]): CsvColumnMapping {
  const findHeader = (candidates: string[]): string => {
    for (const h of headers) {
      const norm = h.trim().toLowerCase();
      if (candidates.some((c) => norm.includes(c))) return h;
    }
    return '';
  };

  return {
    name_ar: findHeader(['name_ar', 'الاسم', 'المعلم', 'title_ar']),
    name_en: findHeader(['name_en', 'english', 'title_en']),
    governorate_ar: findHeader(['governorate', 'المحافظة', 'gov']),
    category: findHeader(['category', 'الفئة', 'التصنيف', 'type']),
    era: findHeader(['era', 'الحقبة', 'العصر']),
    description_ar: findHeader(['description', 'الوصف', 'نبذة']),
    lat: findHeader(['lat', 'خط العرض']),
    lng: findHeader(['lng', 'lon', 'خط الطول']),
    unesco_site: findHeader(['unesco', 'اليونسكو']),
  };
}

function normalizeCategoryInput(raw: string): LandmarkCategory {
  const n = normalizeArabic(raw);
  if (n.includes('religious') || n.includes('ديني') || n.includes('مرقد') || n.includes('عتب')) {
    return 'religious';
  }
  if (n.includes('nature') || n.includes('طبيع') || n.includes('اهوار') || n.includes('سياح')) {
    return 'nature_tourism';
  }
  return 'archaeological';
}

export function previewLandmarksCsvImport(
  csvText: string,
  mapping: CsvColumnMapping,
  existingLandmarks: Landmark[],
  governorates: Governorate[]
): CsvImportPreview {
  const { headers, dataRows } = parseCsvTable(csvText);
  const existingNames = new Set(existingLandmarks.map((l) => normalizeArabic(l.name_ar)));
  const seenImportNames = new Set<string>();

  const colIndex = (colName: string) => (colName ? headers.indexOf(colName) : -1);
  const idx = {
    name_ar: colIndex(mapping.name_ar),
    name_en: colIndex(mapping.name_en),
    governorate_ar: colIndex(mapping.governorate_ar),
    category: colIndex(mapping.category),
    era: colIndex(mapping.era),
    description_ar: colIndex(mapping.description_ar),
    lat: colIndex(mapping.lat),
    lng: colIndex(mapping.lng),
    unesco_site: colIndex(mapping.unesco_site),
  };

  const rows: CsvImportRowResult[] = dataRows.map((cells, rowIdx) => {
    const get = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : '');
    const name_ar = get(idx.name_ar);
    const govInput = get(idx.governorate_ar);

    if (!name_ar) {
      return {
        rowIndex: rowIdx + 2,
        status: 'error',
        reasonAr: 'الاسم العربي للمعلم مطلوب.',
      };
    }

    const normName = normalizeArabic(name_ar);
    if (existingNames.has(normName) || seenImportNames.has(normName)) {
      return {
        rowIndex: rowIdx + 2,
        status: 'duplicate',
        reasonAr: `المعلم «${name_ar}» موجود مسبقاً في قاعدة البيانات أو مكرر في الملف.`,
      };
    }

    const matchedGov = governorates.find(
      (g) =>
        normalizeArabic(g.name_ar) === normalizeArabic(govInput) ||
        g.id.toLowerCase() === govInput.toLowerCase() ||
        g.name_en.toLowerCase() === govInput.toLowerCase()
    );

    if (!matchedGov) {
      return {
        rowIndex: rowIdx + 2,
        status: 'error',
        reasonAr: `المحافظة «${govInput || 'فارغة'}» غير مطابقة لمحافظات العراق الثماني عشرة.`,
      };
    }

    const latRaw = get(idx.lat);
    const lngRaw = get(idx.lng);
    const lat = latRaw ? Number(latRaw) : null;
    const lng = lngRaw ? Number(lngRaw) : null;

    if ((latRaw && !Number.isFinite(lat)) || (lngRaw && !Number.isFinite(lng))) {
      return {
        rowIndex: rowIdx + 2,
        status: 'error',
        reasonAr: 'إحداثيات العرض أو الطول غير صالحة رقمياً.',
      };
    }

    const category = normalizeCategoryInput(get(idx.category));
    const categoryArMap: Record<LandmarkCategory, string> = {
      religious: 'ديني',
      archaeological: 'أثري',
      nature_tourism: 'طبيعي / سياحي',
    };

    const unescoRaw = get(idx.unesco_site).toLowerCase();
    const unesco_site =
      unescoRaw === 'true' || unescoRaw === '1' || unescoRaw === 'نعم' || unescoRaw === 'yes';

    const name_en = get(idx.name_en) || name_ar;
    const id = `IQ-IMP-${Date.now().toString(36).toUpperCase()}-${rowIdx + 1}`;
    seenImportNames.add(normName);

    const landmark: Landmark = {
      id,
      name_ar,
      name_en,
      governorate_id: matchedGov.id,
      governorate_ar: matchedGov.name_ar,
      category,
      category_ar: categoryArMap[category],
      era: get(idx.era) || 'غير متوفر حالياً',
      coordinates: { lat, lng },
      description_ar:
        get(idx.description_ar) ||
        `معلم سياحي وتراثي في محافظة ${matchedGov.name_ar}.`,
      best_time_to_visit: 'الربيع والخريف',
      visitor_tips: 'يرجى التحقق من أوقات الزيارة المحلية قبل الانطلاق.',
      unesco_site,
      tags: [matchedGov.name_ar, categoryArMap[category]],
      wikimedia_search_query: `${name_en} Iraq`,
      google_maps_url:
        lat !== null && lng !== null
          ? `https://www.google.com/maps?q=${lat},${lng}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${name_en} ${matchedGov.name_en} Iraq`
            )}`,
      verification_status: 'pending_verification',
      publication_status: 'published',
    };

    return {
      rowIndex: rowIdx + 2,
      status: 'valid',
      landmark,
    };
  });

  return {
    headers,
    rows,
    validCount: rows.filter((r) => r.status === 'valid').length,
    duplicateCount: rows.filter((r) => r.status === 'duplicate').length,
    errorCount: rows.filter((r) => r.status === 'error').length,
  };
}

/* ===========================
 * Platform JSON Backup & Validation
 * =========================== */
export interface PlatformBackupSnapshot {
  schemaVersion: '1.0';
  exportedAt: string;
  platform: 'Ard Al-Sawad Iraq';
  settings: SiteSettingsConfig;
  reviews: VisitorReview[];
  articles: CulturalArticle[];
  artifacts: MuseumArtifact[];
  services: TourismServiceListing[];
  analytics: PlatformAnalytics;
  auditLogs: AuditLogEntry[];
}

export function createPlatformBackupSnapshot(
  data: Omit<PlatformBackupSnapshot, 'schemaVersion' | 'exportedAt' | 'platform'>
): PlatformBackupSnapshot {
  return {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    platform: 'Ard Al-Sawad Iraq',
    ...data,
  };
}

export function validatePlatformBackupSnapshot(raw: unknown): {
  valid: boolean;
  errorAr?: string;
  snapshot?: PlatformBackupSnapshot;
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errorAr: 'ملف النسخة الاحتياطية غير صالح.' };
  }
  const obj = raw as Partial<PlatformBackupSnapshot>;
  if (obj.schemaVersion !== '1.0' || obj.platform !== 'Ard Al-Sawad Iraq') {
    return {
      valid: false,
      errorAr: 'صيغة النسخة الاحتياطية غير متوافقة مع منصة أرض السواد.',
    };
  }
  if (!obj.settings || !Array.isArray(obj.reviews) || !Array.isArray(obj.articles)) {
    return { valid: false, errorAr: 'النسخة الاحتياطية تفتقر إلى أقسام أساسية.' };
  }
  return { valid: true, snapshot: obj as PlatformBackupSnapshot };
}
