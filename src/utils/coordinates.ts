import {
  Coordinates,
  Governorate,
  Landmark,
  NumericCoordinates,
  ResolvedCoordinates,
} from '../types/tourism';

export const IRAQ_GEOGRAPHIC_CENTER: NumericCoordinates = {
  lat: 33.2232,
  lng: 43.6793,
};

/**
 * Geographic reference centers for Iraqi governorates, keyed by canonical slug.
 * Used as a clean spatial fallback whenever JSON records contain `null` coordinates.
 */
const CANONICAL_GOVERNORATE_CENTERS: Record<string, NumericCoordinates> = {
  baghdad: { lat: 33.3152, lng: 44.3661 },
  basra: { lat: 30.5085, lng: 47.7804 },
  nineveh: { lat: 36.3489, lng: 43.1577 },
  erbil: { lat: 36.1911, lng: 44.0092 },
  duhok: { lat: 36.8671, lng: 42.9884 },
  sulaymaniyah: { lat: 35.5613, lng: 45.4309 },
  karbala: { lat: 32.616, lng: 44.0249 },
  najaf: { lat: 32.0, lng: 44.336 },
  salah_al_din: { lat: 34.6158, lng: 43.6786 },
  babylon: { lat: 32.4637, lng: 44.4196 },
  muthanna: { lat: 31.3189, lng: 45.2804 },
  anbar: { lat: 33.4258, lng: 43.2992 },
  kirkuk: { lat: 35.4681, lng: 44.3922 },
  diyala: { lat: 33.7481, lng: 44.6436 },
  maysan: { lat: 31.8356, lng: 47.1449 },
  wasit: { lat: 32.5128, lng: 45.8182 },
  qadisiyyah: { lat: 31.9929, lng: 44.9255 },
  dhi_qar: { lat: 31.058, lng: 46.2573 },
  national: { lat: 32.85, lng: 44.6 },
};

const GOVERNORATE_ALIASES: Record<string, string> = {
  baghdad: 'baghdad',
  بغداد: 'baghdad',
  basra: 'basra',
  البصره: 'basra',
  بصره: 'basra',
  nineveh: 'nineveh',
  نينوي: 'nineveh',
  الموصل: 'nineveh',
  erbil: 'erbil',
  اربيل: 'erbil',
  duhok: 'duhok',
  دهوك: 'duhok',
  sulaymaniyah: 'sulaymaniyah',
  السليمانيه: 'sulaymaniyah',
  سليمانيه: 'sulaymaniyah',
  karbala: 'karbala',
  كربلاء: 'karbala',
  'كربلاء المقدسه': 'karbala',
  najaf: 'najaf',
  النجف: 'najaf',
  'النجف الاشرف': 'najaf',
  'salah al-din': 'salah_al_din',
  salah_al_din: 'salah_al_din',
  'صلاح الدين': 'salah_al_din',
  babylon: 'babylon',
  babil: 'babylon',
  بابل: 'babylon',
  muthanna: 'muthanna',
  'al muthanna': 'muthanna',
  المثني: 'muthanna',
  anbar: 'anbar',
  'al anbar': 'anbar',
  الانبار: 'anbar',
  kirkuk: 'kirkuk',
  كركوك: 'kirkuk',
  diyala: 'diyala',
  ديالي: 'diyala',
  maysan: 'maysan',
  ميسان: 'maysan',
  wasit: 'wasit',
  واسط: 'wasit',
  qadisiyyah: 'qadisiyyah',
  'al qadisiyyah': 'qadisiyyah',
  القادسيه: 'qadisiyyah',
  الديوانيه: 'qadisiyyah',
  'dhi qar': 'dhi_qar',
  dhi_qar: 'dhi_qar',
  'ذي قار': 'dhi_qar',
  الناصريه: 'dhi_qar',
  'iq-national': 'national',
  العراق: 'national',
};

function normalizeLookupKey(input?: string | null): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

export function resolveCanonicalGovernorateSlug(
  ...candidates: Array<string | undefined | null>
): string | null {
  for (const candidate of candidates) {
    const key = normalizeLookupKey(candidate);
    if (!key) continue;
    if (GOVERNORATE_ALIASES[key]) {
      return GOVERNORATE_ALIASES[key];
    }
    if (CANONICAL_GOVERNORATE_CENTERS[key]) {
      return key;
    }
  }
  return null;
}

