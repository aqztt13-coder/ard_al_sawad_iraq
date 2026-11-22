import {
  CategoryMeta,
  DatabaseStats,
  DynamicCategoryStat,
  Governorate,
  Landmark,
  LandmarkCategory,
  LandmarkFilterState,
} from '../types/tourism';
import { hasExactCoordinates } from './coordinates';

export const CATEGORY_LABELS: Record<LandmarkCategory | 'all', string> = {
  all: 'جميع الوجهات',
  religious: 'المراقد والمواقع الدينية',
  archaeological: 'المواقع الأثرية والتاريخية',
  nature_tourism: 'الطبيعة والسياحة',
};

export const CATEGORY_SHORT_LABELS: Record<LandmarkCategory, string> = {
  religious: 'مراقد ومواقع دينية',
  archaeological: 'آثار وتاريخ',
  nature_tourism: 'طبيعة وسياحة',
};

const KNOWN_CATEGORY_ORDER: LandmarkCategory[] = [
  'religious',
  'archaeological',
  'nature_tourism',
];

/**
 * Normalizes Arabic text for resilient search matching:
 * - Strips Arabic diacritics (tashkeel) and tatweel
 * - Normalizes Alef variants (أ، إ، آ، ٱ) to bare Alef (ا)
 * - Normalizes Teh Marbuta (ة) to Heh (ه)
 * - Normalizes Alef Maksura (ى) to Yeh (ي)
 * - Normalizes Hamza carriers (ؤ -> و، ئ -> ي)
 */
export function normalizeArabic(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ');
}

export function getUniqueRegions(governorates: Governorate[]): string[] {
  return Array.from(new Set(governorates.map((g) => g.region).filter(Boolean)));
}

/**
 * Dynamically derives category statistics and counts directly from the landmarks dataset
 * and optional metadata categories list.
 */
export function getDynamicCategoryStats(
  landmarks: Landmark[],
  metadataCategories: CategoryMeta[] = []
): DynamicCategoryStat[] {
  const counts = new Map<LandmarkCategory, number>();
  for (const landmark of landmarks) {
    counts.set(landmark.category, (counts.get(landmark.category) ?? 0) + 1);
  }

  const orderedIds: LandmarkCategory[] = [];
  const seen = new Set<LandmarkCategory>();

  for (const meta of metadataCategories) {
    if (!seen.has(meta.id)) {
      seen.add(meta.id);
      orderedIds.push(meta.id);
    }
  }
  for (const cat of KNOWN_CATEGORY_ORDER) {
    if (!seen.has(cat) && (counts.get(cat) ?? 0) > 0) {
      seen.add(cat);
      orderedIds.push(cat);
    }
  }
  for (const cat of counts.keys()) {
    if (!seen.has(cat)) {
      seen.add(cat);
      orderedIds.push(cat);
    }
  }

  return orderedIds.map((id) => {
    const meta = metadataCategories.find((m) => m.id === id);
    return {
      id,
      label_ar: CATEGORY_LABELS[id] ?? meta?.name_ar ?? id,
      short_label_ar: CATEGORY_SHORT_LABELS[id] ?? meta?.name_ar ?? id,
      count: counts.get(id) ?? 0,
    };
  });
}

/**
 * Automatically computes all top-level database statistics directly from the
 * live `landmarks` and `governorates` arrays (zero hardcoded values).
 */
export function getDatabaseStats(
  landmarks: Landmark[],
  governorates: Governorate[],
  metadataCategories: CategoryMeta[] = []
): DatabaseStats {
  const govIds = new Set(governorates.map((g) => g.id));
  const unescoCount = landmarks.filter((l) => l.unesco_site === true).length;
  const nationalLandmarksCount = landmarks.filter(
    (l) => !govIds.has(l.governorate_id)
  ).length;

  return {
    totalLandmarks: landmarks.length,
    totalGovernorates: governorates.length,
    unescoCount,
    nationalLandmarksCount,
    categoryStats: getDynamicCategoryStats(landmarks, metadataCategories),
  };
}

export function filterLandmarks(
  landmarks: Landmark[],
  governorates: Governorate[],
  filters: LandmarkFilterState
): Landmark[] {
  const govMap = new Map(governorates.map((g) => [g.id, g]));
  const normalizedQuery = normalizeArabic(filters.query);

  return landmarks.filter((landmark) => {
    if (filters.category !== 'all' && landmark.category !== filters.category) {
      return false;
    }

    if (
      filters.governorateId !== 'all' &&
      landmark.governorate_id !== filters.governorateId
    ) {
      return false;
    }

    if (filters.unescoOnly && !landmark.unesco_site) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const gov = govMap.get(landmark.governorate_id);
    const searchableBlob = normalizeArabic(
      [
        landmark.name_ar,
        landmark.name_en,
        landmark.governorate_ar,
        landmark.category_ar,
        CATEGORY_LABELS[landmark.category] ?? '',
        CATEGORY_SHORT_LABELS[landmark.category] ?? '',
        landmark.description_ar,
        landmark.era,
        Array.isArray(landmark.tags) ? landmark.tags.join(' ') : '',
        landmark.unesco_site ? 'يونسكو تراث عالمي unesco' : '',
        gov?.name_en ?? '',
        gov?.region ?? '',
      ].join(' ')
    );

    const tokens = normalizedQuery.split(' ').filter(Boolean);
    return tokens.every((token) => searchableBlob.includes(token));
  });
}

export function buildGoogleMapsUrl(lat: number, lng: number): string {
  const safeLat = Number(lat).toFixed(5);
  const safeLng = Number(lng).toFixed(5);
  return `https://www.google.com/maps?q=${safeLat},${safeLng}`;
}

export function getLandmarkGoogleMapsUrl(landmark: Landmark): string {
  if (landmark.google_maps_url && /^https?:\/\//i.test(landmark.google_maps_url)) {
    return landmark.google_maps_url;
  }
  if (hasExactCoordinates(landmark.coordinates)) {
    return buildGoogleMapsUrl(landmark.coordinates.lat, landmark.coordinates.lng);
  }
  const query = encodeURIComponent(
    `${landmark.name_en || landmark.name_ar} ${landmark.governorate_ar || 'Iraq'}`
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function formatCoordinatesAr(
  lat: number | null | undefined,
  lng: number | null | undefined
): string {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return 'وفق موقع المحافظة';
  }
  const latDir = lat >= 0 ? 'ش' : 'ج';
  const lngDir = lng >= 0 ? 'ق' : 'غ';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}، ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

export interface GovernorateWithCount extends Governorate {
  landmarkCount: number;
  unescoCount: number;
  categories: LandmarkCategory[];
  landmarkHighlights: string[];
}

export function getGovernoratesWithCounts(
  governorates: Governorate[],
  landmarks: Landmark[]
): GovernorateWithCount[] {
  return governorates.map((gov) => {
    const matching = landmarks.filter((l) => l.governorate_id === gov.id);
    const categories = Array.from(new Set(matching.map((l) => l.category)));
    const unescoCount = matching.filter((l) => l.unesco_site).length;
    const landmarkHighlights = matching.slice(0, 3).map((l) => l.name_ar);
    return {
      ...gov,
      landmarkCount: matching.length,
      unescoCount,
      categories,
      landmarkHighlights,
    };
  });
}
