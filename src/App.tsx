import { useEffect, useMemo, useState } from 'react';
import { DATABASE_METADATA, IRAQ_GOVERNORATES } from './data/database';
import { buildDynamicCuratedTrails } from './data/trails';
import {
  AppView,
  Governorate,
  GovernorateProfile,
  ItineraryEntry,
  Landmark,
  LandmarkFilterState,
} from './types/tourism';
import { filterLandmarks, getDatabaseStats } from './utils/arabicSearch';
import {
  loadItineraryFromStorage,
  moveItineraryEntry,
  saveItineraryToStorage,
  toggleItineraryEntry,
  updateItineraryNote,
} from './utils/itinerary';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useTheme } from './hooks/useTheme';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useCloudData } from './hooks/useCloudData';
import { Header } from './components/Header';
import { AdminBar } from './components/AdminBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HeroSection } from './components/HeroSection';
import { ExploreSection } from './components/ExploreSection';
import { CuratedTrailsView } from './components/CuratedTrailsView';
import { GovernoratesView } from './components/GovernoratesView';
import { IraqMapView } from './components/IraqMapView';
import { ItineraryView } from './components/ItineraryView';
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
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { isAdmin, signIn, signUp, signOut } = useSupabaseAuth();
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

  const [activeView, setActiveView] = useState<AppView>('explore');
  const [filters, setFilters] = useState<LandmarkFilterState>(DEFAULT_FILTERS);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(null);
  const [mapFocusGovId, setMapFocusGovId] = useState<string | null>(null);
  const [mapFocusLandmarkId, setMapFocusLandmarkId] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Admin modal state (editor and photo manager strictly gated by isAdmin)
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [photoManagerRef, setPhotoManagerRef] = useState<
    { type: 'landmark'; id: string } | { type: 'governorate'; id: string } | null
  >(null);
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    landmarkId: string | null;
  }>({ isOpen: false, landmarkId: null });

  const [itinerary, setItinerary] = useState<ItineraryEntry[]>(() =>
    loadItineraryFromStorage()
  );

  useEffect(() => {
    saveItineraryToStorage(itinerary);
  }, [itinerary]);

  // Clear any open admin modals automatically if admin signs out
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
      getDatabaseStats(
        landmarks,
        IRAQ_GOVERNORATES,
        DATABASE_METADATA.categories
      ),
    [landmarks]
  );

  const curatedTrails = useMemo(
    () => buildDynamicCuratedTrails(landmarks),
    [landmarks]
  );

  const filteredLandmarks = useMemo(
    () => filterLandmarks(landmarks, IRAQ_GOVERNORATES, filters),
    [landmarks, filters]
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
  };

  const handleNavigate = (view: AppView) => {
    setSelectedLandmarkId(null);
    setActiveView(view);
    if (view !== 'map') {
      setMapFocusGovId(null);
      setMapFocusLandmarkId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSave = (landmarkId: string) => {
    setItinerary((prev) => toggleItineraryEntry(prev, landmarkId));
  };

  const handleSaveTrailToItinerary = (landmarkIds: string[]) => {
    setItinerary((prev) => {
      const existing = new Set(prev.map((item) => item.landmarkId));
      const additions: ItineraryEntry[] = landmarkIds
        .filter((id) => !existing.has(id))
        .map((landmarkId) => ({
          landmarkId,
          addedAt: new Date().toISOString(),
          note: '',
        }));
      return additions.length > 0 ? [...prev, ...additions] : prev;
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

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-[#1A2421] transition-colors duration-200 dark:bg-[#0D1B1E] dark:text-[#F1ECE2]">
      <Header
        activeView={activeView}
        onNavigate={handleNavigate}
        savedCount={itinerary.length}
        isInstalled={isInstalled}
        isAdmin={isAdmin}
        onRequestInstall={handleRequestInstall}
        onOpenAdminLogin={() => setShowAdminLoginModal(true)}
      />

      {/* Admin-Only Control Bar (Strictly invisible to regular visitors) */}
      {isAdmin && (
        <AdminBar
          isSyncing={isSyncing}
          onAddLandmark={() => handleOpenLandmarkEditor(null)}
          onSeedCloudData={seedInitialDataToCloud}
          onRefreshCloud={refreshFromCloud}
          onSignOut={signOut}
        />
      )}

      <main>
        {activeView === 'explore' && (
          <>
            <HeroSection
              totalGovernorates={databaseStats.totalGovernorates}
              totalLandmarks={databaseStats.totalLandmarks}
              unescoCount={databaseStats.unescoCount}
              theme={theme}
              onToggleTheme={toggleTheme}
              onOpenMap={() => handleNavigate('map')}
              onExploreGovernorates={() => handleNavigate('governorates')}
            />
            <ExploreSection
              landmarks={filteredLandmarks}
              allLandmarks={landmarks}
              allLandmarksCount={databaseStats.totalLandmarks}
              unescoCount={databaseStats.unescoCount}
              nationalLandmarksCount={databaseStats.nationalLandmarksCount}
              categoryStats={databaseStats.categoryStats}
              governorates={IRAQ_GOVERNORATES}
              governorateProfiles={governorateProfiles}
              filters={filters}
              savedIds={savedIds}
              isAdmin={isAdmin}
              onChangeFilters={(partial) =>
                setFilters((prev) => ({ ...prev, ...partial }))
              }
              onResetFilters={() => setFilters(DEFAULT_FILTERS)}
              onSelectLandmark={handleSelectLandmark}
              onToggleSave={handleToggleSave}
              onAdminManageLandmarkPhotos={handleOpenLandmarkPhotos}
              onAdminEditLandmark={handleOpenLandmarkEditor}
              onAdminManageGovPhotos={handleOpenGovPhotos}
            />
          </>
        )}

        {activeView === 'trails' && (
          <CuratedTrailsView
            trails={curatedTrails}
            landmarks={landmarks}
            governorates={IRAQ_GOVERNORATES}
            savedIds={savedIds}
            onSelectLandmark={handleSelectLandmark}
            onSaveTrailToItinerary={handleSaveTrailToItinerary}
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
          />
        )}

        {activeView === 'itinerary' && (
          <ItineraryView
            entries={itinerary}
            landmarks={landmarks}
            onSelectLandmark={handleSelectLandmark}
            onRemove={handleToggleSave}
            onUpdateNote={handleUpdateNote}
            onMove={handleMoveItinerary}
            onClearAll={handleClearItinerary}
            onExploreLandmarks={() => handleNavigate('explore')}
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
        isSaved={selectedLandmark ? savedIds.has(selectedLandmark.id) : false}
        isAdmin={isAdmin}
        onClose={() => setSelectedLandmarkId(null)}
        onToggleSave={handleToggleSave}
        onViewOnMap={handleViewLandmarkOnMap}
        onSelectLandmark={handleSelectLandmark}
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
        onSignIn={signIn}
        onSignUp={signUp}
        onSignOut={signOut}
      />

      {isAdmin && (
        <>
          <AdminPhotoManagerModal
            target={activePhotoManagerTarget}
            onClose={() => setPhotoManagerRef(null)}
            onUploadPhoto={uploadPhotoToBucket}
            onDeleteStoragePhoto={deletePhotoFromBucket}
            onUpdateLandmarkImages={updateLandmarkImages}
            onUpdateGovernorateCover={updateGovernorateCoverImage}
          />

          <AdminLandmarkEditorModal
            isOpen={editorState.isOpen}
            landmark={editingLandmark}
            governorates={IRAQ_GOVERNORATES}
            onClose={() => setEditorState({ isOpen: false, landmarkId: null })}
            onSave={saveLandmark}
            onDelete={async (id) => {
              const res = await deleteLandmark(id);
              if (res.ok && selectedLandmarkId === id) {
                setSelectedLandmarkId(null);
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
