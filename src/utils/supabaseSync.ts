import {
  Governorate,
  GovernorateProfile,
  Landmark,
  LandmarkCategory,
} from '../types/tourism';
import { getLandmarkRichContent } from '../data/landmarkEnrichments';
import { resolveCanonicalGovernorateSlug } from './coordinates';

export const CLOUD_CACHE_STORAGE_KEY = 'ard_alsawad_cloud_cache_v2';

export interface CloudCachePayload {
  landmarks: Landmark[];
  governorateProfiles: Record<string, GovernorateProfile>;
  syncedAt: string;
}

export interface SupabaseLandmarkRow {
  id: string;
  name_ar?: string | null;
  name_en?: string | null;
  governorate_id?: string | null;
  governorate_ar?: string | null;
  category?: string | null;
  category_ar?: string | null;
  era?: string | null;
  coordinates?: { lat?: number | null; lng?: number | null } | null;
  lat?: number | null;
  lng?: number | null;
  description_ar?: string | null;
  historical_architectural_ar?: string | null;
  significance_ar?: string | null;
  dress_code_etiquette_ar?: string | null;
  accessibility_ar?: string | null;
  best_time_to_visit?: string | null;
  visitor_tips?: string | null;
  unesco_site?: boolean | null;
  tags?: string[] | null;
  wikimedia_search_query?: string | null;
  google_maps_url?: string | null;
  images?: string[] | null;
}

export interface SupabaseGovernorateRow {
  governorate_id: string;
  nicknames_ar?: string[] | null;
  overview_ar?: string | null;
  cultural_identity_ar?: string | null;
  traditions_cuisine_ar?: string | null;
  best_time_to_visit_ar?: string | null;
  cover_image_url?: string | null;
}

/**
 * Validates that a dynamic URL uses http(s) and rejects javascript:/data: schemes.
 */
export function isSafeHttpUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Strips query parameters and hash fragments from an http(s) URL so storage paths
 * and base-URL comparisons remain clean even when cache-busters (?t=...) are attached.
 */
export function stripQueryFromUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return trimmed.split(/[?#]/)[0] ?? trimmed;
  }
}

/**
 * Appends or refreshes a `?t=<timestamp>` cache-busting parameter on a safe http(s) URL
 * so browsers and PWA caches render newly uploaded/updated images immediately.
 */
