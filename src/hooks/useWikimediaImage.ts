import { useEffect, useState } from 'react';
import { fetchWikimediaImage, getCachedWikimediaImage } from '../utils/wikimedia';

interface UseWikimediaImageResult {
  src: string;
  isWikimedia: boolean;
  isLoading: boolean;
}

export function useWikimediaImage(
  searchQuery: string | undefined,
  fallbackUrl: string,
  enabled: boolean = true,
  thumbWidth: number = 960
): UseWikimediaImageResult {
  const cachedInitial = searchQuery ? getCachedWikimediaImage(searchQuery) : undefined;
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    cachedInitial ?? null
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    Boolean(searchQuery && enabled && cachedInitial === undefined)
  );

  useEffect(() => {
    if (!searchQuery || !enabled) {
      setIsLoading(false);
      return;
    }

    const cached = getCachedWikimediaImage(searchQuery);
    if (cached !== undefined) {
      setResolvedUrl(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchWikimediaImage(searchQuery, thumbWidth).then((url) => {
      if (!cancelled) {
        setResolvedUrl(url);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [searchQuery, enabled, thumbWidth]);

  return {
    src: resolvedUrl || fallbackUrl,
    isWikimedia: Boolean(resolvedUrl),
    isLoading,
  };
}
