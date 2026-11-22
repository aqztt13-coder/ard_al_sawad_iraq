const WIKIMEDIA_API_BASE = 'https://commons.wikimedia.org/w/api.php';
const CACHE_STORAGE_KEY = 'ard_alsawad_wikimedia_cache_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CONCURRENT_REQUESTS = 4;

interface WikimediaImageInfo {
  thumburl?: string;
  url?: string;
  mime?: string;
  width?: number;
  height?: number;
}

export interface WikimediaPageCandidate {
  title?: string;
  index?: number;
  imageinfo?: WikimediaImageInfo[];
}

interface CacheRecord {
  url: string | null;
  ts: number;
}

const memoryCache = new Map<string, string | null>();
const inflightRequests = new Map<string, Promise<string | null>>();

let activeRequests = 0;
const requestQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    requestQueue.push(() => {
      activeRequests += 1;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeRequests = Math.max(0, activeRequests - 1);
  const next = requestQueue.shift();
  if (next) next();
}

export function buildWikimediaSearchUrl(query: string, thumbWidth: number = 960): string {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: `${query} filetype:bitmap`,
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|mime|dimensions',
    iiurlwidth: String(thumbWidth),
  });
  return `${WIKIMEDIA_API_BASE}?${params.toString()}`;
}

const BANNED_TITLE_PATTERNS = [
  /\.svg$/i,
  /\.pdf$/i,
  /\.djvu$/i,
  /\.tif+$/i,
  /\bmap\b/i,
  /\blocation\b/i,
  /\blogo\b/i,
  /\bflag\b/i,
  /\bcoat of arms\b/i,
  /\bseal\b/i,
  /\bplan\b/i,
  /\bdiagram\b/i,
  /\bstamp\b/i,
];

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const GALLERY_CACHE_KEY = 'ard_alsawad_wikimedia_gallery_v1';

interface GalleryCacheRecord {
  urls: string[];
  ts: number;
}

const galleryMemoryCache = new Map<string, string[]>();
const galleryInflight = new Map<string, Promise<string[]>>();

/**
 * Pure selector that returns up to `maxCount` distinct high-resolution
 * photographic candidates from Wikimedia Commons search results.
 */
export function selectWikimediaGalleryUrls(
  pages: Record<string, WikimediaPageCandidate> | undefined,
  maxCount: number = 5
): string[] {
  if (!pages || maxCount <= 0) return [];

  const candidates = Object.values(pages)
    .map((page) => {
      const info = page.imageinfo?.[0];
      const title = page.title ?? '';
      const resolvedUrl = info?.thumburl || info?.url || '';
      const mime = info?.mime ?? '';
      const width = info?.width ?? 0;
      const height = info?.height ?? 0;
      return { title, resolvedUrl, mime, width, height, index: page.index ?? 99 };
    })
    .filter((item) => {
      if (!item.resolvedUrl) return false;
      if (item.mime && !ALLOWED_MIMES.has(item.mime)) return false;
      const normalizedTitle = item.title.replace(/[_-]+/g, ' ');
      if (BANNED_TITLE_PATTERNS.some((pattern) => pattern.test(normalizedTitle))) return false;
      if (item.width > 0 && item.width < 320) return false;
      return true;
    });

  if (candidates.length === 0) return [];

  // Prefer landscape photographs with strong resolution while respecting search relevance
  candidates.sort((a, b) => {
    const score = (c: typeof a) => {
      let s = 0;
      if (c.mime === 'image/jpeg') s += 20;
      if (c.width >= 800) s += 15;
      if (c.width > c.height) s += 12; // landscape fits 4:3 and 16:9 frames cleanly
      s -= c.index * 3;
      return s;
    };
    return score(b) - score(a);
  });

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of candidates) {
    if (!seen.has(item.resolvedUrl)) {
      seen.add(item.resolvedUrl);
      unique.push(item.resolvedUrl);
      if (unique.length >= maxCount) break;
    }
  }
  return unique;
}

