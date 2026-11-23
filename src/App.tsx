import { useEffect, useMemo, useState } from 'react';
import { DATABASE_METADATA, IRAQ_GOVERNORATES } from './data/database';
import { NATIONAL_INITIATIVES } from './data/cultureData';
import {
  AppView,
  CulturalArticle,
  Governorate,
  GovernorateProfile,
  ItineraryEntry,
  Landmark,
  LandmarkFilterState,
  MuseumArtifact,
  PlatformAnalytics,
} from './types/tourism';
import { filterLandmarks, getDatabaseStats } from './utils/arabicSearch';
import {
  loadItineraryFromStorage,
  moveItineraryEntry,
  saveItineraryToStorage,
  toggleItineraryEntry,
  updateItineraryNote,
} from './utils/itinerary';
import { EMPTY_ANALYTICS } from './utils/platformStore';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useTheme } from './hooks/useTheme';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useCloudData } from './hooks/useCloudData';
import { usePlatformData } from './hooks/usePlatformData';
import { Header } from './components/Header';
import { AdminBar } from './components/AdminBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomeView } from './components/HomeView';
import { ExploreSection } from './components/ExploreSection';
import { GovernoratesView } from './components/GovernoratesView';
import { IraqMapView } from './components/IraqMapView';
import { SmartTravelPlannerView } from './components/SmartTravelPlannerView';
import { DigitalMuseumView } from './components/DigitalMuseumView';
import { LiveIraqCultureView } from './components/LiveIraqCultureView';
import { CulturalGamesView } from './components/CulturalGamesView';
import { VisitorGuideView } from './components/VisitorGuideView';
import { NationalInitiativesView } from './components/NationalInitiativesView';
import { AboutView } from './components/AboutView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { DestinationDetailModal } from './components/DestinationDetailModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import {
  AdminPhotoManagerModal,
  PhotoManagerTarget,
} from './components/AdminPhotoManagerModal';
import { AdminLandmarkEditorModal } from './components/AdminLandmarkEditorModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Footer } from './components/Footer';

const DEFAULT_FILTERS: LandmarkFilterState = {
  query: '',
  category: 'all',
  governorateId: 'all',
  unescoOnly: false,
  civilization: 'all',
  sortBy: 'featured',
};

const VALID_VIEWS = new Set<AppView>([
  'home',
  'explore',
  'map',
  'governorates',
  'archaeological',
  'religious',
  'nature',
  'museum',
  'planner',
  'trails',
  'itinerary',
  'culture',
  'games',
  'guide',
  'initiatives',
  'about',
  'admin',
]);

const VIEW_TITLES: Record<AppView, string> = {
  home: 'أرض السواد — المنصة الوطنية للسياحة والتراث العراقي',
  explore: 'اكتشف العراق — دليل المعالم | أرض السواد',
  map: 'خريطة العراق التفاعلية ومنشئ المسارات | أرض السواد',
  governorates: 'المحافظات العراقية الـ 18 | أرض السواد',
  archaeological: 'المواقع الأثرية والتاريخية في العراق | أرض السواد',
  religious: 'العتبات والمراقد والمواقع الدينية | أرض السواد',
  nature: 'الطبيعة والأهوار والمصايف في العراق | أرض السواد',
  museum: 'المتحف العراقي الرقمي والخط الزمني | أرض السواد',
  planner: 'خطط رحلتك الذكي والمسارات المقترحة | أرض السواد',
  trails: 'المسارات السياحية المقترحة | أرض السواد',
  itinerary: 'مساري المحفوظ | أرض السواد',
  culture: 'عِش العراق — الثقافة والضيافة | أرض السواد',
  games: 'الألعاب الثقافية والتراثية | أرض السواد',
  guide: 'دليل الزائر والخدمات السياحية | أرض السواد',
  initiatives: 'المبادرات الوطنية للتراث | أرض السواد',
  about: 'من نحن ومعايير التوثيق | أرض السواد',
  admin: 'لوحة التحكم والإدارة | أرض السواد',
};

