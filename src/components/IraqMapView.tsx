import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Award,
  ExternalLink,
  MapPin,
  Moon,
  RotateCcw,
  Search,
  Sun,
  X,
} from 'lucide-react';
import {
  DynamicCategoryStat,
  Governorate,
  Landmark,
  LandmarkCategory,
  LandmarkFilterState,
} from '../types/tourism';
import { ThemeMode } from '../hooks/useTheme';
import {
  CATEGORY_LABELS,
  CATEGORY_SHORT_LABELS,
  getLandmarkGoogleMapsUrl,
} from '../utils/arabicSearch';
import {
  IRAQ_GEOGRAPHIC_CENTER,
  resolveGovernorateCenter,
  resolveLandmarkCoordinates,
} from '../utils/coordinates';
import { UnescoBadge } from './UnescoBadge';

interface IraqMapViewProps {
  governorates: Governorate[];
  allLandmarks: Landmark[];
  filteredLandmarks: Landmark[];
  categoryStats: DynamicCategoryStat[];
  unescoCount: number;
  nationalLandmarksCount: number;
  filters: LandmarkFilterState;
  onChangeFilters: (next: Partial<LandmarkFilterState>) => void;
  onResetFilters: () => void;
  initialFocusGovernorateId?: string | null;
  initialFocusLandmarkId?: string | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onSelectLandmark: (landmark: Landmark) => void;
}

const CATEGORY_COLORS: Record<LandmarkCategory, { fill: string; ring: string }> = {
  religious: { fill: '#C89B3C', ring: '#0F3D3E' },
  archaeological: { fill: '#1B4B72', ring: '#F9F6F0' },
  nature_tourism: { fill: '#0F3D3E', ring: '#E7C87B' },
};

const IRAQ_CENTER: [number, number] = [
  IRAQ_GEOGRAPHIC_CENTER.lat,
  IRAQ_GEOGRAPHIC_CENTER.lng,
];
const IRAQ_DEFAULT_ZOOM = 6;

// Simplified offline-safe silhouette outline of Iraq + Tigris & Euphrates paths
const IRAQ_OUTLINE: [number, number][] = [
  [37.34, 42.36],
  [37.22, 43.95],
  [36.88, 44.82],
  [35.72, 46.15],
  [34.35, 45.45],
  [33.15, 46.12],
  [31.85, 47.65],
  [30.98, 47.92],
  [29.95, 48.55],
  [29.88, 47.95],
  [30.08, 47.12],
  [29.1, 46.55],
  [29.9, 44.75],
  [31.18, 42.15],
  [32.22, 39.2],
  [33.36, 38.79],
  [34.36, 40.98],
  [36.05, 41.22],
  [37.06, 42.35],
];

const TIGRIS_LINE: [number, number][] = [
  [37.1, 42.4],
  [36.35, 43.16],
  [35.47, 43.25],
  [34.2, 43.87],
  [33.32, 44.37],
  [32.51, 45.82],
  [31.84, 47.15],
  [31.0, 47.44],
  [30.51, 47.82],
];

const EUPHRATES_LINE: [number, number][] = [
  [34.38, 41.0],
  [34.05, 42.38],
  [33.43, 43.3],
  [32.54, 44.42],
  [32.02, 44.41],
  [31.32, 45.28],
  [31.04, 46.26],
  [31.0, 47.44],
];

