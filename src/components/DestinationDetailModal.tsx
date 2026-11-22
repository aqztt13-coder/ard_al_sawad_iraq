import React, { useEffect, useMemo, useRef } from 'react';
import {
  X,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Calendar,
  ShieldCheck,
  Compass,
  Tag,
  AudioLines,
  Square,
  Landmark as LandmarkIcon,
  Sparkles,
  Shirt,
  Footprints,
  MapPin,
  ArrowUpLeft,
  ImagePlus,
  Pencil,
} from 'lucide-react';
import { Governorate, Landmark } from '../types/tourism';
import {
  getDisplayBestTimeToVisit,
  getDisplayVisitorTips,
  getLandmarkRichContent,
} from '../data/landmarkEnrichments';
import {
  formatCoordinatesAr,
  getLandmarkGoogleMapsUrl,
} from '../utils/arabicSearch';
import { formatDistanceAr, getNearbyLandmarks } from '../utils/geo';
import { buildAudioGuideScript } from '../utils/speech';
import { useArabicSpeech } from '../hooks/useArabicSpeech';
import { LandmarkGalleryCarousel } from './LandmarkGalleryCarousel';
import { UnescoBadge } from './UnescoBadge';

interface DestinationDetailModalProps {
  landmark: Landmark | null;
  governorate?: Governorate;
  governorates: Governorate[];
  allLandmarks: Landmark[];
  isSaved: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  onToggleSave: (landmarkId: string) => void;
  onViewOnMap: (landmark: Landmark) => void;
  onSelectLandmark: (landmark: Landmark) => void;
  onAdminManagePhotos?: (landmark: Landmark) => void;
  onAdminEditLandmark?: (landmark: Landmark) => void;
}