function readInitialViewFromUrl(): AppView {
  try {
    const param = new URLSearchParams(window.location.search).get('view') as AppView | null;
    if (param && VALID_VIEWS.has(param)) return param;
  } catch {
    // Fallback to home
  }
  return 'home';
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { isAdmin, isLoading: isAuthLoading, signIn, signOut } = useSupabaseAuth();
  const {
    landmarks,
    governorateProfiles,
    isSyncing,
    refreshFromCloud,
    saveLandmark,
    deleteLandmark,
    updateLandmarkImages,
    updateGovernorateCoverImage,
    uploadPhotoToBucket,
    deletePhotoFromBucket,
    seedInitialDataToCloud,
  } = useCloudData();

  const {
    siteSettings,
    reviews,
    articles,
    artifacts,
    services,
    auditLogs,
    recordAudit,
    submitReview,
    reportReview,
    moderateReview,
    updateSiteSettings,
    saveArticles,
    saveServices,
    restoreBackup,
    subscribeNewsletter,
  } = usePlatformData(isAdmin);

  const [activeView, setActiveView] = useState<AppView>(readInitialViewFromUrl);
  const [filters, setFilters] = useState<LandmarkFilterState>(DEFAULT_FILTERS);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [mapFocusGovId, setMapFocusGovId] = useState<string | null>(null);
  const [mapFocusLandmarkId, setMapFocusLandmarkId] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Cross-section jump states
  const [initialArtifactToOpen, setInitialArtifactToOpen] =
    useState<MuseumArtifact | null>(null);
  const [initialArticleToOpen, setInitialArticleToOpen] =
    useState<CulturalArticle | null>(null);

  // Admin modal state
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [photoManagerRef, setPhotoManagerRef] = useState<
    { type: 'landmark'; id: string } | { type: 'governorate'; id: string } | null
  >(null);
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    landmarkId: string | null;
  }>({ isOpen: false, landmarkId: null });

  // Visitor personal itinerary (client preference) and session-scoped analytics
  const [itinerary, setItinerary] = useState<ItineraryEntry[]>(() =>
    loadItineraryFromStorage()
  );
  const [analytics, setAnalytics] = useState<PlatformAnalytics>(EMPTY_ANALYTICS);

  useEffect(() => {
    saveItineraryToStorage(itinerary);
  }, [itinerary]);

  // Dynamic SEO document.title + URL query sync
  useEffect(() => {
    document.title =
      activeView === 'home' ? siteSettings.siteTitleAr : VIEW_TITLES[activeView];
    try {
      const url = new URL(window.location.href);
      if (activeView === 'home') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', activeView);
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore history API issues in restricted frames
    }
  }, [activeView, siteSettings.siteTitleAr]);

  // Clear admin modals & return from admin view if signed out
  useEffect(() => {
    if (!isAdmin) {
      setPhotoManagerRef(null);
      setEditorState({ isOpen: false, landmarkId: null });
    }
  }, [isAdmin]);

  const savedIds = useMemo(
    () => new Set(itinerary.map((entry) => entry.landmarkId)),
    [itinerary]
  );

  const databaseStats = useMemo(
    () =>
      getDatabaseStats(landmarks, IRAQ_GOVERNORATES, DATABASE_METADATA.categories),
    [landmarks]
  );

  const effectiveFilters = useMemo<LandmarkFilterState>(() => {
    if (activeView === 'archaeological') {
      return { ...filters, category: 'archaeological' };
    }
    if (activeView === 'religious') {
      return { ...filters, category: 'religious' };
    }
    if (activeView === 'nature') {
      return { ...filters, category: 'nature_tourism' };
    }
    return filters;
  }, [activeView, filters]);

  const filteredLandmarks = useMemo(
    () => filterLandmarks(landmarks, IRAQ_GOVERNORATES, effectiveFilters),
    [landmarks, effectiveFilters]
  );

  const govMap = useMemo(
    () => new Map(IRAQ_GOVERNORATES.map((g) => [g.id, g])),
    []
  );

  const landmarkMap = useMemo(
    () => new Map(landmarks.map((l) => [l.id, l])),
    [landmarks]
  );

  const selectedLandmark = selectedLandmarkId
    ? landmarkMap.get(selectedLandmarkId) ?? null
    : null;

  const activePhotoManagerTarget: PhotoManagerTarget | null = useMemo(() => {
    if (!isAdmin || !photoManagerRef) return null;
    if (photoManagerRef.type === 'landmark') {
      const lm = landmarkMap.get(photoManagerRef.id);
      return lm ? { type: 'landmark', landmark: lm } : null;
    }
    const gov = govMap.get(photoManagerRef.id);
    const profile = governorateProfiles[photoManagerRef.id];
    return gov && profile ? { type: 'governorate', governorate: gov, profile } : null;
  }, [isAdmin, photoManagerRef, landmarkMap, govMap, governorateProfiles]);

  const editingLandmark: Landmark | null =
    isAdmin && editorState.isOpen && editorState.landmarkId
      ? landmarkMap.get(editorState.landmarkId) ?? null
      : null;

  const handleSelectLandmark = (landmark: Landmark) => {
    setSelectedLandmarkId(landmark.id);
    setAnalytics((prev) => ({
      ...prev,
      destinationViews: {
        ...prev.destinationViews,
        [landmark.id]: (prev.destinationViews[landmark.id] ?? 0) + 1,
      },
    }));
  };

  const handleNavigate = (view: AppView) => {
    setSelectedLandmarkId(null);
    if (view === 'explore') {
      setFilters((prev) => ({ ...prev, category: 'all' }));
    }
    setActiveView(view);
    if (view !== 'map') {
      setMapFocusGovId(null);
      setMapFocusLandmarkId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSave = (landmarkId: string) => {
    setItinerary((prev) => {
      const next = toggleItineraryEntry(prev, landmarkId);
      if (next.length > prev.length) {
        setAnalytics((a) => ({
          ...a,
          itinerarySavesCount: a.itinerarySavesCount + 1,
        }));
      }
      return next;
    });
  };

  const handleSaveMultipleStops = (landmarkIds: string[]) => {
    setItinerary((prev) => {
      const existing = new Set(prev.map((item) => item.landmarkId));
      const additions: ItineraryEntry[] = landmarkIds
        .filter((id) => !existing.has(id))
        .map((landmarkId) => ({
          landmarkId,
          addedAt: new Date().toISOString(),
          note: '',
        }));
      if (additions.length > 0) {
        setAnalytics((a) => ({
          ...a,
          itinerarySavesCount: a.itinerarySavesCount + additions.length,
        }));
        return [...prev, ...additions];
      }
      return prev;
    });
  };

  const handleUpdateNote = (landmarkId: string, note: string) => {
    setItinerary((prev) => updateItineraryNote(prev, landmarkId, note));
  };

  const handleMoveItinerary = (landmarkId: string, direction: 'up' | 'down') => {
    setItinerary((prev) => moveItineraryEntry(prev, landmarkId, direction));
  };

  const handleClearItinerary = () => {
    setItinerary([]);
  };

  const handleExploreGovernorate = (governorateId: string) => {
    setFilters({ ...DEFAULT_FILTERS, governorateId });
    setActiveView('explore');
    setAnalytics((prev) => ({
      ...prev,
      governorateViews: {
        ...prev.governorateViews,
        [governorateId]: (prev.governorateViews[governorateId] ?? 0) + 1,
      },
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFocusGovernorateOnMap = (governorateId: string) => {
    setMapFocusLandmarkId(null);
    setMapFocusGovId(governorateId);
    setFilters((prev) => ({ ...prev, governorateId }));
    setActiveView('map');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewLandmarkOnMap = (landmark: Landmark) => {
    setSelectedLandmarkId(null);
    setMapFocusGovId(landmark.governorate_id);
    setMapFocusLandmarkId(landmark.id);
    setFilters((prev) => ({ ...prev, governorateId: landmark.governorate_id }));
    setActiveView('map');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickSearchFromHome = (query: string) => {
    setFilters({ ...DEFAULT_FILTERS, query });
    setActiveView('explore');
    setAnalytics((prev) => ({
      ...prev,
      searchTerms: {
        ...prev.searchTerms,
        [query]: (prev.searchTerms[query] ?? 0) + 1,
      },
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubscribeNewsletter = async (email: string) => {
    const res = await subscribeNewsletter(email);
    if (res.ok) {
      setAnalytics((prev) => ({
        ...prev,
        newsletterSubscribersCount: prev.newsletterSubscribersCount + 1,
      }));
    }
    return res;
  };

  const handleRequestInstall = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowInstallModal(true);
      }
      return;
    }
    setShowInstallModal(true);
  };

  const handleOpenLandmarkPhotos = (landmark: Landmark) => {
    if (!isAdmin) return;
    setPhotoManagerRef({ type: 'landmark', id: landmark.id });
  };

  const handleOpenGovPhotos = (governorate: Governorate, _profile: GovernorateProfile) => {
    if (!isAdmin) return;
    setPhotoManagerRef({ type: 'governorate', id: governorate.id });
  };

  const handleOpenLandmarkEditor = (landmark: Landmark | null) => {
    if (!isAdmin) return;
    setEditorState({ isOpen: true, landmarkId: landmark ? landmark.id : null });
  };

  const categoryExploreMeta = useMemo(() => {
    if (activeView === 'archaeological') {
      return {
        kicker: 'إرث بلاد الرافدين والحضارات العريقة',
        title: 'المواقع الأثرية والتاريخية في العراق',
        subtitle:
          'من زقورة أور وبابل وأوروك وآشور والحضر إلى المدرسة المستنصرية وملوية سامراء.',
      };
    }
    if (activeView === 'religious') {
      return {
        kicker: 'السياحة الدينية والعتبات المقدسة',
        title: 'العتبات والمراقد والمواقع الدينية',
        subtitle:
          'العتبات المقدسة في النجف وكربلاء والكاظمية وسامراء، والجوامع والأديرة التاريخية.',
      };
    }
    if (activeView === 'nature') {
      return {
        kicker: 'التنوع البيئي من الأهوار إلى جبال كردستان',
        title: 'الطبيعة والأهوار والمصايف العراقية',
        subtitle:
          'أهوار جنوب العراق المدرجة في اليونسكو، وشلالات وبحيرات ومصايف إقليم كردستان.',
      };
    }
    return {
      kicker: 'دليل الوجهات الموثّقة في العراق',
      title: 'اكتشف معالم أرض السواد',
      subtitle: undefined,
    };
  }, [activeView]);

  const isExploreFamilyView =
    activeView === 'explore' ||
    activeView === 'archaeological' ||
    activeView === 'religious' ||
    activeView === 'nature';

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#252B29] transition-colors duration-200 dark:bg-[#102F29] dark:text-[#F8F6F0]">
      <Header
        activeView={activeView}
        onNavigate={handleNavigate}
        savedCount={itinerary.length}
        isInstalled={isInstalled}
        isAdmin={isAdmin}
        onRequestInstall={handleRequestInstall}
        onOpenAdminLogin={() => setShowAdminLoginModal(true)}
      />

      {isAdmin && activeView !== 'admin' && (
        <AdminBar
          isSyncing={isSyncing}
          onOpenDashboard={() => handleNavigate('admin')}
          onAddLandmark={() => handleOpenLandmarkEditor(null)}
          onSeedCloudData={seedInitialDataToCloud}
          onRefreshCloud={refreshFromCloud}
          onSignOut={signOut}
        />
      )}

      <main>
        {activeView === 'home' && (
          <HomeView
            landmarks={landmarks}
            governorates={IRAQ_GOVERNORATES}
            stats={databaseStats}
            settings={siteSettings}
            artifacts={artifacts}
            articles={articles}
            initiatives={NATIONAL_INITIATIVES}
            isSaved={(id) => savedIds.has(id)}
            onToggleSave={handleToggleSave}
            onSelectLandmark={handleSelectLandmark}
            onSelectGovernorate={handleExploreGovernorate}
            onNavigate={handleNavigate}
            onOpenArtifact={(artifact) => {
              setInitialArtifactToOpen(artifact);
              handleNavigate('museum');
            }}
            onOpenArticle={(article) => {
              setInitialArticleToOpen(article);
              handleNavigate('culture');
            }}
            onQuickSearch={handleQuickSearchFromHome}
            onSubscribeNewsletter={handleSubscribeNewsletter}
          />
        )}

        {isExploreFamilyView && (
          <ExploreSection
            landmarks={filteredLandmarks}
            allLandmarks={landmarks}
            allLandmarksCount={databaseStats.totalLandmarks}
            unescoCount={databaseStats.unescoCount}
            nationalLandmarksCount={databaseStats.nationalLandmarksCount}
            categoryStats={databaseStats.categoryStats}
            governorates={IRAQ_GOVERNORATES}
            governorateProfiles={governorateProfiles}
            filters={effectiveFilters}
            savedIds={savedIds}
            isAdmin={isAdmin}
            sectionKicker={categoryExploreMeta.kicker}
            sectionTitle={categoryExploreMeta.title}
            sectionSubtitle={categoryExploreMeta.subtitle}
            onChangeFilters={(partial) => {
              if (partial.category && activeView !== 'explore') {
                setActiveView('explore');
              }
              setFilters((prev) => ({ ...prev, ...partial }));
            }}
            onResetFilters={() => {
              setFilters(DEFAULT_FILTERS);
              if (activeView !== 'explore') setActiveView('explore');
            }}
            onSelectLandmark={handleSelectLandmark}
            onToggleSave={handleToggleSave}
            onAdminManageLandmarkPhotos={handleOpenLandmarkPhotos}
            onAdminEditLandmark={handleOpenLandmarkEditor}
            onAdminManageGovPhotos={handleOpenGovPhotos}
          />
        )}

        {activeView === 'governorates' && (
          <GovernoratesView
            governorates={IRAQ_GOVERNORATES}
            governorateProfiles={governorateProfiles}
            landmarks={landmarks}
            nationalLandmarksCount={databaseStats.nationalLandmarksCount}
            isAdmin={isAdmin}
            onExploreGovernorate={handleExploreGovernorate}
            onFocusGovernorateOnMap={handleFocusGovernorateOnMap}
            onAdminManageGovPhotos={handleOpenGovPhotos}
          />
        )}

        {activeView === 'map' && (
          <IraqMapView
            governorates={IRAQ_GOVERNORATES}
            allLandmarks={landmarks}
            filteredLandmarks={filteredLandmarks}
            categoryStats={databaseStats.categoryStats}
            unescoCount={databaseStats.unescoCount}
            nationalLandmarksCount={databaseStats.nationalLandmarksCount}
            filters={filters}
            onChangeFilters={(partial) =>
              setFilters((prev) => ({ ...prev, ...partial }))
            }
            onResetFilters={() => setFilters(DEFAULT_FILTERS)}
            initialFocusGovernorateId={mapFocusGovId}
            initialFocusLandmarkId={mapFocusLandmarkId}
            theme={theme}
            onToggleTheme={toggleTheme}
            onSelectLandmark={handleSelectLandmark}
            onSaveRouteToItinerary={handleSaveMultipleStops}
          />
        )}

        {(activeView === 'planner' ||
          activeView === 'trails' ||
          activeView === 'itinerary') && (
          <SmartTravelPlannerView
            key={activeView}
            initialTab={
              activeView === 'trails'
                ? 'trails'
                : activeView === 'itinerary'
                  ? 'saved'
                  : 'smart'
            }
            landmarks={landmarks}
            governorates={IRAQ_GOVERNORATES}
            entries={itinerary}
            savedIds={savedIds}
            onSelectLandmark={handleSelectLandmark}
            onSaveMultipleStops={handleSaveMultipleStops}
            onRemoveEntry={handleToggleSave}
            onUpdateNote={handleUpdateNote}
            onMoveEntry={handleMoveItinerary}
            onClearAll={handleClearItinerary}
            onExplore={() => handleNavigate('explore')}
          />
        )}

        {activeView === 'museum' && (
          <DigitalMuseumView
            artifacts={artifacts}
            landmarks={landmarks}
            initialSelectedArtifact={initialArtifactToOpen}
            onConsumeInitialArtifact={() => setInitialArtifactToOpen(null)}
            onSelectLandmark={handleSelectLandmark}
            onViewArtifact={(artifact) =>
              setAnalytics((prev) => ({
                ...prev,
                artifactViews: {
                  ...prev.artifactViews,
                  [artifact.id]: (prev.artifactViews[artifact.id] ?? 0) + 1,
                },
              }))
            }
          />
        )}

        {activeView === 'culture' && (
          <LiveIraqCultureView
            articles={articles}
            initialSelectedArticle={initialArticleToOpen}
            onConsumeInitialArticle={() => setInitialArticleToOpen(null)}
          />
        )}

        {activeView === 'games' && <CulturalGamesView />}

        {activeView === 'guide' && (
          <VisitorGuideView services={services} governorates={IRAQ_GOVERNORATES} />
        )}

        {activeView === 'initiatives' && (
          <NationalInitiativesView initiatives={NATIONAL_INITIATIVES} />
        )}

        {activeView === 'about' && (
          <AboutView
            stats={databaseStats}
            artifactsCount={artifacts.length}
            articlesCount={articles.length}
            onNavigate={handleNavigate}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboardView
            isAdmin={isAdmin}
            isAuthLoading={isAuthLoading}
            isSyncing={isSyncing}
            landmarks={landmarks}
            governorates={IRAQ_GOVERNORATES}
            stats={databaseStats}
            settings={siteSettings}
            reviews={reviews}
            articles={articles}
            artifacts={artifacts}
            services={services}
            analytics={analytics}
            auditLogs={auditLogs}
            onOpenAdminLogin={() => setShowAdminLoginModal(true)}
            onSignOut={async () => {
              const res = await signOut();
              handleNavigate('home');
              return res;
            }}
            onAddLandmark={() => handleOpenLandmarkEditor(null)}
            onEditLandmark={handleOpenLandmarkEditor}
            onManageLandmarkPhotos={handleOpenLandmarkPhotos}
            onSaveLandmark={async (lm) => {
              const res = await saveLandmark(lm);
              if (res.ok) {
                recordAudit('حفظ معلم', 'landmark', lm.name_ar);
              }
              return res;
            }}
            onSeedCloudData={seedInitialDataToCloud}
            onRefreshCloud={refreshFromCloud}
            onUpdateSettings={updateSiteSettings}
            onModerateReview={moderateReview}
            onSaveArticles={saveArticles}
            onSaveServices={saveServices}
            onRestoreBackup={restoreBackup}
          />
        )}
      </main>

      <Footer
        totalGovernorates={databaseStats.totalGovernorates}
        totalLandmarks={databaseStats.totalLandmarks}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={handleNavigate}
        onOpenInstall={handleRequestInstall}
        isInstalled={isInstalled}
      />

      <MobileBottomNav
        activeView={activeView}
        onNavigate={handleNavigate}
        savedCount={itinerary.length}
      />

      <DestinationDetailModal
        landmark={selectedLandmark}
        governorate={
          selectedLandmark ? govMap.get(selectedLandmark.governorate_id) : undefined
        }
        governorates={IRAQ_GOVERNORATES}
        allLandmarks={landmarks}
        reviews={reviews}
        isSaved={selectedLandmark ? savedIds.has(selectedLandmark.id) : false}
        isAdmin={isAdmin}
        onClose={() => setSelectedLandmarkId(null)}
        onToggleSave={handleToggleSave}
        onViewOnMap={handleViewLandmarkOnMap}
        onSelectLandmark={handleSelectLandmark}
        onSubmitReview={submitReview}
        onReportReview={reportReview}
        onAdminManagePhotos={handleOpenLandmarkPhotos}
        onAdminEditLandmark={handleOpenLandmarkEditor}
      />

      <PWAInstallModal
        isOpen={showInstallModal}
        isInstallable={isInstallable}
        isIOS={isIOS}
        onClose={() => setShowInstallModal(false)}
        onInstall={install}
      />

      <AdminLoginModal
        isOpen={showAdminLoginModal}
        isAdmin={isAdmin}
        onClose={() => setShowAdminLoginModal(false)}
        onSignIn={async (email, password) => {
          const res = await signIn(email, password);
          if (!res.error) {
            void recordAudit('تسجيل دخول إداري', 'auth', 'دخول ناجح إلى لوحة الإدارة');
          }
          return res;
        }}
        onSignOut={signOut}
      />

      {isAdmin && (
        <>
          <AdminPhotoManagerModal
            target={activePhotoManagerTarget}
            onClose={() => setPhotoManagerRef(null)}
            onUploadPhoto={uploadPhotoToBucket}
            onDeleteStoragePhoto={deletePhotoFromBucket}
            onUpdateLandmarkImages={async (lm, imgs) => {
              const res = await updateLandmarkImages(lm, imgs);
              if (res.ok) recordAudit('تحديث صور معلم', 'media', lm.name_ar);
              return res;
            }}
            onUpdateGovernorateCover={async (id, url) => {
              const res = await updateGovernorateCoverImage(id, url);
              if (res.ok) recordAudit('تحديث غلاف محافظة', 'media', id);
              return res;
            }}
          />

          <AdminLandmarkEditorModal
            isOpen={editorState.isOpen}
            landmark={editingLandmark}
            governorates={IRAQ_GOVERNORATES}
            onClose={() => setEditorState({ isOpen: false, landmarkId: null })}
            onSave={async (lm) => {
              const res = await saveLandmark(lm);
              if (res.ok) recordAudit('تعديل/إضافة معلم', 'landmark', lm.name_ar);
              return res;
            }}
            onDelete={async (id) => {
              const res = await deleteLandmark(id);
              if (res.ok) {
                recordAudit('حذف معلم', 'landmark', id);
                if (selectedLandmarkId === id) {
                  setSelectedLandmarkId(null);
                }
              }
              return res;
            }}
          />
        </>
      )}

      <OfflineIndicator />
    </div>
  );
}
