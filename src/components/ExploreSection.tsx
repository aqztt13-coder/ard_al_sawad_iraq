import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  ChevronDown,
  Loader2,
  LocateFixed,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  DynamicCategoryStat,
  Governorate,
  GovernorateProfile,
  Landmark,
  LandmarkFilterState,
  LandmarkSortOption,
} from '../types/tourism';
import { getGovernorateProfile } from '../data/governorateProfiles';
import { CATEGORY_LABELS, getUniqueCivilizations } from '../utils/arabicSearch';
import { sortLandmarksByDistance } from '../utils/geo';
import { useGeolocation } from '../hooks/useGeolocation';
import { GovernorateProfileCard } from './GovernorateProfileCard';
import { LandmarkCard } from './LandmarkCard';

const PAGE_SIZE = 24;

interface ExploreSectionProps {
  landmarks: Landmark[];
  allLandmarks: Landmark[];
  allLandmarksCount: number;
  unescoCount: number;
  nationalLandmarksCount: number;
  categoryStats: DynamicCategoryStat[];
  governorates: Governorate[];
  governorateProfiles: Record<string, GovernorateProfile>;
  filters: LandmarkFilterState;
  savedIds: Set<string>;
  isAdmin?: boolean;
  sectionKicker?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  onChangeFilters: (next: Partial<LandmarkFilterState>) => void;
  onResetFilters: () => void;
  onSelectLandmark: (landmark: Landmark) => void;
  onToggleSave: (landmarkId: string) => void;
  onAdminManageLandmarkPhotos?: (landmark: Landmark) => void;
  onAdminEditLandmark?: (landmark: Landmark) => void;
  onAdminManageGovPhotos?: (governorate: Governorate, profile: GovernorateProfile) => void;
}