export const IraqMapView: React.FC<IraqMapViewProps> = ({
  governorates,
  allLandmarks,
  filteredLandmarks,
  categoryStats,
  unescoCount,
  nationalLandmarksCount,
  filters,
  onChangeFilters,
  onResetFilters,
  initialFocusGovernorateId,
  initialFocusLandmarkId,
  theme,
  onToggleTheme,
  onSelectLandmark,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(
    initialFocusLandmarkId ?? null
  );

  const govMap = useMemo(
    () => new Map(governorates.map((g) => [g.id, g])),
    [governorates]
  );

  const governorateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lm of allLandmarks) {
      counts.set(lm.governorate_id, (counts.get(lm.governorate_id) ?? 0) + 1);
    }
    return counts;
  }, [allLandmarks]);

  const activeLandmark = useMemo(() => {
    if (!activeLandmarkId) return null;
    return (
      filteredLandmarks.find((l) => l.id === activeLandmarkId) ??
      allLandmarks.find((l) => l.id === activeLandmarkId) ??
      null
    );
  }, [activeLandmarkId, filteredLandmarks, allLandmarks]);

  // Precompute deterministic resolved positions per landmark (preserving governorate grouping index)
  const resolvedCoordsById = useMemo(() => {
    const groupRank = new Map<string, number>();
    const map = new Map<string, { lat: number; lng: number; isApproximate: boolean }>();
    for (const landmark of allLandmarks) {
      const rank = groupRank.get(landmark.governorate_id) ?? 0;
      groupRank.set(landmark.governorate_id, rank + 1);
      map.set(
        landmark.id,
        resolveLandmarkCoordinates(landmark, governorates, rank)
      );
    }
    return map;
  }, [allLandmarks, governorates]);

  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.category !== 'all' ||
    filters.governorateId !== 'all' ||
    filters.unescoOnly;

  // Mount Leaflet map once with free keyless OpenStreetMap tiles + offline-resilient Iraq silhouette & twin rivers
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: IRAQ_CENTER,
      zoom: IRAQ_DEFAULT_ZOOM,
      minZoom: 5,
      maxZoom: 16,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Subtle Mesopotamian heritage vector overlay (Iraq border + Tigris & Euphrates)
    L.polygon(IRAQ_OUTLINE, {
      color: '#C89B3C',
      weight: 1.5,
      opacity: 0.65,
      fillColor: '#0F3D3E',
      fillOpacity: 0.05,
      interactive: false,
    }).addTo(map);

    L.polyline(TIGRIS_LINE, {
      color: '#1B4B72',
      weight: 2,
      opacity: 0.45,
      dashArray: '4 4',
      interactive: false,
    }).addTo(map);

    L.polyline(EUPHRATES_LINE, {
      color: '#1B4B72',
      weight: 2,
      opacity: 0.45,
      dashArray: '4 4',
      interactive: false,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Dynamically sync markers whenever filteredLandmarks or database updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    filteredLandmarks.forEach((landmark) => {
      const coords =
        resolvedCoordsById.get(landmark.id) ??
        resolveLandmarkCoordinates(landmark, governorates);
      const colors = CATEGORY_COLORS[landmark.category] ?? CATEGORY_COLORS.archaeological;
      const ringColor = landmark.unesco_site ? '#E7C87B' : colors.ring;
      const markerSize = landmark.unesco_site ? 26 : 20;
      const icon = L.divIcon({
        className: 'ard-alsawad-marker',
        html: `<div style="width:${markerSize}px;height:${markerSize}px;border-radius:9999px;background:${colors.fill};border:2.5px solid ${ringColor};box-shadow:0 3px 10px rgba(13,27,30,0.35);display:flex;align-items:center;justify-content:center;"><span style="width:5px;height:5px;border-radius:9999px;background:#FFFFFF;display:block;"></span></div>`,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker([coords.lat, coords.lng], {
        icon,
        title: landmark.name_ar,
        alt: landmark.name_ar,
      });

      const unescoSuffix = landmark.unesco_site ? ' ★ يونسكو' : '';
      marker.bindTooltip(
        `${landmark.name_ar} — ${landmark.governorate_ar}${unescoSuffix}`,
        {
          direction: 'top',
          offset: [0, -12],
        }
      );

      marker.on('click', () => {
        setActiveLandmarkId(landmark.id);
        map.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), 9), {
          duration: 0.65,
        });
      });

      marker.addTo(layer);
    });
  }, [filteredLandmarks, resolvedCoordsById, governorates]);

  // Focus requested governorate or landmark on open / filter change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (initialFocusLandmarkId) {
      const target = allLandmarks.find((l) => l.id === initialFocusLandmarkId);
      if (target) {
        const coords =
          resolvedCoordsById.get(target.id) ??
          resolveLandmarkCoordinates(target, governorates);
        setActiveLandmarkId(target.id);
        map.setView([coords.lat, coords.lng], 10);
        return;
      }
    }

    const focusGovId =
      filters.governorateId !== 'all'
        ? filters.governorateId
        : initialFocusGovernorateId ?? null;

    if (focusGovId && focusGovId !== 'IQ-NATIONAL') {
      const gov = govMap.get(focusGovId);
      if (gov) {
        const center = resolveGovernorateCenter(gov);
        map.setView([center.lat, center.lng], 9);
      }
    } else if (filters.governorateId === 'all' && !initialFocusGovernorateId) {
      map.setView(IRAQ_CENTER, IRAQ_DEFAULT_ZOOM);
    }
  }, [
    initialFocusGovernorateId,
    initialFocusLandmarkId,
    filters.governorateId,
    govMap,
    allLandmarks,
    resolvedCoordsById,
    governorates,
  ]);

  const handleSelectGovernorate = (govId: string | 'all') => {
    const map = mapInstanceRef.current;
    onChangeFilters({ governorateId: govId });

    if (govId === 'all') {
      setActiveLandmarkId(null);
      map?.flyTo(IRAQ_CENTER, IRAQ_DEFAULT_ZOOM, { duration: 0.6 });
      return;
    }

    if (govId === 'IQ-NATIONAL') {
      const firstNational = allLandmarks.find((l) => l.governorate_id === 'IQ-NATIONAL');
      setActiveLandmarkId(firstNational?.id ?? null);
      map?.flyTo(IRAQ_CENTER, IRAQ_DEFAULT_ZOOM, { duration: 0.6 });
      return;
    }

    const gov = govMap.get(govId);
    const firstInGov = allLandmarks.find((l) => l.governorate_id === govId) ?? null;
    setActiveLandmarkId(firstInGov?.id ?? null);
    if (gov) {
      const center = resolveGovernorateCenter(gov);
      map?.flyTo([center.lat, center.lng], 9, { duration: 0.65 });
    }
  };

  const selectedGov =
    filters.governorateId !== 'all' ? govMap.get(filters.governorateId) : null;
  const selectedGovLandmarks = useMemo(
    () =>
      filters.governorateId !== 'all'
        ? filteredLandmarks.filter((l) => l.governorate_id === filters.governorateId)
        : [],
    [filteredLandmarks, filters.governorateId]
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-[#0F3D3E]/12 pb-5 dark:border-[#C89B3C]/18 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#1B4B72] dark:text-[#96C2E6]">
            الخريطة التفاعلية لبلاد الرافدين
          </p>
          <h1 className="mt-1 font-heritage text-3xl font-bold text-[#0F3D3E] dark:text-[#F4EFE6] sm:text-4xl tabular-nums">
            خريطة العراق والمحافظات ({governorates.length})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dynamic Category Filter Tabs with live counts */}
          <div
            role="group"
            aria-label="تصفية المعالم على الخريطة"
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#0F3D3E]/12 bg-white/80 p-1 dark:border-[#C89B3C]/18 dark:bg-[#132529]"
          >
            <button
              type="button"
              onClick={() => onChangeFilters({ category: 'all' })}
              aria-pressed={filters.category === 'all'}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                filters.category === 'all'
                  ? 'bg-[#0F3D3E] text-[#F9F6F0] dark:bg-[#C89B3C] dark:text-[#0D1B1E]'
                  : 'text-[#4E5C58] hover:text-[#0F3D3E] dark:text-[#B4C0BC] dark:hover:text-[#F1ECE2]'
              }`}
            >
              الكل ({allLandmarks.length})
            </button>
            {categoryStats.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChangeFilters({ category: cat.id })}
                aria-pressed={filters.category === cat.id}
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                  filters.category === cat.id
                    ? 'bg-[#0F3D3E] text-[#F9F6F0] dark:bg-[#C89B3C] dark:text-[#0D1B1E]'
                    : 'text-[#4E5C58] hover:text-[#0F3D3E] dark:text-[#B4C0BC] dark:hover:text-[#F1ECE2]'
                }`}
              >
                {cat.short_label_ar} ({cat.count})
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onChangeFilters({ unescoOnly: !filters.unescoOnly })}
            aria-pressed={filters.unescoOnly}
            className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
              filters.unescoOnly
                ? 'border border-[#C89B3C] bg-[#C89B3C] text-[#0D1B1E]'
                : 'border border-[#C89B3C]/40 bg-[#C89B3C]/10 text-[#7B5B17] hover:bg-[#C89B3C]/18 dark:text-[#E7C87B]'
            }`}
          >
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            <span>اليونسكو ({unescoCount})</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'
            }
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[#0F3D3E]/15 bg-white/80 px-3 py-2 text-xs font-semibold text-[#0F3D3E] hover:bg-white dark:border-[#C89B3C]/22 dark:bg-[#132529] dark:text-[#E7C87B] whitespace-nowrap"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4" aria-hidden="true" />
                <span>نهاري</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" aria-hidden="true" />
                <span>ليلي</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Synchronized Map Search & Legend Strip */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <label htmlFor="map-search-input" className="sr-only">
            ابحث عن معلم على الخريطة
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#64736F]"
            aria-hidden="true"
          />
          <input
            id="map-search-input"
            type="search"
            value={filters.query}
            onChange={(e) => onChangeFilters({ query: e.target.value })}
            placeholder="ابحث عن معلم أو محافظة على الخريطة..."
            className="min-h-[42px] w-full rounded-xl border border-[#0F3D3E]/16 bg-white/90 pr-10 pl-10 text-xs text-[#1A2421] placeholder:text-[#7A8783] focus:border-[#0F3D3E] focus:outline-none dark:border-[#C89B3C]/24 dark:bg-[#132529] dark:text-[#F1ECE2] dark:placeholder:text-[#869691] dark:focus:border-[#C89B3C]"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChangeFilters({ query: '' })}
              aria-label="مسح البحث على الخريطة"
              className="absolute top-1/2 left-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#64736F] hover:bg-[#0F3D3E]/8"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#4E5C58] dark:text-[#B4C0BC]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full border border-[#0F3D3E] bg-[#C89B3C]"
              />
              <span>{CATEGORY_LABELS.religious}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full border border-[#F9F6F0] bg-[#1B4B72]"
              />
              <span>{CATEGORY_LABELS.archaeological}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full border border-[#C89B3C] bg-[#0F3D3E]"
              />
              <span>{CATEGORY_LABELS.nature_tourism}</span>
            </span>
          </div>

          <span
            data-testid="map-visible-count"
            className="font-semibold text-[#0F3D3E] dark:text-[#E7C87B] tabular-nums"
          >
            {filteredLandmarks.length} من {allLandmarks.length} معلماً على الخريطة
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                onResetFilters();
                setActiveLandmarkId(null);
              }}
              className="inline-flex items-center gap-1 font-semibold text-[#1B4B72] hover:underline dark:text-[#96C2E6]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>إعادة تعيين</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Map Surface */}
        <div className="lg:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-[#0F3D3E]/16 bg-[#EBE6DA] dark:border-[#C89B3C]/22 dark:bg-[#0B1518]">
            <div
              ref={mapContainerRef}
              data-testid="iraq-leaflet-map"
              aria-label="خريطة العراق التفاعلية"
              className="h-[460px] w-full sm:h-[540px]"
            />
          </div>

          {/* Active Landmark Preview Strip beneath Map */}
          {activeLandmark && (
            <div className="mt-4 flex flex-col justify-between gap-4 rounded-2xl border border-[#0F3D3E]/14 bg-white/90 p-5 dark:border-[#C89B3C]/20 dark:bg-[#132529] sm:flex-row sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-[#54635F] dark:text-[#A5B4AF]">
                    {activeLandmark.governorate_ar} ·{' '}
                    {CATEGORY_SHORT_LABELS[activeLandmark.category]} · {activeLandmark.era}
                  </p>
                  {activeLandmark.unesco_site && <UnescoBadge variant="inline" />}
                </div>
                <h2 className="mt-1.5 font-heritage text-2xl font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
                  {activeLandmark.name_ar}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-[#4E5C58] dark:text-[#B4C0BC]">
                  {activeLandmark.description_ar}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectLandmark(activeLandmark)}
                  className="min-h-[42px] rounded-xl bg-[#0F3D3E] px-4 py-2 text-xs font-semibold text-[#F9F6F0] hover:bg-[#144F50] dark:bg-[#C89B3C] dark:text-[#0D1B1E] whitespace-nowrap"
                >
                  عرض الدليل الكامل
                </button>
                <a
                  href={getLandmarkGoogleMapsUrl(activeLandmark)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[#0F3D3E]/18 px-3.5 py-2 text-xs font-semibold text-[#1B4B72] hover:bg-[#1B4B72]/8 dark:border-[#C89B3C]/24 dark:text-[#96C2E6] whitespace-nowrap"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>فتح في خرائط جوجل</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Governorate Quick Jump Sidebar */}
        <aside className="flex flex-col rounded-2xl border border-[#0F3D3E]/12 bg-white/85 p-4 dark:border-[#C89B3C]/18 dark:bg-[#132529]/90 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-[#0F3D3E]/10 pb-3 dark:border-[#C89B3C]/16">
            <h2 className="font-heritage text-xl font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
              الانتقال إلى محافظة
            </h2>
            {filters.governorateId !== 'all' && (
              <button
                type="button"
                onClick={() => handleSelectGovernorate('all')}
                className="text-xs font-semibold text-[#1B4B72] hover:underline dark:text-[#96C2E6]"
              >
                عرض كل العراق
              </button>
            )}
          </div>

          {selectedGov && (
            <div className="mt-3 rounded-xl border border-[#C89B3C]/28 bg-[#F9F6F0] p-3.5 dark:bg-[#0D1B1E]">
              <p className="text-xs font-semibold text-[#8A6518] dark:text-[#E7C87B]">
                {selectedGov.region}
              </p>
              <p className="mt-0.5 font-heritage text-lg font-bold text-[#0F3D3E] dark:text-[#F4EFE6]">
                محافظة {selectedGov.name_ar} ({selectedGovLandmarks.length})
              </p>
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[#4E5C58] dark:text-[#B4C0BC]">
                {selectedGovLandmarks.length > 0
                  ? `أبرز المعالم: ${selectedGovLandmarks
                      .slice(0, 6)
                      .map((l) => l.name_ar)
                      .join('، ')}`
                  : 'لا توجد معالم مطابقة ضمن التصفية الحالية.'}
              </p>
            </div>
          )}

          <div className="mt-3 grid max-h-[420px] grid-cols-2 gap-1.5 overflow-y-auto pl-1">
            {governorates.map((gov) => {
              const isSelected = filters.governorateId === gov.id;
              const count = governorateCounts.get(gov.id) ?? 0;
              return (
                <button
                  key={gov.id}
                  type="button"
                  onClick={() => handleSelectGovernorate(gov.id)}
                  aria-pressed={isSelected}
                  className={`flex min-h-[42px] items-center justify-between gap-1 rounded-lg px-3 py-2 text-right text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-[#0F3D3E] text-[#F9F6F0] dark:bg-[#C89B3C] dark:text-[#0D1B1E]'
                      : 'border border-[#0F3D3E]/10 bg-[#F9F6F0]/70 text-[#2A3733] hover:bg-[#0F3D3E]/8 dark:border-[#C89B3C]/12 dark:bg-[#0D1B1E]/60 dark:text-[#D5DDD9] dark:hover:bg-[#1A3136]'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
                    <span className="truncate">{gov.name_ar}</span>
                  </span>
                  <span className="tabular-nums opacity-80">{count}</span>
                </button>
              );
            })}

            {nationalLandmarksCount > 0 && (
              <button
                type="button"
                onClick={() => handleSelectGovernorate('IQ-NATIONAL')}
                aria-pressed={filters.governorateId === 'IQ-NATIONAL'}
                className={`col-span-2 flex min-h-[42px] items-center justify-between gap-1 rounded-lg px-3 py-2 text-right text-xs font-semibold transition-colors ${
                  filters.governorateId === 'IQ-NATIONAL'
                    ? 'bg-[#0F3D3E] text-[#F9F6F0] dark:bg-[#C89B3C] dark:text-[#0D1B1E]'
                    : 'border border-[#C89B3C]/30 bg-[#C89B3C]/10 text-[#7B5B17] hover:bg-[#C89B3C]/18 dark:text-[#E7C87B]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
                  <span className="truncate">معالم وطنية عامة (العراق)</span>
                </span>
                <span className="tabular-nums opacity-85">{nationalLandmarksCount}</span>
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
};
