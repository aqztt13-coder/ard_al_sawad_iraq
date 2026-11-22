import React from 'react';
import {
  Bookmark,
  BookmarkCheck,
  ArrowUpLeft,
  Navigation,
  ImagePlus,
  Pencil,
  ExternalLink,
} from 'lucide-react';
import { Landmark } from '../types/tourism';
import { getFallbackImageForLandmark } from '../data/database';
import {
  CATEGORY_SHORT_LABELS,
  getLandmarkGoogleMapsUrl,
} from '../utils/arabicSearch';
import { formatDistanceAr } from '../utils/geo';
import { getPrimaryLandmarkImage } from '../utils/supabaseSync';
import { LandmarkImage } from './LandmarkImage';
import { UnescoBadge } from './UnescoBadge';

interface LandmarkCardProps {
  landmark: Landmark;
  isSaved: boolean;
  distanceKm?: number;
  isAdmin?: boolean;
  onSelect: (landmark: Landmark) => void;
  onToggleSave: (landmarkId: string) => void;
  onManagePhotos?: (landmark: Landmark) => void;
  onEditLandmark?: (landmark: Landmark) => void;
}

export const LandmarkCard: React.FC<LandmarkCardProps> = ({
  landmark,
  isSaved,
  distanceKm,
  isAdmin = false,
  onSelect,
  onToggleSave,
  onManagePhotos,
  onEditLandmark,
}) => {
  const fallbackImg = getFallbackImageForLandmark(landmark);
  const cloudCoverUrl = getPrimaryLandmarkImage(landmark);
  const distanceLabel =
    distanceKm !== undefined ? formatDistanceAr(distanceKm) : '';
  const mapsUrl = getLandmarkGoogleMapsUrl(landmark);
  const categoryLabel =
    CATEGORY_SHORT_LABELS[landmark.category] ?? landmark.category_ar;

  return (
    <article
      data-testid={`landmark-card-${landmark.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#0F3D3E]/12 bg-white/85 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 dark:border-[#C89B3C]/18 dark:bg-[#132529]/90"
    >
      <button
        type="button"
        onClick={() => onSelect(landmark)}
        className="flex flex-1 flex-col text-right focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#C89B3C]"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#EBE6DA] dark:bg-[#0B1518]">
          <LandmarkImage
            src={cloudCoverUrl}
            wikimediaQuery={cloudCoverUrl ? undefined : landmark.wikimedia_search_query}
            fallbackSrc={fallbackImg}
            alt={landmark.name_ar}
            thumbWidth={720}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1B1E]/50 via-transparent to-transparent"
          />
          {landmark.unesco_site && (
            <div className="absolute top-3 right-3 z-10">
              <UnescoBadge variant="overlay" />
            </div>
          )}
          {distanceLabel && (
            <div
              data-testid="distance-badge"
              className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-lg border border-[#F9F6F0]/30 bg-[#0F3D3E]/90 px-2.5 py-1 text-[11px] font-bold text-[#F9F6F0] backdrop-blur-md shadow-sm tabular-nums"
            >
              <Navigation className="h-3 w-3 shrink-0 text-[#E7C87B]" aria-hidden="true" />
              <span>{distanceLabel}</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          {/* Quiet unboxed metadata line */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-[#54635F] dark:text-[#A5B4AF]">
            <span className="text-[#0F3D3E] dark:text-[#E7C87B]">
              {landmark.governorate_ar || 'العراق'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{categoryLabel}</span>
          </div>

          <h3 className="mt-2 font-heritage text-xl font-bold leading-snug text-[#15221E] transition-colors group-hover:text-[#0F3D3E] dark:text-[#F4EFE6] dark:group-hover:text-[#E7C87B]">
            {landmark.name_ar}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#4E5C58] dark:text-[#B4C0BC]">
            {landmark.description_ar || `معلم بارز في ${landmark.governorate_ar || 'العراق'}.`}
          </p>
        </div>
      </button>

      {/* Admin-Only Management Controls (Never rendered for regular visitors) */}
      {isAdmin && (onManagePhotos || onEditLandmark) && (
        <div
          data-testid={`admin-card-controls-${landmark.id}`}
          className="flex items-center justify-between gap-2 border-t border-[#C89B3C]/25 bg-[#F9F6F0]/80 px-4 py-2 dark:bg-[#0D1B1E]/75"
        >
          {onManagePhotos && (
            <button
              type="button"
              onClick={() => onManagePhotos(landmark)}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#C89B3C]/45 bg-[#C89B3C]/12 px-2.5 py-1 text-[11px] font-bold text-[#7B5B17] hover:bg-[#C89B3C]/22 dark:text-[#E7C87B]"
            >
              <ImagePlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>إدارة الصور</span>
            </button>
          )}
          {onEditLandmark && (
            <button
              type="button"
              onClick={() => onEditLandmark(landmark)}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#0F3D3E]/20 bg-white px-2.5 py-1 text-[11px] font-bold text-[#0F3D3E] hover:bg-[#0F3D3E]/8 dark:border-[#C89B3C]/28 dark:bg-[#132529] dark:text-[#F1ECE2]"
            >
              <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>تعديل</span>
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-[#0F3D3E]/8 px-4 py-2.5 dark:border-[#C89B3C]/14 sm:px-5">
        <button
          type="button"
          onClick={() => onSelect(landmark)}
          className="inline-flex min-h-[38px] items-center gap-1 text-xs font-semibold text-[#1B4B72] transition-colors hover:text-[#0F3D3E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:text-[#96C2E6] dark:hover:text-[#E7C87B] whitespace-nowrap"
        >
          <span>التفاصيل</span>
          <ArrowUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-1">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`فتح ${landmark.name_ar} في خرائط جوجل`}
            className="inline-flex min-h-[38px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#4E5C58] transition-colors hover:bg-[#0F3D3E]/8 hover:text-[#0F3D3E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:text-[#B4C0BC] dark:hover:bg-[#F9F6F0]/10 dark:hover:text-[#E7C87B] whitespace-nowrap"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>الخريطة</span>
          </a>

          <button
            type="button"
            onClick={() => onToggleSave(landmark.id)}
            aria-pressed={isSaved}
            aria-label={
              isSaved
                ? `إزالة ${landmark.name_ar} من مساري`
                : `حفظ ${landmark.name_ar} في مساري`
            }
            className={`inline-flex min-h-[38px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] ${
              isSaved
                ? 'bg-[#C89B3C]/18 text-[#7B5B17] dark:bg-[#C89B3C]/22 dark:text-[#E7C87B]'
                : 'text-[#4E5C58] hover:bg-[#0F3D3E]/8 hover:text-[#0F3D3E] dark:text-[#B4C0BC] dark:hover:bg-[#F9F6F0]/10 dark:hover:text-[#F9F6F0]'
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>محفوظ</span>
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>حفظ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
