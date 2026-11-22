import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { Landmark } from '../types/tourism';
import { getFallbackImageForLandmark } from '../data/database';
import { useWikimediaGallery } from '../hooks/useWikimediaGallery';
import { sanitizeImageList } from '../utils/supabaseSync';
import { UnescoBadge } from './UnescoBadge';

interface LandmarkGalleryCarouselProps {
  landmark: Landmark;
}

export const LandmarkGalleryCarousel: React.FC<LandmarkGalleryCarouselProps> = ({
  landmark,
}) => {
  const fallbackImg = useMemo(
    () => getFallbackImageForLandmark(landmark),
    [landmark]
  );

  const cloudImages = useMemo(
    () => sanitizeImageList(landmark.images ?? []),
    [landmark.images]
  );

  const fallbackGallery = useMemo(() => [fallbackImg], [fallbackImg]);

  // Only query Wikimedia Commons when no custom cloud photos have been uploaded
  const { images: wikimediaImages } = useWikimediaGallery(
    cloudImages.length > 0 ? undefined : landmark.wikimedia_search_query,
    fallbackGallery,
    1200,
    5
  );

  const images = cloudImages.length > 0 ? cloudImages : wikimediaImages;

  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset carousel slide and error cache whenever the displayed landmark or its cloud images change
  useEffect(() => {
    setActiveIndex(0);
    setFailedUrls(new Set());
  }, [landmark.id, cloudImages.join('|')]);

  // Keep valid gallery images, always guaranteeing the local fallback if all remote URLs fail
  const validImages = useMemo(() => {
    const filtered = images.filter((url) => !failedUrls.has(url));
    if (filtered.length > 0) return filtered;
    return [fallbackImg];
  }, [images, failedUrls, fallbackImg]);

  const safeIndex = Math.min(activeIndex, Math.max(0, validImages.length - 1));
  const currentSrc = validImages[safeIndex] ?? fallbackImg;
  const hasMultiple = validImages.length > 1;

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % validImages.length);
  };

  const handleImageError = (url: string) => {
    if (url === fallbackImg) return;
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  return (
    <figure
      data-testid="landmark-gallery-carousel"
      aria-label={`معرض صور ${landmark.name_ar}`}
      className="overflow-hidden rounded-2xl border border-[#0F3D3E]/12 bg-[#EBE6DA] dark:border-[#C89B3C]/20 dark:bg-[#132529]"
    >
      {/* Main 16:9 Stage */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#18292D]">
        <img
          key={currentSrc}
          src={currentSrc}
          alt={`${landmark.name_ar} — صورة ${safeIndex + 1} من ${validImages.length}`}
          referrerPolicy="no-referrer"
          onError={() => handleImageError(currentSrc)}
          className="h-full w-full object-cover transition-opacity duration-300"
        />

        {/* Subtle bottom gradient for control legibility */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0D1B1E]/60 to-transparent"
        />

        {/* UNESCO Overlay Badge (top-right in RTL) */}
        {landmark.unesco_site && (
          <div className="absolute top-3.5 right-3.5 z-10">
            <UnescoBadge variant="overlay" />
          </div>
        )}

        {/* Photo Counter Badge (top-left in RTL) */}
        <div
          data-testid="gallery-counter"
          className="absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-1.5 rounded-lg bg-[#0D1B1E]/75 px-2.5 py-1 text-xs font-semibold text-[#F9F6F0] backdrop-blur-sm tabular-nums"
        >
          <Images className="h-3.5 w-3.5 text-[#E7C87B]" aria-hidden="true" />
          <span dir="ltr">
            {safeIndex + 1} / {validImages.length}
          </span>
        </div>

        {/* RTL Prev/Next Controls */}
        {hasMultiple && (
          <>
            <button
              type="button"
              data-testid="gallery-prev"
              onClick={handlePrev}
              aria-label="الصورة السابقة"
              className="absolute top-1/2 right-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#0D1B1E]/70 text-[#F9F6F0] shadow-md backdrop-blur-sm transition-colors hover:bg-[#0F3D3E] focus-visible:outline-2 focus-visible:outline-[#C89B3C]"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              data-testid="gallery-next"
              onClick={handleNext}
              aria-label="الصورة التالية"
              className="absolute top-1/2 left-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#0D1B1E]/70 text-[#F9F6F0] shadow-md backdrop-blur-sm transition-colors hover:bg-[#0F3D3E] focus-visible:outline-2 focus-visible:outline-[#C89B3C]"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip + Caption */}
      <figcaption className="border-t border-[#0F3D3E]/10 bg-white/85 px-4 py-3 dark:border-[#C89B3C]/16 dark:bg-[#132529]">
        {hasMultiple && (
          <div
            role="tablist"
            aria-label="اختيار صورة من المعرض"
            className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-1"
          >
            {validImages.map((imgUrl, idx) => {
              const isSelected = idx === safeIndex;
              return (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`عرض الصورة ${idx + 1}`}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative h-12 w-18 shrink-0 overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-2 focus-visible:outline-[#C89B3C] ${
                    isSelected
                      ? 'border-[#C89B3C] opacity-100 ring-2 ring-[#C89B3C]/35'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt=""
                    loading="lazy"
                    onError={() => handleImageError(imgUrl)}
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#54635F] dark:text-[#A5B4AF]">
          <span>
            {landmark.name_ar} ({landmark.name_en}) — {landmark.governorate_ar}
          </span>
          {hasMultiple && (
            <span className="text-[11px] font-medium text-[#1B4B72] dark:text-[#96C2E6]">
              معرض صور موثّقة ({validImages.length})
            </span>
          )}
        </div>
      </figcaption>
    </figure>
  );
};