export const DestinationDetailModal: React.FC<DestinationDetailModalProps> = ({
  landmark,
  governorate,
  governorates,
  allLandmarks,
  isSaved,
  isAdmin = false,
  onClose,
  onToggleSave,
  onViewOnMap,
  onSelectLandmark,
  onAdminManagePhotos,
  onAdminEditLandmark,
}) => {
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const {
    isSupported: isSpeechSupported,
    isPlaying,
    speak,
    stop,
  } = useArabicSpeech();

  // Always stop audio playback and scroll body to top when modal closes or landmark changes
  useEffect(() => {
    stop();
    if (scrollBodyRef.current) {
      scrollBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return () => {
      stop();
    };
  }, [landmark?.id, stop]);

  useEffect(() => {
    if (!landmark) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stop();
        onClose();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [landmark, onClose, stop]);

  const nearbyLandmarks = useMemo(() => {
    if (!landmark) return [];
    return getNearbyLandmarks(landmark, allLandmarks, 3, governorates);
  }, [landmark, allLandmarks, governorates]);

  const richContent = useMemo(() => {
    if (!landmark) return null;
    return getLandmarkRichContent(landmark);
  }, [landmark]);

  if (!landmark || !richContent) return null;

  const mapsUrl = getLandmarkGoogleMapsUrl(landmark);
  const coordsLabel = formatCoordinatesAr(
    landmark.coordinates.lat,
    landmark.coordinates.lng
  );

  const handleClose = () => {
    stop();
    onClose();
  };

  const handleViewOnMap = () => {
    stop();
    onViewOnMap(landmark);
  };

  const handleSelectNearby = (nextLandmark: Landmark) => {
    stop();
    onSelectLandmark(nextLandmark);
  };

  const handleToggleAudioGuide = () => {
    if (isPlaying) {
      stop();
      return;
    }
    speak(buildAudioGuideScript(landmark));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="destination-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0D1B1E]/70 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={handleClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-[#C89B3C]/25 bg-[#F9F6F0] text-[#1A2421] shadow-2xl dark:bg-[#0D1B1E] dark:text-[#F1ECE2] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0F3D3E]/12 px-5 py-3.5 dark:border-[#C89B3C]/18 sm:px-7">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#54635F] dark:text-[#A5B4AF]">
            <span className="font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
              {landmark.governorate_ar}
            </span>
            <span aria-hidden="true">·</span>
            <span>{landmark.category_ar}</span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onAdminManagePhotos && (
              <button
                type="button"
                data-testid="modal-admin-photos-btn"
                onClick={() => onAdminManagePhotos(landmark)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#C89B3C]/50 bg-[#C89B3C]/14 px-3 py-1.5 text-xs font-bold text-[#7B5B17] hover:bg-[#C89B3C]/24 dark:text-[#E7C87B]"
              >
                <ImagePlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>إدارة الصور</span>
              </button>
            )}

            {isAdmin && onAdminEditLandmark && (
              <button
                type="button"
                data-testid="modal-admin-edit-btn"
                onClick={() => onAdminEditLandmark(landmark)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#0F3D3E]/20 bg-white px-3 py-1.5 text-xs font-bold text-[#0F3D3E] hover:bg-[#0F3D3E]/8 dark:border-[#C89B3C]/25 dark:bg-[#132529] dark:text-[#F1ECE2]"
              >
                <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>تعديل المحتوى</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              aria-label="إغلاق تفاصيل المعلم"
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#0F3D3E]/15 text-[#1A2421] transition-colors hover:bg-[#0F3D3E]/8 focus-visible:outline-2 focus-visible:outline-[#C89B3C] dark:border-[#C89B3C]/25 dark:text-[#F1ECE2] dark:hover:bg-[#F9F6F0]/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Curatorial Monograph Body */}
        <div
          ref={scrollBodyRef}
          className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6"
        >
          {/* Multi-Photo Gallery Carousel */}
          <LandmarkGalleryCarousel landmark={landmark} />

          {/* Title, English Name, UNESCO Emblem & Arabic Audio Guide */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                id="destination-modal-title"
                className="font-heritage text-2xl font-bold leading-snug text-[#0F3D3E] dark:text-[#F4EFE6] sm:text-4xl"
              >
                {landmark.name_ar}
              </h2>
              <p
                className="mt-1 text-right text-sm font-medium text-[#1B4B72] dark:text-[#96C2E6]"
                dir="ltr"
              >
                {landmark.name_en}
              </p>
              {landmark.unesco_site && (
                <div className="mt-3">
                  <UnescoBadge variant="inline" />
                </div>
              )}
            </div>

            {/* Arabic Audio Guide ("الدليل الصوتي") Control */}
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[11px] font-semibold text-[#5C6A66] dark:text-[#9AA8A3]">
                الدليل الصوتي
              </span>
              {isSpeechSupported ? (
                <button
                  type="button"
                  data-testid="audio-guide-toggle"
                  onClick={handleToggleAudioGuide}
                  aria-pressed={isPlaying}
                  className={`mt-1.5 inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] ${
                    isPlaying
                      ? 'border border-[#C89B3C] bg-[#C89B3C] text-[#0D1B1E] shadow-sm'
                      : 'border border-[#0F3D3E]/20 bg-white text-[#0F3D3E] hover:bg-[#0F3D3E]/6 dark:border-[#C89B3C]/30 dark:bg-[#132529] dark:text-[#E7C87B] dark:hover:bg-[#1B3137]'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <AudioLines
                        className="h-4 w-4 shrink-0 animate-pulse"
                        aria-hidden="true"
                      />
                      <span>إيقاف</span>
                      <Square
                        className="h-3 w-3 shrink-0 fill-current"
                        aria-hidden="true"
                      />
                    </>
                  ) : (
                    <>
                      <AudioLines
                        className="h-4 w-4 shrink-0 text-[#C89B3C]"
                        aria-hidden="true"
                      />
                      <span>استمع للنبذة</span>
                    </>
                  )}
                </button>
              ) : (
                <p className="mt-1.5 text-xs text-[#7A8783] dark:text-[#869691]">
                  الدليل الصوتي غير مدعوم في هذا المتصفح
                </p>
              )}
            </div>
          </div>

          {/* Museum Accession-Style Definition List */}
          <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-[#0F3D3E]/12 py-5 dark:border-[#C89B3C]/18 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-medium text-[#5C6A66] dark:text-[#9AA8A3]">
                الحقبة التاريخية
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#1A2421] dark:text-[#F1ECE2]">
                {landmark.era}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#5C6A66] dark:text-[#9AA8A3]">
                التصنيف
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#1A2421] dark:text-[#F1ECE2]">
                {landmark.category_ar}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#5C6A66] dark:text-[#9AA8A3]">
                المحافظة والإقليم
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#1A2421] dark:text-[#F1ECE2]">
                {governorate
                  ? `${governorate.name_ar} · ${governorate.region}`
                  : landmark.governorate_ar}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#5C6A66] dark:text-[#9AA8A3]">
                الإحداثيات الجغرافية
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#1A2421] dark:text-[#F1ECE2] tabular-nums">
                {coordsLabel}
              </dd>
            </div>
          </dl>

          {/* Structured Rich Arabic Sections */}
          <div className="mt-6 space-y-6">
            {/* Section 1: Historical & Architectural Background */}
            <section
              data-testid="section-historical-architectural"
              className="rounded-2xl border border-[#0F3D3E]/12 bg-white/85 p-5 dark:border-[#C89B3C]/18 dark:bg-[#132529]/90 sm:p-6"
            >
              <h3 className="flex items-center gap-2.5 font-heritage text-xl font-bold text-[#0F3D3E] dark:text-[#E7C87B] sm:text-2xl">
                <LandmarkIcon
                  className="h-5 w-5 shrink-0 text-[#C89B3C]"
                  aria-hidden="true"
                />
                <span>نبذة تاريخية ومعمارية</span>
              </h3>
              <p className="mt-3 text-[15px] leading-[1.9] text-[#2F3B38] dark:text-[#D5DDD9]">
                {landmark.description_ar}
              </p>
              <p className="mt-3 text-[15px] leading-[1.9] text-[#2F3B38] dark:text-[#D5DDD9]">
                {richContent.historical_architectural_ar}
              </p>
            </section>

            {/* Section 2: Religious & Civilizational Significance */}
            <section
              data-testid="section-significance"
              className="rounded-2xl border border-[#0F3D3E]/12 bg-white/85 p-5 dark:border-[#C89B3C]/18 dark:bg-[#132529]/90 sm:p-6"
            >
              <h3 className="flex items-center gap-2.5 font-heritage text-xl font-bold text-[#0F3D3E] dark:text-[#E7C87B] sm:text-2xl">
                <Sparkles
                  className="h-5 w-5 shrink-0 text-[#C89B3C]"
                  aria-hidden="true"
                />
                <span>الأهمية الدينية والحضارية</span>
              </h3>
              <p className="mt-3 text-[15px] leading-[1.9] text-[#2F3B38] dark:text-[#D5DDD9]">
                {richContent.significance_ar}
              </p>

              {landmark.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#0F3D3E]/10 pt-3.5 dark:border-[#C89B3C]/15">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#54635F] dark:text-[#A5B4AF]">
                    <Tag className="h-3.5 w-3.5 text-[#C89B3C]" aria-hidden="true" />
                    <span>الوسوم:</span>
                  </span>
                  <span className="text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                    {landmark.tags.join('  ·  ')}
                  </span>
                </div>
              )}
            </section>

            {/* Section 3: Visitor Information (Best Time, Etiquette, Accessibility, Tips, Nearby Landmarks) */}
            <section
              data-testid="section-visitor-info"
              className="rounded-2xl border border-[#0F3D3E]/12 bg-white/85 p-5 dark:border-[#C89B3C]/18 dark:bg-[#132529]/90 sm:p-6"
            >
              <h3 className="flex items-center gap-2.5 font-heritage text-xl font-bold text-[#0F3D3E] dark:text-[#E7C87B] sm:text-2xl">
                <ShieldCheck
                  className="h-5 w-5 shrink-0 text-[#C89B3C]"
                  aria-hidden="true"
                />
                <span>معلومات الزائر</span>
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#0F3D3E]/10 bg-[#F9F6F0]/80 p-4 dark:border-[#C89B3C]/14 dark:bg-[#0D1B1E]/65">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
                    <Calendar className="h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
                    <span>أفضل وقت للزيارة</span>
                  </h4>
                  <p className="mt-2 text-sm leading-[1.8] text-[#3B4945] dark:text-[#C5D0CC]">
                    {getDisplayBestTimeToVisit(landmark)}
                  </p>
                </div>

                <div className="rounded-xl border border-[#0F3D3E]/10 bg-[#F9F6F0]/80 p-4 dark:border-[#C89B3C]/14 dark:bg-[#0D1B1E]/65">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
                    <Shirt className="h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
                    <span>آداب الزيارة واللباس</span>
                  </h4>
                  <p className="mt-2 text-sm leading-[1.8] text-[#3B4945] dark:text-[#C5D0CC]">
                    {richContent.dress_code_etiquette_ar}
                  </p>
                </div>

                <div className="rounded-xl border border-[#0F3D3E]/10 bg-[#F9F6F0]/80 p-4 dark:border-[#C89B3C]/14 dark:bg-[#0D1B1E]/65">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
                    <Footprints className="h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
                    <span>الوصول والتسهيلات</span>
                  </h4>
                  <p className="mt-2 text-sm leading-[1.8] text-[#3B4945] dark:text-[#C5D0CC]">
                    {richContent.accessibility_ar}
                  </p>
                </div>

                <div className="rounded-xl border border-[#0F3D3E]/10 bg-[#F9F6F0]/80 p-4 dark:border-[#C89B3C]/14 dark:bg-[#0D1B1E]/65">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
                    <span>نصائح وإرشادات الزائر</span>
                  </h4>
                  <p className="mt-2 text-sm leading-[1.8] text-[#3B4945] dark:text-[#C5D0CC]">
                    {getDisplayVisitorTips(landmark)}
                  </p>
                </div>
              </div>

              {/* Nearby Landmarks Sub-section */}
              {nearbyLandmarks.length > 0 && (
                <div
                  data-testid="nearby-landmarks-section"
                  className="mt-5 border-t border-[#0F3D3E]/10 pt-5 dark:border-[#C89B3C]/16"
                >
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
                    <MapPin className="h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
                    <span>معالم قريبة يمكنك زيارتها</span>
                  </h4>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {nearbyLandmarks.map(({ landmark: nearby, distanceKm }) => (
                      <button
                        key={nearby.id}
                        type="button"
                        data-testid={`nearby-landmark-${nearby.id}`}
                        onClick={() => handleSelectNearby(nearby)}
                        className="group flex flex-col justify-between rounded-xl border border-[#0F3D3E]/14 bg-[#F9F6F0]/80 p-3.5 text-right transition-colors hover:border-[#C89B3C]/55 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:border-[#C89B3C]/20 dark:bg-[#0D1B1E]/75 dark:hover:border-[#C89B3C]/60 dark:hover:bg-[#152A2F]"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#1B4B72] dark:text-[#96C2E6]">
                            <span>{nearby.governorate_ar}</span>
                            <span className="text-[#8A6518] dark:text-[#E7C87B] tabular-nums">
                              {formatDistanceAr(distanceKm)}
                            </span>
                          </div>
                          <p className="mt-1.5 font-heritage text-base font-bold leading-snug text-[#0F3D3E] group-hover:text-[#1B4B72] dark:text-[#F4EFE6] dark:group-hover:text-[#E7C87B]">
                            {nearby.name_ar}
                          </p>
                        </div>
                        <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#54635F] group-hover:text-[#0F3D3E] dark:text-[#A5B4AF] dark:group-hover:text-[#E7C87B]">
                          <span>عرض التفاصيل</span>
                          <ArrowUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Sticky Footer Actions (Compact on Mobile, Spacious on Desktop) */}
        <div className="flex flex-col gap-2 border-t border-[#0F3D3E]/12 bg-[#F4EFE4] px-4 py-3 dark:border-[#C89B3C]/18 dark:bg-[#102125] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-7 sm:py-3.5">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#0F3D3E] px-3 py-2 text-xs font-semibold text-[#F9F6F0] transition-colors hover:bg-[#144F50] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:bg-[#C89B3C] dark:text-[#0D1B1E] dark:hover:bg-[#D7AC4D] sm:min-h-[44px] sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm whitespace-nowrap"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>خرائط جوجل</span>
            </a>

            <button
              type="button"
              onClick={handleViewOnMap}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#0F3D3E]/20 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D3E] transition-colors hover:bg-[#F9F6F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:border-[#C89B3C]/25 dark:bg-[#132529] dark:text-[#E7C87B] dark:hover:bg-[#1B3137] sm:min-h-[44px] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm whitespace-nowrap"
            >
              <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>على الخريطة</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onToggleSave(landmark.id)}
            aria-pressed={isSaved}
            className={`inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] sm:min-h-[44px] sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm ${
              isSaved
                ? 'bg-[#C89B3C]/22 text-[#7B5B17] dark:bg-[#C89B3C]/25 dark:text-[#E7C87B]'
                : 'border border-[#0F3D3E]/20 bg-white text-[#1A2421] hover:bg-[#0F3D3E]/8 dark:border-[#C89B3C]/25 dark:bg-[#132529] dark:text-[#F1ECE2]'
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>محفوظ في مسار الرحلة</span>
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>حفظ في مسار الرحلة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
