import { useEffect, useState } from 'react';
import {
  fetchWikimediaGallery,
  getCachedWikimediaGallery,
} from '../utils/wikimedia';

interface UseWikimediaGalleryResult {
  images: string[];
  isLoading: boolean;
}

/**
 * Fetches multiple real Wikimedia Commons photographs for a landmark's detail
 * gallery carousel, always starting with cached or fallback images immediately
 * so the gallery never flashes empty.
 */
export function useWikimediaGallery(
  query: string | undefined,
  fallbackImages: string[],
  thumbWidth: number = 1200,
  maxCount: number = 5
): UseWikimediaGalleryResult {
  const [images, setImages] = useState<string[]>(() => {
    if (query) {
      const cached = getCachedWikimediaGallery(query);
      if (cached && cached.length > 0) {
        return cached;
      }
    }
    return fallbackImages;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!query) return false;
    return getCachedWikimediaGallery(query) === undefined;
  });

  useEffect(() => {
    let cancelled = false;
    if (!query) {
      setImages(fallbackImages);
      setIsLoading(false);
      return;
    }

    const cached = getCachedWikimediaGallery(query);
    if (cached && cached.length > 0) {
      setImages(cached);
      setIsLoading(false);
      return;
    }

    setImages(fallbackImages);
    setIsLoading(true);

    fetchWikimediaGallery(query, thumbWidth, maxCount).then((urls) => {
      if (cancelled) return;
      if (urls.length > 0) {
        setImages(urls);
      } else {
        setImages(fallbackImages);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [query, thumbWidth, maxCount, fallbackImages.join('|')]);

  return { images, isLoading };
}