export const ExploreSection: React.FC<ExploreSectionProps> = ({
  landmarks,
  allLandmarks,
  allLandmarksCount,
  unescoCount,
  nationalLandmarksCount,
  categoryStats,
  governorates,
  governorateProfiles,
  filters,
  savedIds,
  isAdmin = false,
  sectionKicker = 'دليل الوجهات الموثّقة في العراق',
  sectionTitle = 'استكشف معالم أرض السواد',
  sectionSubtitle,
  onChangeFilters,
  onResetFilters,
  onSelectLandmark,
  onToggleSave,
  onAdminManageLandmarkPhotos,
  onAdminEditLandmark,
  onAdminManageGovPhotos,
}) => {
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  // Reset pagination whenever filters or dataset change so results always begin cleanly at the top
  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [
    filters.query,
    filters.category,
    filters.governorateId,
    filters.unescoOnly,
    filters.civilization,
    filters.sortBy,
    allLandmarksCount,
  ]);

  const {
    status: geoStatus,
    coords: userCoords,
    errorMessage: geoError,
    isNearMeActive,
    toggleNearMe,
    clearError: clearGeoError,
  } = useGeolocation();

  const governorateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lm of allLandmarks) {
      counts.set(lm.governorate_id, (counts.get(lm.governorate_id) ?? 0) + 1);
    }
    return counts;
  }, [allLandmarks]);

  const civilizationOptions = useMemo(
    () => getUniqueCivilizations(allLandmarks),
    [allLandmarks]
  );

  const displayItems = useMemo(() => {
    if (isNearMeActive && userCoords) {
      return sortLandmarksByDistance(landmarks, userCoords, governorates);
    }
    return landmarks.map((landmark) => ({ landmark, distanceKm: undefined }));
  }, [landmarks, isNearMeActive, userCoords, governorates]);

  const visibleItems = useMemo(
    () => displayItems.slice(0, visibleLimit),
    [displayItems, visibleLimit]
  );

  const selectedGovernorateMeta = useMemo(() => {
    if (filters.governorateId === 'all' || filters.governorateId === 'IQ-NATIONAL') {
      return null;
    }
    const governorate = governorates.find((g) => g.id === filters.governorateId);
    if (!governorate) return null;
    const profile =
      governorateProfiles[governorate.id] ?? getGovernorateProfile(governorate);
    if (!profile) return null;

    const govLandmarks = allLandmarks.filter(
      (l) => l.governorate_id === governorate.id
    );
    const govUnescoCount = govLandmarks.filter((l) => l.unesco_site).length;

    return {
      governorate,
      profile,
      totalLandmarksCount: govLandmarks.length,
      unescoCount: govUnescoCount,
    };
  }, [filters.governorateId, governorates, governorateProfiles, allLandmarks]);

  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.category !== 'all' ||
    filters.governorateId !== 'all' ||
    filters.unescoOnly ||
    Boolean(filters.civilization && filters.civilization !== 'all') ||
    Boolean(filters.sortBy && filters.sortBy !== 'featured');

  const remainingCount = Math.max(0, displayItems.length - visibleItems.length);

  return (
    <section
      id="landmarks-explorer"
      aria-labelledby="explorer-heading"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#8C6D2B] dark:text-[#E7C87B]">
            {sectionKicker}
          </p>
          <h1
            id="explorer-heading"
            className="mt-1 font-heritage text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-4xl"
          >
            {sectionTitle}
          </h1>
          {sectionSubtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#54635F] dark:text-[#A8B8B3]">
              {sectionSubtitle}
            </p>
          )}
        </div>

        <p
          data-testid="landmarks-count"
          className="text-xs font-medium text-[#54635F] dark:text-[#A5B4AF] tabular-nums"
        >
          {displayItems.length} من أصل {allLandmarksCount} معلماً
          {remainingCount > 0 ? ` · المعروض حالياً ${visibleItems.length}` : ''}
          {isNearMeActive ? ' · مرتّبة حسب الأقرب لموقعك' : ''}
        </p>
      </div>

      {/* Search, Governorate, Civilization & Sort Bar */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="relative md:col-span-5">
          <label htmlFor="landmark-search-input" className="sr-only">
            ابحث عن معلم ديني أو أثري أو طبيعي
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#64736F]"
            aria-hidden="true"
          />
          <input
            id="landmark-search-input"
            type="search"
            value={filters.query}
            onChange={(e) => onChangeFilters({ query: e.target.value })}
            placeholder="ابحث بالاسم العربي أو الإنجليزي أو المحافظة أو التصنيف (مثال: بابل، النجف، أور، أهوار)..."
            className="min-h-[46px] w-full rounded-xl border border-[#0F3D3E]/16 bg-white/90 pr-10 pl-10 text-sm text-[#1A2421] placeholder:text-[#7A8783] focus:border-[#0F3D3E] focus:outline-none dark:border-[#C89B3C]/24 dark:bg-[#132529] dark:text-[#F1ECE2] dark:placeholder:text-[#869691] dark:focus:border-[#C89B3C]"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChangeFilters({ query: '' })}
              aria-label="مسح نص البحث"
              className="absolute top-1/2 left-2.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#64736F] hover:bg-[#0F3D3E]/8 hover:text-[#0F3D3E] dark:text-[#A5B4AF]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="md:col-span-3">
          <label htmlFor="governorate-select" className="sr-only">
            تصفية حسب المحافظة
          </label>
          <select
            id="governorate-select"
            value={filters.governorateId}
            onChange={(e) => onChangeFilters({ governorateId: e.target.value })}
            className="min-h-[46px] w-full rounded-xl border border-[#173F35]/16 bg-white/90 px-3 text-sm font-medium text-[#1A2421] focus:border-[#173F35] focus:outline-none dark:border-[#C5A15A]/24 dark:bg-[#13352F] dark:text-[#F8F6F0] dark:focus:border-[#C5A15A]"
          >
            <option value="all">
              جميع المحافظات ({governorates.length})
            </option>
            {governorates.map((gov) => {
              const count = governorateCounts.get(gov.id) ?? 0;
              return (
                <option key={gov.id} value={gov.id}>
                  {gov.name_ar} ({count})
                </option>
              );
            })}
            {nationalLandmarksCount > 0 && (
              <option value="IQ-NATIONAL">
                معالم وطنية ({nationalLandmarksCount})
              </option>
            )}
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="civilization-select" className="sr-only">
            تصفية حسب الحقبة أو الحضارة
          </label>
          <select
            id="civilization-select"
            value={filters.civilization ?? 'all'}
            onChange={(e) => onChangeFilters({ civilization: e.target.value })}
            className="min-h-[46px] w-full rounded-xl border border-[#173F35]/16 bg-white/90 px-3 text-sm font-medium text-[#1A2421] focus:border-[#173F35] focus:outline-none dark:border-[#C5A15A]/24 dark:bg-[#13352F] dark:text-[#F8F6F0]"
          >
            <option value="all">كل الحقب والحضارات</option>
            {civilizationOptions.slice(0, 40).map((era) => (
              <option key={era} value={era}>
                {era}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="sort-select" className="sr-only">
            ترتيب النتائج
          </label>
          <select
            id="sort-select"
            value={filters.sortBy ?? 'featured'}
            onChange={(e) =>
              onChangeFilters({ sortBy: e.target.value as LandmarkSortOption })
            }
            className="min-h-[46px] w-full rounded-xl border border-[#173F35]/16 bg-white/90 px-3 text-sm font-medium text-[#1A2421] focus:border-[#173F35] focus:outline-none dark:border-[#C5A15A]/24 dark:bg-[#13352F] dark:text-[#F8F6F0]"
          >
            <option value="featured">الترتيب: الأبرز</option>
            <option value="alphabetical">الترتيب: أبجدياً</option>
            <option value="unesco_first">الترتيب: اليونسكو أولاً</option>
            <option value="recent">الترتيب: الأحدث إضافة</option>
          </select>
        </div>
      </div>

      {/* Dynamic Category Segmented Controls (with live counts) + UNESCO Filter + Near Me */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="تصفية المعالم حسب التصنيف والموقع"
          className="flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            data-testid="category-filter-all"
            onClick={() => onChangeFilters({ category: 'all' })}
            aria-pressed={filters.category === 'all'}
            className={`min-h-[42px] rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] ${
              filters.category === 'all'
                ? 'bg-[#0F3D3E] text-[#F9F6F0] dark:bg-[#C89B3C] dark:text-[#0D1B1E]'
                : 'border border-[#0F3D3E]/14 bg-white/80 text-[#3D4B47] hover:bg-white dark:border-[#C89B3C]/20 dark:bg-[#132529] dark:text-[#C5D0CC] dark:hover:bg-[#193035]'
            }`}
          >
            {CATEGORY_LABELS.all} ({allLandmarksCount})
          </button>

          {categoryStats.map((cat) => {
            const isActive = filters.category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                data-testid={`category-filter-${cat.id}`}
                onClick={() => onChangeFilters({ category: cat.id })}
                aria-pressed={isActive}
                className={`min-h-[42px] rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] ${
                  isActive
                    ? 'bg-[#0F3D3E] text-[#F9F6F0] dark:bg-[#C89B3C] dark:text-[#0D1B1E]'
                    : 'border border-[#0F3D3E]/14 bg-white/80 text-[#3D4B47] hover:bg-white dark:border-[#C89B3C]/20 dark:bg-[#132529] dark:text-[#C5D0CC] dark:hover:bg-[#193035]'
                }`}
              >
                {cat.label_ar} ({cat.count})
              </button>
            );
          })}

          <button
            type="button"
            data-testid="unesco-filter-toggle"
            onClick={() => onChangeFilters({ unescoOnly: !filters.unescoOnly })}
            aria-pressed={filters.unescoOnly}
            className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] ${
              filters.unescoOnly
                ? 'border border-[#C89B3C] bg-[#C89B3C] text-[#0D1B1E]'
                : 'border border-[#C89B3C]/45 bg-[#C89B3C]/10 text-[#7B5B17] hover:bg-[#C89B3C]/18 dark:border-[#C89B3C]/35 dark:bg-[#C89B3C]/12 dark:text-[#E7C87B] dark:hover:bg-[#C89B3C]/22'
            }`}
          >
            <Award className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>مواقع اليونسكو ({unescoCount})</span>
          </button>

          <button
            type="button"
            data-testid="near-me-toggle"
            onClick={toggleNearMe}
            disabled={geoStatus === 'loading'}
            aria-pressed={isNearMeActive}
            className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] disabled:opacity-70 ${
              isNearMeActive
                ? 'border border-[#1B4B72] bg-[#1B4B72] text-[#F9F6F0] dark:border-[#96C2E6] dark:bg-[#1B4B72] dark:text-[#F9F6F0]'
                : 'border border-[#1B4B72]/35 bg-[#1B4B72]/8 text-[#1B4B72] hover:bg-[#1B4B72]/15 dark:border-[#96C2E6]/35 dark:bg-[#1B4B72]/20 dark:text-[#96C2E6] dark:hover:bg-[#1B4B72]/30'
            }`}
          >
            {geoStatus === 'loading' ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>
              {geoStatus === 'loading' ? 'جارٍ تحديد موقعك...' : 'الأقرب لموقعي'}
            </span>
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            data-testid="reset-filters-btn"
            onClick={onResetFilters}
            className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-[#1B4B72] hover:underline dark:text-[#96C2E6] whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>إعادة تعيين التصفية</span>
          </button>
        )}
      </div>

      {/* Graceful Arabic Geolocation Error Notice */}
      {geoError && (
        <div
          role="alert"
          data-testid="geolocation-error"
          className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-[#C89B3C]/45 bg-[#FFF9EB] px-4 py-3 text-xs leading-relaxed text-[#6E4F12] dark:border-[#C89B3C]/35 dark:bg-[#1D2418] dark:text-[#F2D99B]"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
            <p>{geoError}</p>
          </div>
          <button
            type="button"
            onClick={clearGeoError}
            aria-label="إغلاق تنبيه الموقع"
            className="shrink-0 rounded-md p-1 text-current opacity-75 hover:opacity-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Governorate Profile Header Card ("عن المحافظة") when a governorate is selected */}
      {selectedGovernorateMeta && (
        <GovernorateProfileCard
          governorate={selectedGovernorateMeta.governorate}
          profile={selectedGovernorateMeta.profile}
          totalLandmarksCount={selectedGovernorateMeta.totalLandmarksCount}
          unescoCount={selectedGovernorateMeta.unescoCount}
          isAdmin={isAdmin}
          onManagePhotos={onAdminManageGovPhotos}
        />
      )}

      {/* Landmarks Grid or Empty State */}
      {displayItems.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[#0F3D3E]/12 bg-white/80 p-12 text-center dark:border-[#C89B3C]/18 dark:bg-[#132529]/85">
          <h3 className="font-heritage text-2xl font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
            لا توجد معالم مطابقة لخيارات البحث الحالية
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#54635F] dark:text-[#A5B4AF]">
            قد تكون المحافظة أو التصنيف المحدد لا يحتوي على نتائج مطابقة حالياً؛ يمكنك
            إعادة تعيين التصفية لعرض جميع الوجهات ({allLandmarksCount} معلماً عبر{' '}
            {governorates.length} محافظة).
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 min-h-[44px] rounded-xl bg-[#0F3D3E] px-6 py-2.5 text-xs font-semibold text-[#F9F6F0] hover:bg-[#144F50] dark:bg-[#C89B3C] dark:text-[#0D1B1E]"
          >
            عرض جميع الوجهات
          </button>
        </div>
      ) : (
        <>
          <div
            data-testid="landmarks-grid"
            className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visibleItems.map(({ landmark, distanceKm }) => (
              <LandmarkCard
                key={landmark.id}
                landmark={landmark}
                distanceKm={distanceKm}
                isSaved={savedIds.has(landmark.id)}
                isAdmin={isAdmin}
                onSelect={onSelectLandmark}
                onToggleSave={onToggleSave}
                onManagePhotos={onAdminManageLandmarkPhotos}
                onEditLandmark={onAdminEditLandmark}
              />
            ))}
          </div>

          {remainingCount > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                data-testid="load-more-landmarks-btn"
                onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0F3D3E] px-6 py-2.5 text-sm font-semibold text-[#F9F6F0] transition-colors hover:bg-[#144F50] dark:bg-[#C89B3C] dark:text-[#0D1B1E] dark:hover:bg-[#D7AC4D] tabular-nums"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                <span>
                  عرض المزيد ({Math.min(PAGE_SIZE, remainingCount)} من أصل{' '}
                  {remainingCount} متبقية)
                </span>
              </button>

              <button
                type="button"
                data-testid="show-all-landmarks-btn"
                onClick={() => setVisibleLimit(displayItems.length)}
                className="inline-flex min-h-[44px] items-center rounded-xl border border-[#0F3D3E]/18 bg-white/85 px-5 py-2.5 text-sm font-semibold text-[#0F3D3E] transition-colors hover:bg-white dark:border-[#C89B3C]/28 dark:bg-[#132529] dark:text-[#E7C87B] tabular-nums"
              >
                عرض الكل ({displayItems.length})
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
