import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  CloudUpload,
  Download,
  EyeOff,
  FileSpreadsheet,
  ImagePlus,
  LayoutTemplate,
  LogOut,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AuditLogEntry,
  CulturalArticle,
  CultureTopicCategory,
  DatabaseStats,
  Governorate,
  HomepageSectionsConfig,
  Landmark,
  MuseumArtifact,
  PlatformAnalytics,
  SiteSettingsConfig,
  TourismServiceListing,
  TourismServiceType,
  VisitorReview,
} from '../types/tourism';
import { PLATFORM_IMAGES } from '../data/database';
import { CloudOperationResult } from '../hooks/useCloudData';
import {
  autoDetectCsvMapping,
  createPlatformBackupSnapshot,
  CsvColumnMapping,
  parseCsvTable,
  previewLandmarksCsvImport,
  validatePlatformBackupSnapshot,
} from '../utils/platformStore';
import { normalizeArabic } from '../utils/arabicSearch';

interface AdminDashboardViewProps {
  isAdmin: boolean;
  isAuthLoading?: boolean;
  isSyncing: boolean;
  landmarks: Landmark[];
  governorates: Governorate[];
  stats: DatabaseStats;
  settings: SiteSettingsConfig;
  reviews: VisitorReview[];
  articles: CulturalArticle[];
  artifacts: MuseumArtifact[];
  services: TourismServiceListing[];
  analytics: PlatformAnalytics;
  auditLogs: AuditLogEntry[];
  onOpenAdminLogin: () => void;
  onSignOut: () => Promise<{ error: string | null }>;
  onAddLandmark: () => void;
  onEditLandmark: (landmark: Landmark) => void;
  onManageLandmarkPhotos: (landmark: Landmark) => void;
  onSaveLandmark: (landmark: Landmark) => Promise<CloudOperationResult>;
  onSeedCloudData: () => Promise<CloudOperationResult>;
  onRefreshCloud: () => Promise<CloudOperationResult>;
  onUpdateSettings: (
    next: SiteSettingsConfig
  ) => Promise<{ ok: boolean; messageAr?: string; errorAr?: string }> | void;
  onModerateReview: (
    reviewId: string,
    action: 'approve' | 'hide' | 'delete'
  ) => Promise<{ ok: boolean; messageAr?: string; errorAr?: string }> | void;
  onSaveArticles: (
    next: CulturalArticle[],
    logDetail: string
  ) => Promise<{ ok: boolean; messageAr?: string; errorAr?: string }> | void;
  onSaveServices: (
    next: TourismServiceListing[],
    logDetail: string
  ) => Promise<{ ok: boolean; messageAr?: string; errorAr?: string }> | void;
  onRestoreBackup: (snapshot: {
    settings: SiteSettingsConfig;
    reviews: VisitorReview[];
    articles: CulturalArticle[];
    artifacts: MuseumArtifact[];
    services: TourismServiceListing[];
  }) => Promise<{ ok: boolean; messageAr?: string; errorAr?: string }> | void;
}

type AdminTab =
  | 'overview'
  | 'landmarks'
  | 'homepage'
  | 'content'
  | 'reviews'
  | 'import_backup'
  | 'audit';

