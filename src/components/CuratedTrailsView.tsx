import React, { useMemo } from 'react';
import {
  ArrowUpLeft,
  BookmarkCheck,
  BookmarkPlus,
  Clock,
  MapPin,
  Route,
} from 'lucide-react';
import { CuratedTrail, Governorate, Landmark } from '../types/tourism';
import { CATEGORY_SHORT_LABELS } from '../utils/arabicSearch';
import { calculateTrailDistanceKm } from '../utils/geo';
import { UnescoBadge } from './UnescoBadge';

interface CuratedTrailsViewProps {
  trails: CuratedTrail[];
  landmarks: Landmark[];
  governorates: Governorate[];
  savedIds: Set<string>;
  onSelectLandmark: (landmark: Landmark) => void;
  onSaveTrailToItinerary: (landmarkIds: string[]) => void;
}

const ACCENT_STYLES: Record<
  CuratedTrail['theme_accent'],
  {
    topBar: string;
    nodeBg: string;
    lineBg: string;
    subtitleText: string;
  }
> = {
  gold: {
    topBar: 'bg-[#C89B3C]',
    nodeBg: 'bg-[#C89B3C] text-[#0D1B1E]',
    lineBg: 'bg-[#C89B3C]/35',
    subtitleText: 'text-[#8A6518] dark:text-[#E7C87B]',
  },
  lapis: {
    topBar: 'bg-[#1B4B72]',
    nodeBg: 'bg-[#1B4B72] text-[#F9F6F0]',
    lineBg: 'bg-[#1B4B72]/35 dark:bg-[#96C2E6]/35',
    subtitleText: 'text-[#1B4B72] dark:text-[#96C2E6]',
  },
  emerald: {
    topBar: 'bg-[#0F3D3E]',
    nodeBg: 'bg-[#0F3D3E] text-[#F9F6F0] dark:bg-[#236B6C]',
    lineBg: 'bg-[#0F3D3E]/30 dark:bg-[#499C9E]/35',
    subtitleText: 'text-[#0F3D3E] dark:text-[#8CD2D3]',
  },
};

