import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  ExternalLink,
  Trash2,
  Compass,
} from 'lucide-react';
import { ItineraryEntry, Landmark } from '../types/tourism';
import { getFallbackImageForLandmark } from '../data/database';
import {
  CATEGORY_SHORT_LABELS,
  getLandmarkGoogleMapsUrl,
} from '../utils/arabicSearch';
import { getPrimaryLandmarkImage } from '../utils/supabaseSync';
import { LandmarkImage } from './LandmarkImage';
import { UnescoBadge } from './UnescoBadge';

interface ItineraryViewProps {
  entries: ItineraryEntry[];
  landmarks: Landmark[];
  onSelectLandmark: (landmark: Landmark) => void;
  onRemove: (landmarkId: string) => void;
  onUpdateNote: (landmarkId: string, note: string) => void;
  onMove: (landmarkId: string, direction: 'up' | 'down') => void;
  onClearAll: () => void;
  onExploreLandmarks: () => void;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  entries,
  landmarks,
  onSelectLandmark,
  onRemove,
  onUpdateNote,
  onMove,
  onClearAll,
  onExploreLandmarks,
}) => {
  const landmarkMap = new Map(landmarks.map((l) => [l.id, l]));

  const resolvedEntries = entries
    .map((entry) => ({
      entry,
      landmark: landmarkMap.get(entry.landmarkId),
    }))
    .filter((item): item is { entry: ItineraryEntry; landmark: Landmark } =>
      Boolean(item.landmark)
    );

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#0F3D3E]/12 pb-6 dark:border-[#C89B3C]/18">
        <div>
          <p className="text-xs font-semibold text-[#1B4B72] dark:text-[#96C2E6]">
            مخطط الرحلة المحفوظ محلياً دون اتصال
          </p>
          <h1 className="mt-1 font-heritage text-3xl font-bold text-[#0F3D3E] dark:text-[#F4EFE6] sm:text-4xl">
            مساري والمفضلة
          </h1>
          <p className="mt-2 text-sm text-[#4E5C58] dark:text-[#B4C0BC]">
            رتّب وجهاتك المختارة وأضف ملاحظاتك الشخصية لتبقى متاحة على جهازك حتى عند انقطاع
            الإنترنت أثناء السفر.
          </p>
        </div>

        {resolvedEntries.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-red-700/20 px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-400/25 dark:text-red-300 dark:hover:bg-red-950/30 whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>مسح القائمة</span>
          </button>
        )}
      </div>

      {resolvedEntries.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[#0F3D3E]/12 bg-white/80 px-6 py-14 text-center dark:border-[#C89B3C]/18 dark:bg-[#132529]/85">
          <Bookmark
            className="mx-auto h-10 w-10 text-[#C89B3C]"
            aria-hidden="true"
          />
          <h2 className="mt-4 font-heritage text-2xl font-bold text-[#0F3D3E] dark:text-[#F4EFE6]">
            لم تحفظ أي وجهة في مسارك بعد
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#54635F] dark:text-[#A5B4AF]">
            اضغط على زر «حفظ» في أي معلم ديني أو أثري أو طبيعي لبناء برنامج رحلتك في العراق
            والرجوع إليه دون اتصال.
          </p>
          <button
            type="button"
            onClick={onExploreLandmarks}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0F3D3E] px-6 py-2.5 text-sm font-semibold text-[#F9F6F0] hover:bg-[#144F50] dark:bg-[#C89B3C] dark:text-[#0D1B1E]"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            <span>استكشاف المعالم</span>
          </button>
        </div>
      ) : (
        <ol className="mt-6 space-y-4">
          {resolvedEntries.map(({ entry, landmark }, index) => {
            const cloudCoverUrl = getPrimaryLandmarkImage(landmark);
            return (
            <li
              key={landmark.id}
              className="flex flex-col gap-4 rounded-2xl border border-[#0F3D3E]/12 bg-white/88 p-4 dark:border-[#C89B3C]/18 dark:bg-[#132529]/90 sm:flex-row sm:p-5"
            >
              <button
                type="button"
                onClick={() => onSelectLandmark(landmark)}
                className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-[#EBE6DA] dark:bg-[#0B1518] sm:w-44"
              >
                <LandmarkImage
                  src={cloudCoverUrl}
                  wikimediaQuery={cloudCoverUrl ? undefined : landmark.wikimedia_search_query}
                  fallbackSrc={getFallbackImageForLandmark(landmark)}
                  alt={landmark.name_ar}
                  thumbWidth={480}
                  className="h-full w-full object-cover"
                />
                {landmark.unesco_site && (
                  <div className="absolute top-2 right-2 z-10">
                    <UnescoBadge variant="overlay" />
                  </div>
                )}
              </button>

              <div className="flex flex-1 flex-col justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#54635F] dark:text-[#A5B4AF] tabular-nums">
                      المحطة {index + 1} · {landmark.governorate_ar} ·{' '}
                      {CATEGORY_SHORT_LABELS[landmark.category]}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onMove(landmark.id, 'up')}
                        disabled={index === 0}
                        aria-label={`نقل ${landmark.name_ar} للأعلى`}
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-[#0F3D3E]/12 text-[#3D4B47] hover:bg-[#0F3D3E]/8 disabled:opacity-35 dark:border-[#C89B3C]/20 dark:text-[#C5D0CC]"
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMove(landmark.id, 'down')}
                        disabled={index === resolvedEntries.length - 1}
                        aria-label={`نقل ${landmark.name_ar} للأسفل`}
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-[#0F3D3E]/12 text-[#3D4B47] hover:bg-[#0F3D3E]/8 disabled:opacity-35 dark:border-[#C89B3C]/20 dark:text-[#C5D0CC]"
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(landmark.id)}
                        aria-label={`حذف ${landmark.name_ar} من مساري`}
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-red-700/18 text-red-700 hover:bg-red-50 dark:border-red-400/20 dark:text-red-300 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectLandmark(landmark)}
                    className="mt-1 text-right font-heritage text-2xl font-bold text-[#0F3D3E] hover:underline dark:text-[#E7C87B]"
                  >
                    {landmark.name_ar}
                  </button>

                  <div className="mt-3">
                    <label
                      htmlFor={`note-${landmark.id}`}
                      className="block text-xs font-medium text-[#54635F] dark:text-[#A5B4AF]"
                    >
                      ملاحظات الزيارة (تُحفظ تلقائياً)
                    </label>
                    <input
                      id={`note-${landmark.id}`}
                      type="text"
                      value={entry.note}
                      onChange={(e) => onUpdateNote(landmark.id, e.target.value)}
                      placeholder="مثال: الزيارة صباحاً قبل الظهر ثم التوجه إلى السوق التراثي..."
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#0F3D3E]/14 bg-[#F9F6F0]/70 px-3 py-1.5 text-sm text-[#1A2421] placeholder:text-[#869490] focus:border-[#0F3D3E] focus:outline-none dark:border-[#C89B3C]/20 dark:bg-[#0D1B1E] dark:text-[#F1ECE2] dark:focus:border-[#C89B3C]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectLandmark(landmark)}
                    className="text-xs font-semibold text-[#0F3D3E] hover:underline dark:text-[#E7C87B]"
                  >
                    عرض تفاصيل المعلم وإرشادات الزيارة
                  </button>
                  <span aria-hidden="true" className="text-[#869490]">
                    ·
                  </span>
                  <a
                    href={getLandmarkGoogleMapsUrl(landmark)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4B72] hover:underline dark:text-[#96C2E6]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>فتح في خرائط جوجل</span>
                  </a>
                </div>
              </div>
            </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
