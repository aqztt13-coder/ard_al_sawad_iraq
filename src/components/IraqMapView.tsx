import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Award,
  ExternalLink,
  List,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Moon,
  Plus,
  RotateCcw,
  Route,
  Search,
  Sun,
  Trash2,
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
import { useGeolocation } from '../hooks/useGeolocation';
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
import {
  calculateTrailDistanceKm,
  formatDistanceAr,
  haversineDistanceKm,
} from '../utils/geo';
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
  onSaveRouteToItinerary?: (landmarkIds: string[]) => void;
}

const CATEGORY_COLORS: Record<LandmarkCategory, { fill: string; ring: string }> = {
  religious: { fill: '#C5A15A', ring: '#173F35' },
  archaeological: { fill: '#1B4B72', ring: '#F8F6F0' },
  nature_tourism: { fill: '#173F35', ring: '#E7C87B' },
};

const IRAQ_CENTER: [number, number] = [
  IRAQ_GEOGRAPHIC_CENTER.lat,
  IRAQ_GEOGRAPHIC_CENTER.lng,
];
const IRAQ_DEFAULT_ZOOM = 6;

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
  onSaveRouteToItinerary,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);

  const [displayMode, setDisplayMode] = useState<'map' | 'list'>('map');
  const [mapZoom, setMapZoom] = useState<number>(IRAQ_DEFAULT_ZOOM);
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [routeSavedNotice, setRouteSavedNotice] = useState(false);

  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(
    initialFocusLandmarkId ?? null
  );

  const {
    status: geoStatus,
    coords: userCoords,
    errorMessage: geoError,
    isNearMeActive,
    toggleNearMe,
  } = useGeolocation();

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

  const routeLandmarks = useMemo(
    () =>
      routeIds
        .map((id) => allLandmarks.find((l) => l.id === id))
        .filter((item): item is Landmark => Boolean(item)),
    [routeIds, allLandmarks]
  );

  const routeTotalKm = useMemo(
    () => calculateTrailDistanceKm(routeLandmarks, governorates),
    [routeLandmarks, governorates]
  );

  const resolvedCoordsById = useMemo(() => {
    const groupRank = new Map<string, number>();
    const map = new Map<string, { lat: number; lng: number; isApproximate: boolean }>();
    for (const landmark of allLandmarks) {
      const rank = groupRank.get(landmark.governorate_id) ?? 0;
      groupRank.set(landmark.governorate_id, rank + 1);
      map.set(landmark.id, resolveLandmarkCoordinates(landmark, governorates, rank));
    }
    return map;
  }, [allLandmarks, governorates]);

  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.category !== 'all' ||
    filters.governorateId !== 'all' ||
    filters.unescoOnly;

  // Mount Leaflet map once
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

    L.polygon(IRAQ_OUTLINE, {
      color: '#C5A15A',
      weight: 1.5,
      opacity: 0.65,
      fillColor: '#173F35',
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
    routeLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    map.on('zoomend', () => {
      setMapZoom(map.getZoom());
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
      userLayerRef.current = null;
    };
  }, []);

  // Refresh Leaflet layout when returning from List mode
  useEffect(() => {
    if (displayMode === 'map' && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 60);
    }
  }, [displayMode]);

  // Zoom-aware Marker Clustering + Individual Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const shouldCluster =
      mapZoom <= 7 &&
      filteredLandmarks.length > 25 &&
      filters.governorateId === 'all';

    if (shouldCluster) {
      const byGov = new Map<string, Landmark[]>();
      for (const lm of filteredLandmarks) {
        const list = byGov.get(lm.governorate_id) ?? [];
        list.push(lm);
        byGov.set(lm.governorate_id, list);
      }

      byGov.forEach((items, govId) => {
        const gov = govMap.get(govId);
        const center = gov
          ? resolveGovernorateCenter(gov)
          : resolveLandmarkCoordinates(items[0], governorates);

        const size = items.length >= 12 ? 42 : items.length >= 6 ? 36 : 30;
        const clusterIcon = L.divIcon({
          className: 'ard-alsawad-cluster',
          html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:#173F35;border:2.5px solid #C5A15A;color:#F8F6F0;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(16,47,41,0.35);">${items.length}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([center.lat, center.lng], {
          icon: clusterIcon,
          title: `${gov?.name_ar ?? 'العراق'} (${items.length})`,
        });

        marker.bindTooltip(
          `${gov?.name_ar ?? 'معالم وطنية'} — ${items.length} معلم (اضغط للتكبير)`,
          { direction: 'top', offset: [0, -14] }
        );

        marker.on('click', () => {
          map.flyTo([center.lat, center.lng], 9, { duration: 0.65 });
          setActiveLandmarkId(items[0].id);
        });

        marker.addTo(layer);
      });
      return;
    }

    filteredLandmarks.forEach((landmark) => {
      const coords =
        resolvedCoordsById.get(landmark.id) ??
        resolveLandmarkCoordinates(landmark, governorates);
      const colors = CATEGORY_COLORS[landmark.category] ?? CATEGORY_COLORS.archaeological;
      const inRoute = routeIds.includes(landmark.id);
      const ringColor = inRoute ? '#C5A15A' : landmark.unesco_site ? '#E7C87B' : colors.ring;
      const markerSize = inRoute ? 28 : landmark.unesco_site ? 26 : 20;
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
      marker.bindTooltip(`${landmark.name_ar} — ${landmark.governorate_ar}${unescoSuffix}`, {
        direction: 'top',
        offset: [0, -12],
      });

      marker.on('click', () => {
        setActiveLandmarkId(landmark.id);
        map.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), 9), {
          duration: 0.65,
        });
      });

      marker.addTo(layer);
    });
  }, [
    filteredLandmarks,
    resolvedCoordsById,
    governorates,
    govMap,
    mapZoom,
    filters.governorateId,
    routeIds,
  ]);

  // Draw Multi-Destination Route Polyline on Map
  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (routeLandmarks.length < 2) return;

    const points: [number, number][] = routeLandmarks.map((lm) => {
      const c =
        resolvedCoordsById.get(lm.id) ??
        resolveLandmarkCoordinates(lm, governorates);
      return [c.lat, c.lng];
    });

    L.polyline(points, {
      color: '#C5A15A',
      weight: 3.5,
      opacity: 0.9,
      dashArray: '8 6',
    }).addTo(layer);
  }, [routeLandmarks, resolvedCoordsById, governorates]);

  // Show user location marker when geolocation is active
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = userLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!isNearMeActive || !userCoords) return;

    L.circleMarker([userCoords.lat, userCoords.lng], {
      radius: 8,
      color: '#FFFFFF',
      weight: 2.5,
      fillColor: '#1B4B72',
      fillOpacity: 1,
    })
      .bindTooltip('موقعك الحالي', { direction: 'top' })
      .addTo(layer);

    map.flyTo([userCoords.lat, userCoords.lng], 9, { duration: 0.7 });
  }, [isNearMeActive, userCoords]);

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

  const handleToggleRouteStop = (landmarkId: string) => {
    setRouteSavedNotice(false);
    setRouteIds((prev) =>
      prev.includes(landmarkId)
        ? prev.filter((id) => id !== landmarkId)
        : [...prev, landmarkId]
    );
  };

  const handleSaveBuiltRoute = () => {
    if (routeIds.length === 0 || !onSaveRouteToItinerary) return;
    onSaveRouteToItinerary(routeIds);
    setRouteSavedNotice(true);
  };

  const activeDistanceFromUser = useMemo(() => {
    if (!activeLandmark || !isNearMeActive || !userCoords) return null;
    const coords =
      resolvedCoordsById.get(activeLandmark.id) ??
      resolveLandmarkCoordinates(activeLandmark, governorates);
    return haversineDistanceKm(userCoords, coords);
  }, [activeLandmark, isNearMeActive, userCoords, resolvedCoordsById, governorates]);

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
      <div className="flex flex-col gap-4 border-b border-[#173F35]/12 pb-5 dark:border-[#C5A15A]/18 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#8C6D2B] dark:text-[#E7C87B]">
            الخريطة التفاعلية ومنشئ المسارات
          </p>
          <h1 className="mt-1 font-heritage text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-4xl tabular-nums">
            خريطة العراق والمحافظات ({governorates.length})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Map / List Toggle */}
          <div
            role="group"
            aria-label="تبديل عرض الخريطة والقائمة"
            className="inline-flex rounded-xl border border-[#173F35]/15 bg-white p-1 dark:border-[#C5A15A]/20 dark:bg-[#13352F]"
          >
            <button
              type="button"
              data-testid="map-mode-btn"
              onClick={() => setDisplayMode('map')}
              aria-pressed={displayMode === 'map'}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                displayMode === 'map'
                  ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                  : 'text-[#4E5C58] dark:text-[#B4C0BC]'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>خريطة</span>
            </button>
            <button
              type="button"
              data-testid="list-mode-btn"
              onClick={() => setDisplayMode('list')}
              aria-pressed={displayMode === 'list'}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                displayMode === 'list'
                  ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                  : 'text-[#4E5C58] dark:text-[#B4C0BC]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>قائمة ({filteredLandmarks.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={toggleNearMe}
            disabled={geoStatus === 'loading'}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              isNearMeActive
                ? 'border-[#1B4B72] bg-[#1B4B72] text-white'
                : 'border-[#173F35]/15 bg-white text-[#173F35] hover:bg-[#F8F6F0] dark:border-[#C5A15A]/22 dark:bg-[#13352F] dark:text-[#E7C87B]'
            }`}
          >
            {geoStatus === 'loading' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LocateFixed className="h-3.5 w-3.5" />
            )}
            <span>موقعي الحالي</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#173F35]/15 bg-white px-3 py-2 text-xs font-semibold text-[#173F35] hover:bg-[#F8F6F0] dark:border-[#C5A15A]/22 dark:bg-[#13352F] dark:text-[#E7C87B]"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === 'dark' ? 'نهاري' : 'ليلي'}</span>
          </button>
        </div>
      </div>

      {/* Category & Search Filter Strip */}
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#64736F]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => onChangeFilters({ query: e.target.value })}
              placeholder="ابحث عن معلم أو محافظة..."
              className="min-h-[40px] w-full rounded-xl border border-[#173F35]/16 bg-white pr-9 pl-8 text-xs text-[#252B29] focus:border-[#173F35] focus:outline-none dark:border-[#C5A15A]/22 dark:bg-[#13352F] dark:text-[#F8F6F0]"
            />
            {filters.query && (
              <button
                type="button"
                onClick={() => onChangeFilters({ query: '' })}
                aria-label="مسح البحث"
                className="absolute top-1/2 left-2 -translate-y-1/2 text-[#64736F]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onChangeFilters({ category: 'all' })}
            aria-pressed={filters.category === 'all'}
            className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-semibold ${
              filters.category === 'all'
                ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                : 'border border-[#173F35]/14 bg-white text-[#4E5C58] dark:border-[#C5A15A]/18 dark:bg-[#13352F] dark:text-[#C0CCC7]'
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
              className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-semibold ${
                filters.category === cat.id
                  ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                  : 'border border-[#173F35]/14 bg-white text-[#4E5C58] dark:border-[#C5A15A]/18 dark:bg-[#13352F] dark:text-[#C0CCC7]'
              }`}
            >
              {cat.short_label_ar} ({cat.count})
            </button>
          ))}

          <button
            type="button"
            onClick={() => onChangeFilters({ unescoOnly: !filters.unescoOnly })}
            aria-pressed={filters.unescoOnly}
            className={`inline-flex min-h-[38px] items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold ${
              filters.unescoOnly
                ? 'bg-[#C5A15A] text-[#102F29]'
                : 'border border-[#C5A15A]/45 bg-[#C5A15A]/10 text-[#7B5B17] dark:text-[#E7C87B]'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>اليونسكو ({unescoCount})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span
            data-testid="map-visible-count"
            className="font-semibold text-[#173F35] dark:text-[#E7C87B] tabular-nums"
          >
            {filteredLandmarks.length} معلم ·{' '}
            {mapZoom <= 7 && filteredLandmarks.length > 25 && filters.governorateId === 'all'
              ? 'وضع التجميع حسب المحافظات'
              : 'عرض العلامات الفردية'}
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
              <RotateCcw className="h-3.5 w-3.5" />
              <span>إعادة تعيين</span>
            </button>
          )}
        </div>
      </div>

      {geoError && (
        <p className="mt-3 rounded-xl border border-[#C5A15A]/40 bg-[#FFF9EB] px-4 py-2.5 text-xs text-[#6E4F12]">
          {geoError}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Map OR List Panel */}
        <div className="lg:col-span-8">
          <div
            className={
              displayMode === 'map'
                ? 'overflow-hidden rounded-2xl border border-[#173F35]/16 bg-[#E9DFC9] dark:border-[#C5A15A]/22 dark:bg-[#0B221E]'
                : 'hidden'
            }
          >
            <div
              ref={mapContainerRef}
              data-testid="iraq-leaflet-map"
              aria-label="خريطة العراق التفاعلية"
              className="h-[460px] w-full sm:h-[540px]"
            />
          </div>

          {displayMode === 'list' && (
            <div
              data-testid="map-list-view"
              className="max-h-[540px] space-y-2.5 overflow-y-auto rounded-2xl border border-[#173F35]/14 bg-white p-4 dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
            >
              {filteredLandmarks.map((lm) => {
                const inRoute = routeIds.includes(lm.id);
                return (
                  <div
                    key={lm.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-[#173F35]/10 bg-[#F8F6F0] p-3.5 sm:flex-row sm:items-center dark:border-[#C5A15A]/14 dark:bg-[#102F29]"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#8C6D2B] dark:text-[#E7C87B]">
                        {lm.governorate_ar} · {CATEGORY_SHORT_LABELS[lm.category]} · {lm.era}
                      </p>
                      <h3 className="font-heritage mt-0.5 text-lg font-bold text-[#173F35] dark:text-[#F8F6F0]">
                        {lm.name_ar}
                      </h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleRouteStop(lm.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                          inRoute
                            ? 'bg-[#C5A15A] text-[#102F29]'
                            : 'border border-[#173F35]/20 bg-white text-[#173F35] dark:bg-[#13352F] dark:text-[#E7C87B]'
                        }`}
                      >
                        {inRoute ? 'ضمن المسار' : '+ للمسار'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectLandmark(lm)}
                        className="rounded-lg bg-[#173F35] px-3 py-1.5 text-xs font-bold text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]"
                      >
                        التفاصيل
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Landmark Preview Strip beneath Map */}
          {activeLandmark && (
            <div className="mt-4 flex flex-col justify-between gap-4 rounded-2xl border border-[#173F35]/14 bg-white p-5 dark:border-[#C5A15A]/20 dark:bg-[#13352F] sm:flex-row sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-[#54635F] dark:text-[#A5B4AF]">
                    {activeLandmark.governorate_ar} ·{' '}
                    {CATEGORY_SHORT_LABELS[activeLandmark.category]} · {activeLandmark.era}
                    {activeDistanceFromUser !== null
                      ? ` · ${formatDistanceAr(activeDistanceFromUser)}`
                      : ''}
                  </p>
                  {activeLandmark.unesco_site && <UnescoBadge variant="inline" />}
                </div>
                <h2 className="mt-1 font-heritage text-2xl font-bold text-[#173F35] dark:text-[#E7C87B]">
                  {activeLandmark.name_ar}
                </h2>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#4E5C58] dark:text-[#B4C0BC]">
                  {activeLandmark.description_ar}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="map-add-route-btn"
                  onClick={() => handleToggleRouteStop(activeLandmark.id)}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
                    routeIds.includes(activeLandmark.id)
                      ? 'bg-[#C5A15A] text-[#102F29]'
                      : 'border border-[#C5A15A]/55 bg-[#C5A15A]/14 text-[#7B5B17] dark:text-[#E7C87B]'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>
                    {routeIds.includes(activeLandmark.id)
                      ? 'إزالة من المسار'
                      : 'أضف لمسار الخريطة'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectLandmark(activeLandmark)}
                  className="min-h-[40px] rounded-xl bg-[#173F35] px-4 py-2 text-xs font-semibold text-[#F8F6F0] hover:bg-[#1E5044] dark:bg-[#C5A15A] dark:text-[#102F29]"
                >
                  عرض الدليل الكامل
                </button>
                <a
                  href={getLandmarkGoogleMapsUrl(activeLandmark)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#173F35]/18 px-3 py-2 text-xs font-semibold text-[#1B4B72] dark:border-[#C5A15A]/24 dark:text-[#96C2E6]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>جوجل</span>
                </a>
              </div>
            </div>
          )}

          {/* Legend Strip */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#4E5C58] dark:text-[#A9B8B3]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-[#173F35] bg-[#C5A15A]" />
              <span>{CATEGORY_LABELS.religious}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-[#F8F6F0] bg-[#1B4B72]" />
              <span>{CATEGORY_LABELS.archaeological}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-[#C5A15A] bg-[#173F35]" />
              <span>{CATEGORY_LABELS.nature_tourism}</span>
            </span>
          </div>
        </div>

        {/* Sidebar: Route Builder + Governorate Quick Jump */}
        <aside className="space-y-4 lg:col-span-4">
          {/* Interactive Multi-Destination Route Builder */}
          <div
            data-testid="map-route-builder"
            className="rounded-2xl border border-[#C5A15A]/35 bg-white p-4 dark:bg-[#13352F]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#173F35]/10 pb-2.5 dark:border-[#C5A15A]/16">
              <h2 className="flex items-center gap-2 font-heritage text-lg font-bold text-[#173F35] dark:text-[#E7C87B]">
                <Route className="h-4 w-4 text-[#C5A15A]" />
                <span>منشئ المسار ({routeLandmarks.length})</span>
              </h2>
              {routeLandmarks.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRouteIds([]);
                    setRouteSavedNotice(false);
                  }}
                  className="text-[11px] font-semibold text-red-700 hover:underline dark:text-red-300"
                >
                  مسح الكل
                </button>
              )}
            </div>

            {routeLandmarks.length === 0 ? (
              <p className="mt-3 text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
                اضغط على أي معلم على الخريطة أو في القائمة ثم اختر «أضف لمسار الخريطة»
                لرسم مسارك وحساب المسافة الجوية التقريبية بين المحطات.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {routeLandmarks.map((stop, idx) => (
                  <div
                    key={stop.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[#F8F6F0] px-3 py-2 text-xs dark:bg-[#102F29]"
                  >
                    <span className="truncate font-semibold text-[#173F35] dark:text-[#F8F6F0]">
                      {idx + 1}. {stop.name_ar}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleRouteStop(stop.id)}
                      aria-label={`إزالة ${stop.name_ar}`}
                      className="text-[#6B7A75] hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <p className="pt-1 text-xs font-semibold text-[#8C6D2B] dark:text-[#E7C87B] tabular-nums">
                  المسافة الجوية التقريبية: {routeTotalKm} كم
                </p>

                {onSaveRouteToItinerary && (
                  <button
                    type="button"
                    onClick={handleSaveBuiltRoute}
                    className="mt-1 w-full rounded-xl bg-[#173F35] py-2.5 text-xs font-bold text-[#F8F6F0] hover:bg-[#1E5044] dark:bg-[#C5A15A] dark:text-[#102F29]"
                  >
                    حفظ المسار في مخطط رحلتي
                  </button>
                )}
                {routeSavedNotice && (
                  <p className="text-xs font-semibold text-[#173F35] dark:text-[#E7C87B]">
                    تم حفظ المحطات في مسار رحلتك المحفوظ دون اتصال.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Governorate Quick Jump */}
          <div className="rounded-2xl border border-[#173F35]/12 bg-white p-4 dark:border-[#C5A15A]/18 dark:bg-[#13352F]">
            <div className="flex items-center justify-between border-b border-[#173F35]/10 pb-3 dark:border-[#C5A15A]/16">
              <h2 className="font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
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
              <div className="mt-3 rounded-xl border border-[#C5A15A]/28 bg-[#F8F6F0] p-3 dark:bg-[#102F29]">
                <p className="text-xs font-semibold text-[#8C6D2B] dark:text-[#E7C87B]">
                  {selectedGov.region}
                </p>
                <p className="mt-0.5 font-heritage text-lg font-bold text-[#173F35] dark:text-[#F8F6F0]">
                  محافظة {selectedGov.name_ar} ({selectedGovLandmarks.length})
                </p>
              </div>
            )}

            <div className="mt-3 grid max-h-[340px] grid-cols-2 gap-1.5 overflow-y-auto pl-1">
              {governorates.map((gov) => {
                const isSelected = filters.governorateId === gov.id;
                const count = governorateCounts.get(gov.id) ?? 0;
                return (
                  <button
                    key={gov.id}
                    type="button"
                    onClick={() => handleSelectGovernorate(gov.id)}
                    aria-pressed={isSelected}
                    className={`flex min-h-[40px] items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-right text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                        : 'border border-[#173F35]/10 bg-[#F8F6F0]/75 text-[#252B29] hover:bg-[#173F35]/8 dark:border-[#C5A15A]/12 dark:bg-[#102F29]/70 dark:text-[#D5DDD9]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0 opacity-75" />
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
                  className={`col-span-2 flex min-h-[40px] items-center justify-between gap-1 rounded-lg px-3 py-2 text-right text-xs font-semibold ${
                    filters.governorateId === 'IQ-NATIONAL'
                      ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                      : 'border border-[#C5A15A]/30 bg-[#C5A15A]/10 text-[#7B5B17] dark:text-[#E7C87B]'
                  }`}
                >
                  <span>معالم وطنية عامة (العراق)</span>
                  <span className="tabular-nums">{nationalLandmarksCount}</span>
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