export const CuratedTrailsView: React.FC<CuratedTrailsViewProps> = ({
  trails,
  landmarks,
  governorates,
  savedIds,
  onSelectLandmark,
  onSaveTrailToItinerary,
}) => {
  const landmarkMap = useMemo(
    () => new Map(landmarks.map((l) => [l.id, l])),
    [landmarks]
  );

  return (
    <section
      aria-labelledby="curated-trails-heading"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="border-b border-[#0F3D3E]/12 pb-6 dark:border-[#C89B3C]/18">
        <p className="text-xs font-semibold text-[#1B4B72] dark:text-[#96C2E6]">
          برامج سياحية وتراثية مُعدّة بعناية
        </p>
        <h1
          id="curated-trails-heading"
          className="mt-1 font-heritage text-3xl font-bold text-[#0F3D3E] dark:text-[#F4EFE6] sm:text-4xl"
        >
          المسارات المقترحة في أرض السواد
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4E5C58] dark:text-[#B4C0BC]">
          ثلاثة مسارات متكاملة تربط أبرز العتبات المقدسة، وحواضر سومر وبابل، ومصايف
          كردستان بالترتيب الجغرافي الأنسب — اضغط على أي محطة لفتح دليلها الكامل أو
          أضف المسار بأكمله إلى مسارك الشخصي.
        </p>
      </div>

      <div
        data-testid="curated-trails-grid"
        className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {trails.map((trail) => {
          const stops = trail.landmark_ids
            .map((id) => landmarkMap.get(id))
            .filter((item): item is Landmark => Boolean(item));

          const approxKm = calculateTrailDistanceKm(stops, governorates);
          const allStopsSaved =
            stops.length > 0 && stops.every((s) => savedIds.has(s.id));
          const accent = ACCENT_STYLES[trail.theme_accent];

          return (
            <article
              key={trail.id}
              data-testid={`trail-card-${trail.id}`}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#0F3D3E]/14 bg-white/88 backdrop-blur-sm dark:border-[#C89B3C]/20 dark:bg-[#132529]/92"
            >
              {/* Heritage Top Rule */}
              <div aria-hidden="true" className={`h-1.5 w-full ${accent.topBar}`} />

              <div className="flex flex-1 flex-col p-6">
                {/* Trail Header */}
                <div>
                  <p className={`text-xs font-bold ${accent.subtitleText}`}>
                    {trail.subtitle_ar}
                  </p>
                  <h2 className="mt-2 font-heritage text-2xl font-bold leading-snug text-[#0F3D3E] dark:text-[#F4EFE6]">
                    {trail.title_ar}
                  </h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#4E5C58] dark:text-[#B4C0BC]">
                    {trail.description_ar}
                  </p>

                  {/* Quiet Archival Metadata Line */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-y border-[#0F3D3E]/10 py-3 text-xs font-medium text-[#54635F] dark:border-[#C89B3C]/16 dark:text-[#A5B4AF]">
                    <span className="inline-flex items-center gap-1.5">
                      <Route className="h-3.5 w-3.5 text-[#C89B3C]" aria-hidden="true" />
                      <span className="tabular-nums">{stops.length} محطات رئيسية</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#C89B3C]" aria-hidden="true" />
                      <span>{trail.duration_ar}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <MapPin className="h-3.5 w-3.5 text-[#C89B3C]" aria-hidden="true" />
                      <span>نحو {approxKm} كم</span>
                    </span>
                  </div>
                </div>

                {/* Vertical Interactive Timeline */}
                <ol
                  aria-label={`محطات ${trail.title_ar}`}
                  className="mt-5 flex-1 space-y-0"
                >
                  {stops.map((stop, idx) => {
                    const isLast = idx === stops.length - 1;
                    return (
                      <li key={stop.id} className="relative flex gap-3.5 pb-5 last:pb-1">
                        {/* Vertical Rail + Numbered Node */}
                        <div className="relative flex flex-col items-center">
                          <span
                            className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums shadow-sm ${accent.nodeBg}`}
                          >
                            {idx + 1}
                          </span>
                          {!isLast && (
                            <span
                              aria-hidden="true"
                              className={`mt-1 w-0.5 flex-1 ${accent.lineBg}`}
                            />
                          )}
                        </div>

                        {/* Stop Card Content */}
                        <div className="min-w-0 flex-1 rounded-xl border border-[#0F3D3E]/10 bg-[#F9F6F0]/70 p-3.5 transition-colors hover:border-[#C89B3C]/45 hover:bg-[#F9F6F0] dark:border-[#C89B3C]/14 dark:bg-[#0D1B1E]/65 dark:hover:border-[#C89B3C]/35 dark:hover:bg-[#0D1B1E]">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#54635F] dark:text-[#A5B4AF]">
                            <span className="text-[#0F3D3E] dark:text-[#E7C87B]">
                              {stop.governorate_ar}
                            </span>
                            <span>{CATEGORY_SHORT_LABELS[stop.category]}</span>
                          </div>

                          <h3 className="mt-1 font-heritage text-lg font-bold leading-snug text-[#15221E] dark:text-[#F4EFE6]">
                            {stop.name_ar}
                          </h3>

                          {stop.unesco_site && (
                            <div className="mt-2">
                              <UnescoBadge variant="overlay" />
                            </div>
                          )}

                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <span className="truncate text-[11px] text-[#64736F] dark:text-[#96A6A1]">
                              {stop.era}
                            </span>
                            <button
                              type="button"
                              onClick={() => onSelectLandmark(stop)}
                              className="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#1B4B72] transition-colors hover:bg-[#1B4B72]/10 hover:text-[#0F3D3E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:text-[#96C2E6] dark:hover:bg-[#96C2E6]/10 dark:hover:text-[#E7C87B] whitespace-nowrap"
                            >
                              <span>عرض التفاصيل</span>
                              <ArrowUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {/* Trail Footer CTA: Save Entire Trail to Offline Itinerary */}
                <div className="mt-5 border-t border-[#0F3D3E]/10 pt-4 dark:border-[#C89B3C]/16">
                  <button
                    type="button"
                    onClick={() => onSaveTrailToItinerary(trail.landmark_ids)}
                    disabled={allStopsSaved}
                    className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] ${
                      allStopsSaved
                        ? 'bg-[#C89B3C]/20 text-[#7B5B17] dark:bg-[#C89B3C]/20 dark:text-[#E7C87B]'
                        : 'bg-[#0F3D3E] text-[#F9F6F0] hover:bg-[#144F50] dark:bg-[#C89B3C] dark:text-[#0D1B1E] dark:hover:bg-[#D7AC4D]'
                    }`}
                  >
                    {allStopsSaved ? (
                      <>
                        <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                        <span>جميع محطات المسار محفوظة في مساري</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                        <span>حفظ المسار كاملاً في مساري</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