export function appendCacheBuster(url: string, timestamp: number = Date.now()): string {
  if (!isSafeHttpUrl(url)) return '';
  try {
    const parsed = new URL(url.trim());
    parsed.searchParams.set('t', String(timestamp));
    return parsed.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url.trim()}${sep}t=${timestamp}`;
  }
}

export function sanitizeImageList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const unique: string[] = [];
  const seenBaseUrls = new Set<string>();
  for (const item of raw) {
    if (isSafeHttpUrl(item)) {
      const normalized = item.trim();
      const baseKey = stripQueryFromUrl(normalized);
      if (!seenBaseUrls.has(baseKey)) {
        seenBaseUrls.add(baseKey);
        unique.push(normalized);
      }
    }
  }
  return unique;
}

/**
 * Prepends newly uploaded photo URLs to the beginning of the images array
 * so the newest upload immediately becomes `images[0]` (the primary cover photo).
 */
export function prependPhotosToList(existingImages: string[], newUrls: string[]): string[] {
  return sanitizeImageList([...newUrls, ...existingImages]);
}

/**
 * Returns the prioritized primary Supabase/cloud image URL (`images[0]`) for a landmark.
 */
export function getPrimaryLandmarkImage(landmark?: Landmark | null): string | undefined {
  if (!landmark) return undefined;
  return sanitizeImageList(landmark.images ?? [])[0];
}

/**
 * Returns the prioritized Supabase/cloud cover image URL for a governorate profile.
 */
export function getGovernorateCoverImage(
  profile?: GovernorateProfile | null
): string | undefined {
  if (!profile || !isSafeHttpUrl(profile.cover_image_url)) return undefined;
  return profile.cover_image_url.trim();
}

export function sanitizeStorageSegment(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'item';
}

export function setCoverPhotoInList(images: string[], targetUrl: string): string[] {
  const clean = sanitizeImageList(images);
  const targetBase = stripQueryFromUrl(targetUrl);
  const matched = clean.find((url) => stripQueryFromUrl(url) === targetBase);
  if (!matched) return clean;
  return [matched, ...clean.filter((url) => stripQueryFromUrl(url) !== targetBase)];
}

export function removePhotoFromList(images: string[], targetUrl: string): string[] {
  const targetBase = stripQueryFromUrl(targetUrl);
  return sanitizeImageList(images).filter((url) => stripQueryFromUrl(url) !== targetBase);
}

const VALID_CATEGORIES = new Set<LandmarkCategory>([
  'religious',
  'archaeological',
  'nature_tourism',
]);

function normalizeCategory(raw: unknown, fallback: LandmarkCategory): LandmarkCategory {
  if (typeof raw === 'string' && VALID_CATEGORIES.has(raw as LandmarkCategory)) {
    return raw as LandmarkCategory;
  }
  return fallback;
}

function getCategoryArabicLabel(category: LandmarkCategory): string {
  if (category === 'religious') return 'المراقد والمواقع الدينية';
  if (category === 'archaeological') return 'المواقع الأثرية والتاريخية';
  return 'الطبيعة والسياحة';
}

/**
 * Merges remote Supabase `landmarks` rows seamlessly over the bundled local
 * `landmarks.json` dataset while adding any newly created cloud landmarks.
 */
export function mergeLandmarksWithRemote(
  localLandmarks: Landmark[],
  remoteRows: SupabaseLandmarkRow[],
  governorates: Governorate[]
): Landmark[] {
  if (!remoteRows || remoteRows.length === 0) {
    return localLandmarks;
  }

  const govNameMap = new Map(governorates.map((g) => [g.id, g.name_ar]));
  const remoteById = new Map<string, SupabaseLandmarkRow>();
  for (const row of remoteRows) {
    if (row && typeof row.id === 'string' && row.id.trim()) {
      remoteById.set(row.id.trim(), row);
    }
  }

  const merged: Landmark[] = [];
  const handledIds = new Set<string>();

  for (const local of localLandmarks) {
    const remote = remoteById.get(local.id);
    handledIds.add(local.id);

    if (!remote) {
      merged.push(local);
      continue;
    }

    const category = normalizeCategory(remote.category, local.category);
    const lat =
      typeof remote.coordinates?.lat === 'number'
        ? remote.coordinates.lat
        : typeof remote.lat === 'number'
          ? remote.lat
          : local.coordinates.lat;
    const lng =
      typeof remote.coordinates?.lng === 'number'
        ? remote.coordinates.lng
        : typeof remote.lng === 'number'
          ? remote.lng
          : local.coordinates.lng;

    const govId = remote.governorate_id?.trim() || local.governorate_id;
    const hasRemoteImagesField = Array.isArray(remote.images);
    const remoteImages = sanitizeImageList(remote.images);

    merged.push({
      ...local,
      name_ar: remote.name_ar?.trim() || local.name_ar,
      name_en: remote.name_en?.trim() || local.name_en,
      governorate_id: govId,
      governorate_ar:
        remote.governorate_ar?.trim() || govNameMap.get(govId) || local.governorate_ar,
      category,
      category_ar: remote.category_ar?.trim() || getCategoryArabicLabel(category),
      era: remote.era?.trim() || local.era,
      coordinates: { lat, lng },
      description_ar: remote.description_ar?.trim() || local.description_ar,
      best_time_to_visit: remote.best_time_to_visit?.trim() || local.best_time_to_visit,
      visitor_tips: remote.visitor_tips?.trim() || local.visitor_tips,
      unesco_site:
        typeof remote.unesco_site === 'boolean' ? remote.unesco_site : local.unesco_site,
      tags: Array.isArray(remote.tags)
        ? remote.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        : local.tags,
      wikimedia_search_query:
        remote.wikimedia_search_query?.trim() || local.wikimedia_search_query,
      google_maps_url: isSafeHttpUrl(remote.google_maps_url)
        ? remote.google_maps_url.trim()
        : local.google_maps_url,
      images: hasRemoteImagesField ? remoteImages : local.images,
      historical_architectural_ar:
        remote.historical_architectural_ar?.trim() || local.historical_architectural_ar,
      significance_ar: remote.significance_ar?.trim() || local.significance_ar,
      dress_code_etiquette_ar:
        remote.dress_code_etiquette_ar?.trim() || local.dress_code_etiquette_ar,
      accessibility_ar: remote.accessibility_ar?.trim() || local.accessibility_ar,
    });
  }

  // Append brand-new cloud landmarks added by the Admin
  for (const row of remoteRows) {
    const id = row?.id?.trim();
    if (!id || handledIds.has(id)) continue;
    if (!row.name_ar?.trim()) continue;

    const category = normalizeCategory(row.category, 'archaeological');
    const govId = row.governorate_id?.trim() || governorates[0]?.id || 'IQ-NATIONAL';
    const lat =
      typeof row.coordinates?.lat === 'number'
        ? row.coordinates.lat
        : typeof row.lat === 'number'
          ? row.lat
          : null;
    const lng =
      typeof row.coordinates?.lng === 'number'
        ? row.coordinates.lng
        : typeof row.lng === 'number'
          ? row.lng
          : null;

    const fallbackMapsUrl =
      lat !== null && lng !== null
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${row.name_en?.trim() || row.name_ar.trim()} Iraq`)}`;

    merged.unshift({
      id,
      name_ar: row.name_ar.trim(),
      name_en: row.name_en?.trim() || id,
      governorate_id: govId,
      governorate_ar: row.governorate_ar?.trim() || govNameMap.get(govId) || 'العراق',
      category,
      category_ar: row.category_ar?.trim() || getCategoryArabicLabel(category),
      era: row.era?.trim() || 'تاريخي ومعاصر',
      coordinates: { lat, lng },
      description_ar: row.description_ar?.trim() || '',
      best_time_to_visit:
        row.best_time_to_visit?.trim() || 'من أكتوبر إلى أبريل (الأشهر المعتدلة)',
      visitor_tips: row.visitor_tips?.trim() || 'يُرجى التحقق من أوقات الزيارة المحلية.',
      unesco_site: Boolean(row.unesco_site),
      tags: Array.isArray(row.tags)
        ? row.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        : [],
      wikimedia_search_query: row.wikimedia_search_query?.trim() || row.name_en?.trim() || '',
      google_maps_url: isSafeHttpUrl(row.google_maps_url)
        ? row.google_maps_url.trim()
        : fallbackMapsUrl,
      images: sanitizeImageList(row.images),
      historical_architectural_ar: row.historical_architectural_ar?.trim() || undefined,
      significance_ar: row.significance_ar?.trim() || undefined,
      dress_code_etiquette_ar: row.dress_code_etiquette_ar?.trim() || undefined,
      accessibility_ar: row.accessibility_ar?.trim() || undefined,
    });
  }

  return merged;
}

/**
 * Merges remote Supabase `governorates_content` rows over local governorate profiles.
 */
export function mergeGovernorateProfilesWithRemote(
  localProfiles: Record<string, GovernorateProfile>,
  remoteRows: SupabaseGovernorateRow[],
  governorates?: Governorate[]
): Record<string, GovernorateProfile> {
  const next: Record<string, GovernorateProfile> = { ...localProfiles };
  if (!remoteRows || remoteRows.length === 0) return next;

  // Map canonical slugs (e.g., 'baghdad', 'nineveh') to active local profile IDs (e.g., 'IQ-GOV-01')
  const slugToLocalId = new Map<string, string>();
  if (governorates) {
    for (const gov of governorates) {
      const slug =
        resolveCanonicalGovernorateSlug(gov.id) ??
        resolveCanonicalGovernorateSlug(gov.name_en) ??
        resolveCanonicalGovernorateSlug(gov.name_ar);
      if (slug) slugToLocalId.set(slug, gov.id);
    }
  }
  for (const localId of Object.keys(localProfiles)) {
    const slug = resolveCanonicalGovernorateSlug(localId);
    if (slug && !slugToLocalId.has(slug)) {
      slugToLocalId.set(slug, localId);
    }
  }

  for (const row of remoteRows) {
    const rawId = row?.governorate_id?.trim();
    if (!rawId) continue;

    const canonicalSlug = resolveCanonicalGovernorateSlug(rawId);
    const resolvedId = localProfiles[rawId]
      ? rawId
      : canonicalSlug && slugToLocalId.has(canonicalSlug)
        ? slugToLocalId.get(canonicalSlug)!
        : rawId;

    const base = next[resolvedId] ?? localProfiles[resolvedId];
    const hasCoverField = Object.prototype.hasOwnProperty.call(row, 'cover_image_url');
    const safeCover = isSafeHttpUrl(row.cover_image_url)
      ? row.cover_image_url.trim()
      : null;

    if (base) {
      next[resolvedId] = {
        ...base,
        governorate_id: resolvedId,
        nicknames_ar:
          Array.isArray(row.nicknames_ar) && row.nicknames_ar.length > 0
            ? row.nicknames_ar.filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
            : base.nicknames_ar,
        overview_ar: row.overview_ar?.trim() || base.overview_ar,
        cultural_identity_ar:
          row.cultural_identity_ar?.trim() || base.cultural_identity_ar,
        traditions_cuisine_ar:
          row.traditions_cuisine_ar?.trim() || base.traditions_cuisine_ar,
        best_time_to_visit_ar:
          row.best_time_to_visit_ar?.trim() || base.best_time_to_visit_ar,
        cover_image_url: hasCoverField ? safeCover : (base.cover_image_url ?? null),
      };
    } else {
      next[resolvedId] = {
        governorate_id: resolvedId,
        nicknames_ar: Array.isArray(row.nicknames_ar) ? row.nicknames_ar : [],
        overview_ar: row.overview_ar?.trim() || '',
        cultural_identity_ar: row.cultural_identity_ar?.trim() || '',
        traditions_cuisine_ar: row.traditions_cuisine_ar?.trim() || '',
        best_time_to_visit_ar: row.best_time_to_visit_ar?.trim() || '',
        cover_image_url: safeCover,
      };
    }
  }

  return next;
}

/**
 * Converts a Landmark into the exact upsert row shape for Supabase `landmarks`.
 */
export function toSupabaseLandmarkPayload(landmark: Landmark) {
  const richFallback = getLandmarkRichContent(landmark);
  return {
    id: landmark.id,
    name_ar: landmark.name_ar,
    name_en: landmark.name_en,
    governorate_id: landmark.governorate_id,
    governorate_ar: landmark.governorate_ar,
    category: landmark.category,
    category_ar: landmark.category_ar,
    era: landmark.era,
    coordinates: landmark.coordinates,
    description_ar: landmark.description_ar,
    historical_architectural_ar:
      landmark.historical_architectural_ar ??
      richFallback.historical_architectural_ar,
    significance_ar:
      landmark.significance_ar ?? richFallback.significance_ar,
    dress_code_etiquette_ar:
      landmark.dress_code_etiquette_ar ??
      richFallback.dress_code_etiquette_ar,
    accessibility_ar:
      landmark.accessibility_ar ?? richFallback.accessibility_ar,
    best_time_to_visit: landmark.best_time_to_visit,
    visitor_tips: landmark.visitor_tips,
    unesco_site: landmark.unesco_site,
    tags: landmark.tags,
    wikimedia_search_query: landmark.wikimedia_search_query,
    google_maps_url: landmark.google_maps_url,
    images: sanitizeImageList(landmark.images ?? []),
    updated_at: new Date().toISOString(),
  };
}

export function buildSeedLandmarkPayloads(localLandmarks: Landmark[]) {
  return localLandmarks.map((landmark) => toSupabaseLandmarkPayload(landmark));
}

export function buildSeedGovernoratePayloads(
  localProfiles: Record<string, GovernorateProfile>
) {
  return Object.values(localProfiles).map((profile) => ({
    governorate_id: profile.governorate_id,
    nicknames_ar: profile.nicknames_ar,
    overview_ar: profile.overview_ar,
    cultural_identity_ar: profile.cultural_identity_ar,
    traditions_cuisine_ar: profile.traditions_cuisine_ar,
    best_time_to_visit_ar: profile.best_time_to_visit_ar,
    cover_image_url: profile.cover_image_url ?? null,
    updated_at: new Date().toISOString(),
  }));
}

export function serializeCloudCache(payload: CloudCachePayload): string {
  return JSON.stringify(payload);
}

export function deserializeCloudCache(raw: string | null): CloudCachePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CloudCachePayload>;
    if (!parsed || !Array.isArray(parsed.landmarks) || !parsed.governorateProfiles) {
      return null;
    }
    return {
      landmarks: parsed.landmarks,
      governorateProfiles: parsed.governorateProfiles,
      syncedAt: typeof parsed.syncedAt === 'string' ? parsed.syncedAt : '',
    };
  } catch {
    return null;
  }
}

export function loadCloudCacheFromStorage(): CloudCachePayload | null {
  try {
    return deserializeCloudCache(window.localStorage.getItem(CLOUD_CACHE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveCloudCacheToStorage(payload: CloudCachePayload): void {
  try {
    window.localStorage.setItem(
      CLOUD_CACHE_STORAGE_KEY,
      serializeCloudCache(payload)
    );
  } catch {
    // Ignore storage quota errors in restricted browsing contexts
  }
}

/**
 * Reference SQL for creating the Supabase tables, Storage bucket, and RLS policies.
 * Displayed inside the Admin Panel if tables have not yet been initialized.
 */
export const SUPABASE_SETUP_SQL = `-- 1. جدول المعالم (landmarks)
create table if not exists public.landmarks (
  id text primary key,
  name_ar text not null,
  name_en text not null default '',
  governorate_id text not null,
  governorate_ar text not null,
  category text not null,
  category_ar text not null,
  era text not null default '',
  coordinates jsonb not null default '{"lat":33.3152,"lng":44.3661}'::jsonb,
  description_ar text not null default '',
  historical_architectural_ar text not null default '',
  significance_ar text not null default '',
  dress_code_etiquette_ar text not null default '',
  accessibility_ar text not null default '',
  best_time_to_visit text not null default '',
  visitor_tips text not null default '',
  unesco_site boolean not null default false,
  tags jsonb not null default '[]'::jsonb,
  wikimedia_search_query text not null default '',
  google_maps_url text not null default '',
  images jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. جدول محتوى المحافظات (governorates_content)
create table if not exists public.governorates_content (
  governorate_id text primary key,
  nicknames_ar jsonb not null default '[]'::jsonb,
  overview_ar text not null default '',
  cultural_identity_ar text not null default '',
  traditions_cuisine_ar text not null default '',
  best_time_to_visit_ar text not null default '',
  cover_image_url text,
  updated_at timestamptz not null default now()
);

-- 3. تفعيل الحماية (RLS): قراءة للجميع، وتعديل للمدير المسجل فقط
alter table public.landmarks enable row level security;
alter table public.governorates_content enable row level security;

create policy "Public read landmarks" on public.landmarks for select using (true);
create policy "Auth write landmarks" on public.landmarks for all to authenticated using (true) with check (true);

create policy "Public read governorates_content" on public.governorates_content for select using (true);
create policy "Auth write governorates_content" on public.governorates_content for all to authenticated using (true) with check (true);

-- 4. مخزن الصور (landmark-photos)
insert into storage.buckets (id, name, public)
values ('landmark-photos', 'landmark-photos', true)
on conflict (id) do nothing;

create policy "Public read photos" on storage.objects for select using (bucket_id = 'landmark-photos');
create policy "Auth upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'landmark-photos');
create policy "Auth delete photos" on storage.objects for delete to authenticated using (bucket_id = 'landmark-photos');`;