export function hasExactCoordinates(
  coords?: Coordinates | null
): coords is NumericCoordinates {
  return (
    Boolean(coords) &&
    typeof coords?.lat === 'number' &&
    Number.isFinite(coords.lat) &&
    typeof coords?.lng === 'number' &&
    Number.isFinite(coords.lng)
  );
}

/**
 * Resolves a numeric map center for any governorate, preferring exact JSON coordinates
 * and falling back cleanly to canonical geographic coordinates.
 */
export function resolveGovernorateCenter(
  gov?: Pick<Governorate, 'id' | 'name_ar' | 'name_en' | 'center_coordinates'> | null
): ResolvedCoordinates {
  if (gov && hasExactCoordinates(gov.center_coordinates)) {
    return {
      lat: gov.center_coordinates.lat,
      lng: gov.center_coordinates.lng,
      isApproximate: false,
    };
  }

  const slug = resolveCanonicalGovernorateSlug(gov?.id, gov?.name_en, gov?.name_ar);
  if (slug && CANONICAL_GOVERNORATE_CENTERS[slug]) {
    return {
      ...CANONICAL_GOVERNORATE_CENTERS[slug],
      isApproximate: true,
    };
  }

  return {
    ...IRAQ_GEOGRAPHIC_CENTER,
    isApproximate: true,
  };
}

/**
 * Deterministic lightweight hash for stable marker distribution within a governorate
 * when individual landmark coordinates are `null`.
 */
function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function resolveNationalLandmarkCenter(landmark: Landmark): NumericCoordinates {
  const q = normalizeLookupKey(`${landmark.name_ar} ${landmark.name_en}`);
  if (q.includes('دجله') || q.includes('tigris')) {
    return { lat: 33.8, lng: 44.3 };
  }
  if (q.includes('الفرات') || q.includes('euphrates')) {
    return { lat: 32.5, lng: 43.9 };
  }
  if (q.includes('الاهوار') || q.includes('marshes')) {
    return { lat: 31.15, lng: 46.95 };
  }
  if (q.includes('زبيده') || q.includes('zubaydah')) {
    return { lat: 31.65, lng: 44.1 };
  }
  return CANONICAL_GOVERNORATE_CENTERS.national;
}

/**
 * Resolves safe numeric coordinates for any landmark.
 * - Uses exact coordinates from `landmark.coordinates` when present.
 * - Otherwise positions the landmark near its governorate center with a gentle,
 *   deterministic spiral offset so markers remain distinct and clickable on the map.
 */
export function resolveLandmarkCoordinates(
  landmark: Landmark,
  governorates: Governorate[] = [],
  indexInGroup?: number
): ResolvedCoordinates {
  if (hasExactCoordinates(landmark.coordinates)) {
    return {
      lat: landmark.coordinates.lat,
      lng: landmark.coordinates.lng,
      isApproximate: false,
    };
  }

  const gov = governorates.find((g) => g.id === landmark.governorate_id);

  let base: NumericCoordinates;
  if (
    landmark.governorate_id === 'IQ-NATIONAL' ||
    normalizeLookupKey(landmark.governorate_ar) === 'العراق'
  ) {
    base = resolveNationalLandmarkCenter(landmark);
    return {
      lat: base.lat,
      lng: base.lng,
      isApproximate: true,
    };
  } else if (gov) {
    base = resolveGovernorateCenter(gov);
  } else {
    const slug = resolveCanonicalGovernorateSlug(
      landmark.governorate_id,
      landmark.governorate_ar
    );
    base =
      (slug && CANONICAL_GOVERNORATE_CENTERS[slug]) || IRAQ_GEOGRAPHIC_CENTER;
  }

  // Deterministic Fibonacci-spiral micro-offset (~3 km – 26 km) to prevent overlapping markers
  const h = stableHash(landmark.id || landmark.name_ar);
  const rank = typeof indexInGroup === 'number' ? indexInGroup : h % 20;
  if (rank === 0) {
    return { lat: base.lat, lng: base.lng, isApproximate: true };
  }

  const angle = rank * 2.399963229728653; // Golden angle in radians
  const radiusDeg = Math.min(0.24, 0.035 + Math.sqrt(rank) * 0.042);
  const latOffset = Math.sin(angle) * radiusDeg * 0.85;
  const lngOffset = Math.cos(angle) * radiusDeg;

  return {
    lat: Number((base.lat + latOffset).toFixed(5)),
    lng: Number((base.lng + lngOffset).toFixed(5)),
    isApproximate: true,
  };
}