/**
 * Pure selector that picks the best high-resolution photographic candidate
 * returned by the Wikimedia Commons MediaWiki API.
 */
export function selectBestWikimediaImageUrl(
  pages: Record<string, WikimediaPageCandidate> | undefined
): string | null {
  return selectWikimediaGalleryUrls(pages, 1)[0] ?? null;
}

function readPersistentCache(): Record<string, CacheRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writePersistentCache(query: string, url: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = readPersistentCache();
    cache[query] = { url, ts: Date.now() };
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota issues cleanly
  }
}

function readGalleryPersistentCache(): Record<string, GalleryCacheRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(GALLERY_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeGalleryPersistentCache(query: string, urls: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = readGalleryPersistentCache();
    cache[query] = { urls, ts: Date.now() };
    window.localStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota issues cleanly
  }
}

export function getCachedWikimediaImage(query: string): string | null | undefined {
  const key = query.trim();
  if (!key) return null;
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  const disk = readPersistentCache();
  const entry = disk[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    memoryCache.set(key, entry.url);
    return entry.url;
  }
  return undefined;
}

export function getCachedWikimediaGallery(query: string): string[] | undefined {
  const key = query.trim();
  if (!key) return [];
  if (galleryMemoryCache.has(key)) {
    return galleryMemoryCache.get(key);
  }
  const disk = readGalleryPersistentCache();
  const entry = disk[key];
  if (entry && Array.isArray(entry.urls) && Date.now() - entry.ts < CACHE_TTL_MS) {
    galleryMemoryCache.set(key, entry.urls);
    return entry.urls;
  }
  return undefined;
}

export async function fetchWikimediaImage(
  query: string,
  thumbWidth: number = 960
): Promise<string | null> {
  const key = query.trim();
  if (!key) return null;

  const cached = getCachedWikimediaImage(key);
  if (cached !== undefined) {
    return cached;
  }

  const existing = inflightRequests.get(key);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    await acquireSlot();
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return null;
      }

      const response = await fetch(buildWikimediaSearchUrl(key, thumbWidth), {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        query?: { pages?: Record<string, WikimediaPageCandidate> };
      };
      const bestUrl = selectBestWikimediaImageUrl(data?.query?.pages);
      memoryCache.set(key, bestUrl);
      writePersistentCache(key, bestUrl);
      return bestUrl;
    } catch {
      return null;
    } finally {
      releaseSlot();
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, task);
  return task;
}

export async function fetchWikimediaGallery(
  query: string,
  thumbWidth: number = 1200,
  maxCount: number = 5
): Promise<string[]> {
  const key = query.trim();
  if (!key) return [];

  const cached = getCachedWikimediaGallery(key);
  if (cached !== undefined) {
    return cached.slice(0, maxCount);
  }

  const existing = galleryInflight.get(key);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    await acquireSlot();
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return [];
      }

      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        origin: '*',
        generator: 'search',
        gsrnamespace: '6',
        gsrsearch: `${key} filetype:bitmap`,
        gsrlimit: '12',
        prop: 'imageinfo',
        iiprop: 'url|mime|dimensions',
        iiurlwidth: String(thumbWidth),
      });

      const response = await fetch(`${WIKIMEDIA_API_BASE}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as {
        query?: { pages?: Record<string, WikimediaPageCandidate> };
      };
      const urls = selectWikimediaGalleryUrls(data?.query?.pages, maxCount);
      galleryMemoryCache.set(key, urls);
      writeGalleryPersistentCache(key, urls);
      if (urls[0]) {
        memoryCache.set(key, urls[0]);
        writePersistentCache(key, urls[0]);
      }
      return urls;
    } catch {
      return [];
    } finally {
      releaseSlot();
      galleryInflight.delete(key);
    }
  })();

  galleryInflight.set(key, task);
  return task;
}