const HOMEPAGE_SECTION_LABELS: { key: keyof HomepageSectionsConfig; label: string }[] = [
  { key: 'featuredDestinations', label: 'الوجهات المميزة' },
  { key: 'governoratesGrid', label: 'شبكة المحافظات العراقية (18)' },
  { key: 'archaeologicalHighlights', label: 'أبرز المواقع الأثرية' },
  { key: 'religiousLandmarks', label: 'العتبات والمواقع الدينية' },
  { key: 'marshlandsNature', label: 'الطبيعة والأهوار والمصايف' },
  { key: 'recommendedItineraries', label: 'المسارات السياحية المقترحة' },
  { key: 'museumHighlights', label: 'مقتنيات المتحف الرقمي' },
  { key: 'culturalExperiences', label: 'تجارب عِش العراق' },
  { key: 'seasonalRecommendations', label: 'التوصيات الموسمية للزيارة' },
  { key: 'latestStories', label: 'أحدث القصص والمقالات الثقافية' },
  { key: 'nationalInitiatives', label: 'المبادرات الوطنية للتراث' },
  { key: 'newsletterSignup', label: 'نموذج الاشتراك في التحديثات' },
];

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  isAdmin,
  isAuthLoading = false,
  isSyncing,
  landmarks,
  governorates,
  stats,
  settings,
  reviews,
  articles,
  artifacts,
  services,
  analytics,
  auditLogs,
  onOpenAdminLogin,
  onSignOut,
  onAddLandmark,
  onEditLandmark,
  onManageLandmarkPhotos,
  onSaveLandmark,
  onSeedCloudData,
  onRefreshCloud,
  onUpdateSettings,
  onModerateReview,
  onSaveArticles,
  onSaveServices,
  onRestoreBackup,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [landmarkQuery, setLandmarkQuery] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Settings local form state
  const [draftSettings, setDraftSettings] = useState<SiteSettingsConfig>(settings);

  // Quick Add Article state
  const [newArticleTitle, setNewArticleTitle] = useState('');
  const [newArticleCategory, setNewArticleCategory] =
    useState<CultureTopicCategory>('hospitality');
  const [newArticleBody, setNewArticleBody] = useState('');

  // Quick Add Service state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceType, setNewServiceType] =
    useState<TourismServiceType>('accommodation');
  const [newServiceGovId, setNewServiceGovId] = useState(governorates[0]?.id ?? 'IQ-GOV-01');
  const [newServiceDesc, setNewServiceDesc] = useState('');

  // CSV Importer state
  const [csvText, setCsvText] = useState('');
  const [csvMapping, setCsvMapping] = useState<CsvColumnMapping>({
    name_ar: '',
    name_en: '',
    governorate_ar: '',
    category: '',
    era: '',
    description_ar: '',
    lat: '',
    lng: '',
    unesco_site: '',
  });
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  const filteredAdminLandmarks = useMemo(() => {
    const q = normalizeArabic(landmarkQuery);
    if (!q) return landmarks.slice(0, 40);
    return landmarks
      .filter((l) =>
        normalizeArabic(`${l.name_ar} ${l.governorate_ar} ${l.category_ar}`).includes(q)
      )
      .slice(0, 40);
  }, [landmarks, landmarkQuery]);

  const parsedCsv = useMemo(() => parseCsvTable(csvText), [csvText]);

  const csvPreview = useMemo(() => {
    if (!csvText.trim() || parsedCsv.headers.length === 0) return null;
    return previewLandmarksCsvImport(csvText, csvMapping, landmarks, governorates);
  }, [csvText, parsedCsv.headers, csvMapping, landmarks, governorates]);

  const topDestinations = useMemo(() => {
    return Object.entries(analytics.destinationViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, views]) => ({
        name: landmarks.find((l) => l.id === id)?.name_ar ?? id,
        views,
      }));
  }, [analytics.destinationViews, landmarks]);

  const topSearches = useMemo(
    () =>
      Object.entries(analytics.searchTerms)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6),
    [analytics.searchTerms]
  );

  // Gate strictly if user is not authenticated as admin
  if (!isAdmin && isAuthLoading) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-[#173F35]/14 bg-white p-8 dark:border-[#C5A15A]/22 dark:bg-[#13352F]">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#C5A15A]" />
          <p className="mt-3 text-sm font-semibold text-[#173F35] dark:text-[#F8F6F0]">
            جارٍ التحقق من صلاحيات جلسة الإدارة...
          </p>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-[#173F35]/14 bg-white p-8 dark:border-[#C5A15A]/22 dark:bg-[#13352F]">
          <Shield className="mx-auto h-10 w-10 text-[#C5A15A]" />
          <h1 className="font-heritage mt-3 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
            لوحة الإدارة محمية
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
            يرجى تسجيل الدخول بحساب المدير المصرح له للوصول إلى إدارة المعالم، الأقسام
            الرئيسية، المراجعات، والتحليلات.
          </p>
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="mt-5 rounded-xl bg-[#173F35] px-6 py-2.5 text-xs font-bold text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]"
          >
            دخول لوحة الإدارة
          </button>
        </div>
      </section>
    );
  }

  const handleCsvInputChange = (raw: string) => {
    setCsvText(raw);
    const { headers } = parseCsvTable(raw);
    if (headers.length > 0) {
      setCsvMapping(autoDetectCsvMapping(headers));
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleCsvInputChange(reader.result);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleCommitCsvImport = async () => {
    if (!csvPreview) return;
    const validLandmarks = csvPreview.rows
      .filter((r) => r.status === 'valid' && r.landmark)
      .map((r) => r.landmark!);
    if (validLandmarks.length === 0) return;

    setIsImportingCsv(true);
    let saved = 0;
    for (const lm of validLandmarks) {
      const res = await onSaveLandmark(lm);
      if (res.ok) saved += 1;
    }
    setIsImportingCsv(false);
    setCsvText('');
    setStatusNotice(`تم استيراد ${saved} معلماً بنجاح وتحديث قاعدة البيانات.`);
  };

  const handleDownloadBackup = () => {
    const snapshot = createPlatformBackupSnapshot({
      settings,
      reviews,
      articles,
      artifacts,
      services,
      analytics,
      auditLogs,
    });
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ard-alsawad-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusNotice('تم تنزيل نسخة احتياطية كاملة للمنصة بصيغة JSON.');
  };

  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const checked = validatePlatformBackupSnapshot(parsed);
        if (!checked.valid || !checked.snapshot) {
          setStatusNotice(checked.errorAr ?? 'ملف النسخة الاحتياطية غير صالح.');
          return;
        }
        const res = await onRestoreBackup({
          settings: checked.snapshot.settings,
          reviews: checked.snapshot.reviews,
          articles: checked.snapshot.articles,
          artifacts: checked.snapshot.artifacts,
          services: checked.snapshot.services,
        });
        if (res && !res.ok) {
          setStatusNotice(res.errorAr ?? 'تعذر استعادة النسخة الاحتياطية.');
          return;
        }
        setDraftSettings(checked.snapshot.settings);
        setStatusNotice(res?.messageAr ?? 'تمت استعادة النسخة الاحتياطية بنجاح.');
      } catch {
        setStatusNotice('تعذر قراءة ملف JSON؛ يرجى التأكد من سلامة الملف.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleAddQuickArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticleTitle.trim() || !newArticleBody.trim()) return;
    const catLabels: Record<CultureTopicCategory, string> = {
      cuisine: 'المطبخ العراقي',
      clothing: 'الأزياء التقليدية',
      crafts: 'الحرف اليدوية',
      music: 'المقام والموسيقى',
      hospitality: 'الضيافة والمقاهي',
      architecture: 'العمارة التراثية',
      markets: 'الأسواق والخانات',
      festivals: 'المواسم والتقاليد',
      marshes: 'حياة الأهوار',
      traditions: 'التقاليد العراقية',
      etiquette: 'آداب الزيارة',
      seasonal: 'السياحة الموسمية',
    };
    const article: CulturalArticle = {
      id: `art-${Date.now()}`,
      title_ar: newArticleTitle.trim(),
      subtitle_ar: 'مقال محرّر عبر لوحة الإدارة',
      category: newArticleCategory,
      category_ar: catLabels[newArticleCategory],
      read_time_minutes: 3,
      image_url: PLATFORM_IMAGES.cultureHospitality,
      excerpt_ar: newArticleBody.trim().slice(0, 140),
      body_paragraphs_ar: newArticleBody
        .trim()
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean),
      regions_ar: ['العراق'],
      published_at: new Date().toISOString().slice(0, 10),
      status: 'published',
    };
    const res = await onSaveArticles([article, ...articles], `إضافة مقال ثقافي: ${article.title_ar}`);
    if (res && !res.ok) {
      setStatusNotice(res.errorAr ?? 'تعذر حفظ المقال في قاعدة البيانات.');
      return;
    }
    setNewArticleTitle('');
    setNewArticleBody('');
    setStatusNotice(res?.messageAr ?? 'تمت إضافة المقال الجديد إلى قسم «عِش العراق».');
  };

  const handleAddQuickService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServiceDesc.trim()) return;
    const gov = governorates.find((g) => g.id === newServiceGovId) ?? governorates[0];
    const typeLabels: Record<TourismServiceType, string> = {
      accommodation: 'الإقامة والفنادق',
      restaurant: 'المطاعم والمقاهي التراثية',
      guide_transport: 'الإرشاد السياحي والتنقل',
    };
    const svc: TourismServiceListing = {
      id: `svc-${Date.now()}`,
      name_ar: newServiceName.trim(),
      service_type: newServiceType,
      service_type_ar: typeLabels[newServiceType],
      governorate_id: gov.id,
      governorate_ar: gov.name_ar,
      area_ar: gov.name_ar,
      description_ar: newServiceDesc.trim(),
      price_range_ar: 'غير متوفر حالياً',
      image_url: PLATFORM_IMAGES.cultureHospitality,
      verification_status: 'verified',
      features_ar: ['مُضاف عبر الإدارة'],
    };
    const res = await onSaveServices([svc, ...services], `إضافة خدمة سياحية: ${svc.name_ar}`);
    if (res && !res.ok) {
      setStatusNotice(res.errorAr ?? 'تعذر حفظ الخدمة السياحية في قاعدة البيانات.');
      return;
    }
    setNewServiceName('');
    setNewServiceDesc('');
    setStatusNotice(res?.messageAr ?? 'تمت إضافة الخدمة السياحية إلى «دليل الزائر».');
  };

  const pendingReviewsCount = reviews.filter((r) => r.status === 'pending').length;
  const reportedCount = reviews.filter((r) => r.reportedCount > 0).length;

  return (
    <section
      data-testid="admin-dashboard-view"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6"
    >
      {/* Top Admin Header (NEVER displays admin email) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173F35]/14 pb-5 dark:border-[#C5A15A]/20">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
            <ShieldCheck className="h-4 w-4" />
            <span>حساب المدير · لوحة التحكم الشاملة</span>
          </p>
          <h1 className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
            إدارة منصة أرض السواد
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAddLandmark}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#173F35] px-4 py-2 text-xs font-bold text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة معلم جديد</span>
          </button>
          <button
            type="button"
            onClick={() => void onRefreshCloud()}
            disabled={isSyncing}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#173F35]/18 bg-white px-3.5 py-2 text-xs font-bold text-[#173F35] dark:border-[#C5A15A]/22 dark:bg-[#13352F] dark:text-[#E7C87B]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>تحديث السحابة</span>
          </button>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {statusNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-[#C5A15A]/45 bg-[#FFF9EB] px-4 py-3 text-xs font-bold text-[#6E4F12] dark:bg-[#1A2D24] dark:text-[#E7C87B]"
        >
          <span>{statusNotice}</span>
          <button type="button" onClick={() => setStatusNotice(null)}>
            إغلاق
          </button>
        </div>
      )}

      {/* Dashboard Navigation Tabs */}
      <div
        role="tablist"
        aria-label="أقسام لوحة الإدارة"
        className="flex flex-wrap gap-2"
      >
        {(
          [
            { id: 'overview', label: 'النظرة العامة والتحليلات', Icon: BarChart3 },
            { id: 'landmarks', label: `المعالم (${stats.totalLandmarks})`, Icon: MapPin },
            { id: 'homepage', label: 'الصفحة الرئيسية والإعدادات', Icon: LayoutTemplate },
            { id: 'content', label: 'الثقافة والخدمات', Icon: BookOpen },
            {
              id: 'reviews',
              label: `المراجعات (${reviews.length}${pendingReviewsCount > 0 ? ` · ${pendingReviewsCount} بانتظار المراجعة` : ''}${reportedCount > 0 ? ` · ${reportedCount} بلاغ` : ''})`,
              Icon: MessageSquare,
            },
            { id: 'import_backup', label: 'استيراد CSV والنسخ الاحتياطي', Icon: FileSpreadsheet },
            { id: 'audit', label: `سجل النشاط (${auditLogs.length})`, Icon: Activity },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-testid={`admin-tab-${id}`}
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
              activeTab === id
                ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                : 'border border-[#173F35]/14 bg-white text-[#4E5C58] dark:border-[#C5A15A]/18 dark:bg-[#13352F] dark:text-[#C0CCC7]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-[#173F35]/12 bg-white p-4 dark:bg-[#13352F]">
              <p className="text-xs text-[#5E6D68] dark:text-[#A9B8B3]">إجمالي المعالم</p>
              <p className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#E7C87B] tabular-nums">
                {stats.totalLandmarks}
              </p>
            </div>
            <div className="rounded-2xl border border-[#173F35]/12 bg-white p-4 dark:bg-[#13352F]">
              <p className="text-xs text-[#5E6D68] dark:text-[#A9B8B3]">مواقع اليونسكو</p>
              <p className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#E7C87B] tabular-nums">
                {stats.unescoCount}
              </p>
            </div>
            <div className="rounded-2xl border border-[#173F35]/12 bg-white p-4 dark:bg-[#13352F]">
              <p className="text-xs text-[#5E6D68] dark:text-[#A9B8B3]">مقتنيات المتحف</p>
              <p className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#E7C87B] tabular-nums">
                {artifacts.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[#173F35]/12 bg-white p-4 dark:bg-[#13352F]">
              <p className="text-xs text-[#5E6D68] dark:text-[#A9B8B3]">مراجعات الزوار</p>
              <p className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#E7C87B] tabular-nums">
                {reviews.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[#173F35]/12 bg-white p-4 dark:bg-[#13352F]">
              <p className="text-xs text-[#5E6D68] dark:text-[#A9B8B3]">مرات حفظ المسار</p>
              <p className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#E7C87B] tabular-nums">
                {analytics.itinerarySavesCount}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:bg-[#13352F]">
              <h2 className="font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
                أكثر المعالم مشاهدة (بيانات فعلية)
              </h2>
              {topDestinations.length === 0 ? (
                <p className="mt-3 text-xs text-[#5E6D68] dark:text-[#A9B8B3]">
                  لم تُسجّل مشاهدات تفصيلية بعد في هذه الجلسة.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-xs">
                  {topDestinations.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-xl bg-[#F8F6F0] px-3 py-2 dark:bg-[#102F29]"
                    >
                      <span className="font-semibold text-[#173F35] dark:text-[#F8F6F0]">
                        {item.name}
                      </span>
                      <span className="font-bold text-[#8C6D2B] dark:text-[#E7C87B] tabular-nums">
                        {item.views} مشاهدة
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:bg-[#13352F]">
              <h2 className="font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
                أكثر عبارات البحث استخداماً
              </h2>
              {topSearches.length === 0 ? (
                <p className="mt-3 text-xs text-[#5E6D68] dark:text-[#A9B8B3]">
                  لم تُسجّل عبارات بحث بعد.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {topSearches.map(([term, count]) => (
                    <span
                      key={term}
                      className="rounded-xl bg-[#F8F6F0] px-3 py-1.5 text-xs font-bold text-[#173F35] dark:bg-[#102F29] dark:text-[#E7C87B]"
                    >
                      {term} ({count})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LANDMARKS MANAGER */}
      {activeTab === 'landmarks' && (
        <div className="space-y-4 rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:bg-[#13352F]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              value={landmarkQuery}
              onChange={(e) => setLandmarkQuery(e.target.value)}
              placeholder="ابحث بالاسم أو المحافظة للتعديل السريع..."
              className="min-h-[42px] w-full max-w-md rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-3.5 text-xs text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
            />
            <button
              type="button"
              onClick={async () => {
                const res = await onSeedCloudData();
                setStatusNotice(res.message || 'اكتملت عملية المزامنة.');
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#C5A15A]/50 bg-[#C5A15A]/15 px-3.5 py-2 text-xs font-bold text-[#7B5B17] dark:text-[#E7C87B]"
            >
              <CloudUpload className="h-4 w-4" />
              <span>مزامنة البيانات الأولية</span>
            </button>
          </div>

          <div className="divide-y divide-[#173F35]/10 dark:divide-[#C5A15A]/15">
            {filteredAdminLandmarks.map((lm) => (
              <div
                key={lm.id}
                className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm font-bold text-[#173F35] dark:text-[#F8F6F0]">
                    {lm.name_ar}
                  </p>
                  <p className="text-[11px] text-[#5E6D68] dark:text-[#A9B8B3]">
                    {lm.governorate_ar} · {lm.category_ar} · {lm.era}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onManageLandmarkPhotos(lm)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#C5A15A]/50 px-3 py-1.5 text-xs font-bold text-[#7B5B17] dark:text-[#E7C87B]"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    <span>الصور</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditLandmark(lm)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#173F35] px-3 py-1.5 text-xs font-bold text-white dark:bg-[#C5A15A] dark:text-[#102F29]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>تعديل</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HOMEPAGE SECTIONS & SITE SETTINGS */}
      {activeTab === 'homepage' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await onUpdateSettings(draftSettings);
            if (res && !res.ok) {
              setStatusNotice(res.errorAr ?? 'تعذر حفظ إعدادات المنصة في قاعدة البيانات.');
              return;
            }
            setStatusNotice(res?.messageAr ?? 'تم حفظ إعدادات الصفحة الرئيسية والهوية بنجاح.');
          }}
          className="space-y-6 rounded-2xl border border-[#173F35]/12 bg-white p-6 dark:bg-[#13352F]"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#173F35] dark:text-[#E7C87B]">
                عنوان الصفحة الرئيسية (Hero Headline)
              </label>
              <input
                type="text"
                value={draftSettings.heroHeadlineAr}
                onChange={(e) =>
                  setDraftSettings((p) => ({ ...p, heroHeadlineAr: e.target.value }))
                }
                className="min-h-[42px] w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-3 text-sm text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#173F35] dark:text-[#E7C87B]">
                عنوان الموقع في المتصفح (SEO Title)
              </label>
              <input
                type="text"
                value={draftSettings.siteTitleAr}
                onChange={(e) =>
                  setDraftSettings((p) => ({ ...p, siteTitleAr: e.target.value }))
                }
                className="min-h-[42px] w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-3 text-sm text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#173F35] dark:text-[#E7C87B]">
              النص التعريفي في الواجهة الرئيسية
            </label>
            <textarea
              rows={2}
              value={draftSettings.heroSubtitleAr}
              onChange={(e) =>
                setDraftSettings((p) => ({ ...p, heroSubtitleAr: e.target.value }))
              }
              className="w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] p-3 text-xs text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
            />
          </div>

          <div>
            <h2 className="font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
              إظهار / إخفاء أقسام الصفحة الرئيسية
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {HOMEPAGE_SECTION_LABELS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-[#173F35]/12 bg-[#F8F6F0] px-3.5 py-2.5 text-xs font-bold text-[#173F35] dark:bg-[#102F29] dark:text-[#F8F6F0]"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={draftSettings.homepageSections[key]}
                    onChange={(e) =>
                      setDraftSettings((prev) => ({
                        ...prev,
                        homepageSections: {
                          ...prev.homepageSections,
                          [key]: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 accent-[#173F35]"
                  />
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            data-testid="save-homepage-settings-btn"
            className="rounded-xl bg-[#173F35] px-6 py-2.5 text-xs font-bold text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]"
          >
            حفظ إعدادات المنصة
          </button>
        </form>
      )}

      {/* TAB 4: CULTURE ARTICLES & TOURISM SERVICES MANAGER */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleAddQuickArticle}
            className="space-y-3 rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:bg-[#13352F]"
          >
            <h2 className="font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
              إضافة مقال إلى «عِش العراق» ({articles.length})
            </h2>
            <input
              type="text"
              required
              value={newArticleTitle}
              onChange={(e) => setNewArticleTitle(e.target.value)}
              placeholder="عنوان المقال..."
              className="min-h-[40px] w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-3 text-xs text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
            />
            <select
              value={newArticleCategory}
              onChange={(e) =>
                setNewArticleCategory(e.target.value as CultureTopicCategory)
              }
              className="min-h-[40px] w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-3 text-xs text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
            >
              <option value="hospitality">الضيافة والمقاهي</option>
              <option value="cuisine">المطبخ العراقي</option>
              <option value="architecture">العمارة التراثية</option>
              <option value="crafts">الحرف اليدوية</option>
              <option value="marshes">حياة الأهوار</option>
            </select>
            <textarea
              rows={3}
              required
              value={newArticleBody}
              onChange={(e) => setNewArticleBody(e.target.value)}
              placeholder="نص المقال الثقافي..."
              className="w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] p-3 text-xs text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#173F35] px-5 py-2 text-xs font-bold text-white dark:bg-[#C5A15A] dark:text-[#102F29]"
            >
              نشر المقال
            </button>
          </form>

          <form
            onSubmit={handleAddQuickService}
            className="space-y-3 rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:bg-[#13352F]"
          >
            <h2 className="font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
              إضافة خدمة إلى «دليل الزائر» ({services.length})
            </h2>
            <input
              type="text"
              required
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="اسم الفندق، المطعم، أو مكتب الإرشاد..."
              className="min-h-[40px] w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-3 text-xs text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newServiceType}
                onChange={(e) => setNewServiceType(e.target.value as TourismServiceType)}
                className="min-h-[40px] rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-2.5 text-xs text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
              >
                <option value="accommodation">الإقامة والفنادق</option>
                <option value="restaurant">المطاعم والمقاهي</option>
                <option value="guide_transport">الإرشاد والتنقل</option>
              </select>
              <select
                value={newServiceGovId}
                onChange={(e) => setNewServiceGovId(e.target.value)}
                className="min-h-[40px] rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-2.5 text-xs text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
              >
                {governorates.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              rows={3}
              required
              value={newServiceDesc}
              onChange={(e) => setNewServiceDesc(e.target.value)}
              placeholder="وصف الخدمة الموثّق..."
              className="w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] p-3 text-xs text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#173F35] px-5 py-2 text-xs font-bold text-white dark:bg-[#C5A15A] dark:text-[#102F29]"
            >
              إضافة الخدمة
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: VISITOR REVIEWS MODERATION */}
      {activeTab === 'reviews' && (
        <div className="space-y-3 rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:bg-[#13352F]">
          <h2 className="font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
            إدارة ومراجعة تعليقات الزوار ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="text-xs text-[#5E6D68] dark:text-[#A9B8B3]">
              لا توجد مراجعات مسجلة من الزوار حتى الآن.
            </p>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-[#173F35]/12 bg-[#F8F6F0] p-4 sm:flex-row sm:items-center dark:bg-[#102F29]"
              >
                <div>
                  <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                    {rev.landmarkNameAr} · {rev.authorName} · {rev.rating}/5 ·{' '}
                    {rev.status === 'approved'
                      ? 'منشور'
                      : rev.status === 'pending'
                        ? 'بانتظار المراجعة'
                        : 'مخفي'}
                    {rev.reportedCount > 0 ? ` · (${rev.reportedCount} بلاغ)` : ''}
                  </p>
                  <p className="mt-1 text-xs text-[#252B29] dark:text-[#E9DFC9]">
                    {rev.comment}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await onModerateReview(rev.id, 'approve');
                      if (res && !res.ok) setStatusNotice(res.errorAr ?? 'تعذر اعتماد المراجعة.');
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#173F35] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>اعتماد</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await onModerateReview(rev.id, 'hide');
                      if (res && !res.ok) setStatusNotice(res.errorAr ?? 'تعذر إخفاء المراجعة.');
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#C5A15A]/50 px-3 py-1.5 text-xs font-bold text-[#7B5B17] dark:text-[#E7C87B]"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>إخفاء</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await onModerateReview(rev.id, 'delete');
                      if (res && !res.ok) setStatusNotice(res.errorAr ?? 'تعذر حذف المراجعة.');
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 6: CSV IMPORTER & JSON BACKUP */}
      {activeTab === 'import_backup' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#173F35]/12 bg-white p-5 space-y-4 dark:bg-[#13352F]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
                  استيراد المعالم بالجملة (CSV / Excel)
                </h2>
                <p className="text-xs text-[#5E6D68] dark:text-[#A9B8B3]">
                  ارفع ملف CSV (بترميز UTF-8) أو الصق الصفوف لمعاينة التطابق وكشف التكرار
                  قبل الحفظ.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#173F35]/20 bg-[#F8F6F0] px-4 py-2 text-xs font-bold text-[#173F35] dark:bg-[#102F29] dark:text-[#E7C87B]">
                <Upload className="h-3.5 w-3.5" />
                <span>اختيار ملف CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={4}
              data-testid="csv-paste-input"
              value={csvText}
              onChange={(e) => handleCsvInputChange(e.target.value)}
              placeholder="name_ar,name_en,governorate_ar,category,era,description_ar,lat,lng,unesco_site"
              dir="ltr"
              className="w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] p-3 font-mono text-xs text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
            />

            {csvPreview && (
              <div className="space-y-3 rounded-xl border border-[#C5A15A]/35 bg-[#F8F6F0] p-4 text-xs dark:bg-[#102F29]">
                <p className="font-bold text-[#173F35] dark:text-[#E7C87B] tabular-nums">
                  معاينة الاستيراد: {csvPreview.validCount} صف صالح ·{' '}
                  {csvPreview.duplicateCount} مكرر · {csvPreview.errorCount} خطأ
                </p>
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {csvPreview.rows.map((row) => (
                    <div
                      key={row.rowIndex}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-[#13352F]"
                    >
                      <span>
                        صف {row.rowIndex}:{' '}
                        {row.landmark ? row.landmark.name_ar : row.reasonAr}
                      </span>
                      <span
                        className={`font-bold ${
                          row.status === 'valid'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : row.status === 'duplicate'
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-red-700 dark:text-red-300'
                        }`}
                      >
                        {row.status === 'valid'
                          ? 'صالح'
                          : row.status === 'duplicate'
                            ? 'مكرر'
                            : 'خطأ'}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={csvPreview.validCount === 0 || isImportingCsv}
                  onClick={() => void handleCommitCsvImport()}
                  className="rounded-xl bg-[#173F35] px-5 py-2 text-xs font-bold text-white disabled:opacity-45 dark:bg-[#C5A15A] dark:text-[#102F29]"
                >
                  {isImportingCsv
                    ? 'جارٍ الاستيراد...'
                    : `اعتماد واستيراد (${csvPreview.validCount})`}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:bg-[#13352F]">
            <h2 className="font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
              النسخ الاحتياطي والاستعادة (JSON)
            </h2>
            <p className="mt-1 text-xs text-[#5E6D68] dark:text-[#A9B8B3]">
              صدّر نسخة احتياطية كاملة لإعدادات المنصة والمقالات والمقتنيات والمراجعات أو
              استعدها بأمان.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#173F35] px-4 py-2.5 text-xs font-bold text-white dark:bg-[#C5A15A] dark:text-[#102F29]"
              >
                <Download className="h-4 w-4" />
                <span>تنزيل نسخة احتياطية كاملة</span>
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#173F35]/20 px-4 py-2.5 text-xs font-bold text-[#173F35] dark:border-[#C5A15A]/30 dark:text-[#E7C87B]">
                <Upload className="h-4 w-4" />
                <span>استعادة من ملف JSON</span>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleRestoreBackupFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-3 rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:bg-[#13352F]">
          <h2 className="font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
            سجل عمليات الإدارة ({auditLogs.length})
          </h2>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-[#5E6D68] dark:text-[#A9B8B3]">
              لم تُسجل عمليات إدارية بعد.
            </p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F8F6F0] px-3.5 py-2.5 text-xs dark:bg-[#102F29]"
                >
                  <div>
                    <span className="font-bold text-[#173F35] dark:text-[#E7C87B]">
                      {log.action_ar}
                    </span>
                    <span className="mx-2 text-[#5E6D68]">·</span>
                    <span className="text-[#4E5C58] dark:text-[#C0CCC7]">
                      {log.details_ar}
                    </span>
                  </div>
                  <span dir="ltr" className="text-[11px] text-[#6B7A75] tabular-nums">
                    {new Date(log.timestamp).toLocaleString('ar-IQ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
