import React, { useEffect, useRef, useState } from 'react';
import { Landmark as LandmarkIcon } from 'lucide-react';
import { useWikimediaImage } from '../hooks/useWikimediaImage';

interface LandmarkImageProps {
  src?: string;
  wikimediaQuery?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  thumbWidth?: number;
}

export const LandmarkImage: React.FC<LandmarkImageProps> = ({
  src,
  wikimediaQuery,
  fallbackSrc = '',
  alt,
  className = '',
  priority = false,
  thumbWidth = 960,
}) => {
  const primarySrc = src?.trim() || '';
  const activeWikimediaQuery = primarySrc ? undefined : wikimediaQuery;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState<boolean>(priority || !activeWikimediaQuery);
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  // Lazy-trigger Wikimedia Commons fetch only when no explicit cloud/Supabase src exists
  useEffect(() => {
    if (inView || !activeWikimediaQuery) return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '260px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, activeWikimediaQuery]);

  const effectiveFallback = fallbackSrc.trim();
  const { src: resolvedWikimediaSrc } = useWikimediaImage(
    activeWikimediaQuery,
    effectiveFallback,
    inView,
    thumbWidth
  );

  // Reset error states whenever explicit src, Wikimedia resolution, or query changes
  useEffect(() => {
    setPrimaryFailed(false);
    setFallbackFailed(false);
  }, [primarySrc, resolvedWikimediaSrc, activeWikimediaQuery]);

  // Strict priority: explicit Supabase/cloud `src` -> Wikimedia Commons -> local fallback
  const desiredSrc = primarySrc
    ? primarySrc
    : activeWikimediaQuery
      ? resolvedWikimediaSrc
      : effectiveFallback;

  const activeSrc =
    primaryFailed && effectiveFallback && desiredSrc !== effectiveFallback
      ? effectiveFallback
      : desiredSrc;

  if (!activeSrc || (primaryFailed && (fallbackFailed || activeSrc === desiredSrc))) {
    return (
      <div
        ref={containerRef}
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0F3D3E] via-[#1B4B72] to-[#0D1B1E] p-6 text-center text-[#F9F6F0] ${className}`}
      >
        <LandmarkIcon className="mb-2 h-8 w-8 text-[#C89B3C]" aria-hidden="true" />
        <span className="font-heritage text-base font-bold text-[#E7C87B]">{alt}</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <img
        key={activeSrc}
        src={activeSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (!primaryFailed && effectiveFallback && activeSrc !== effectiveFallback) {
            setPrimaryFailed(true);
          } else {
            setPrimaryFailed(true);
            setFallbackFailed(true);
          }
        }}
        className={className}
      />
    </div>
  );
};
