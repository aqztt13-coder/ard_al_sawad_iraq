import React from 'react';
import { Map as MapIcon, Moon, Sun } from 'lucide-react';
import { HERO_IMAGE_URL } from '../data/database';
import { ThemeMode } from '../hooks/useTheme';
import { LandmarkImage } from './LandmarkImage';

interface HeroSectionProps {
  totalGovernorates: number;
  totalLandmarks: number;
  unescoCount: number;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenMap: () => void;
  onExploreGovernorates: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  totalGovernorates,
  totalLandmarks,
  unescoCount,
  theme,
  onToggleTheme,
  onOpenMap,
  onExploreGovernorates,
}) => {
  return (
    <section className="relative overflow-hidden border-b border-[#0F3D3E]/12 bg-[#F4EFE4]/75 islamic-lattice dark:border-[#C89B3C]/16 dark:bg-[#102125]/70">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Editorial Copy Column */}
          <div className="flex flex-col justify-between lg:col-span-6">
            <div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold tracking-wide text-[#1B4B72] dark:text-[#96C2E6]">
                  دليل السياحة والتراث والمراقد · بلاد الرافدين
                </p>

                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label={theme === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#0F3D3E]/15 bg-white/75 px-3 py-1.5 text-xs font-semibold text-[#0F3D3E] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:border-[#C89B3C]/25 dark:bg-[#132529] dark:text-[#E7C87B] dark:hover:bg-[#193035] whitespace-nowrap shrink-0"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="h-4 w-4" aria-hidden="true" />
                      <span>الوضع النهاري</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" aria-hidden="true" />
                      <span>الوضع الليلي</span>
                    </>
                  )}
                </button>
              </div>

              <h1
                className="mt-5 font-heritage text-4xl font-bold leading-[1.2] text-[#0F3D3E] dark:text-[#F4EFE6] sm:text-5xl lg:text-[3.35rem]"
                style={{ textWrap: 'balance' }}
              >
                أرض السواد: حيث تلتقي قدسية المراقد بعراقة سومر وبابل
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#43524E] dark:text-[#B9C5C1]">
                دليلك الرقمي الموثوق لاستكشاف العتبات المقدسة والمواقع الأثرية وأهوار
                الجنوب وشلالات كردستان عبر {totalGovernorates} محافظة عراقية و
                {totalLandmarks} معلماً موثّقاً، مع خرائط تفاعلية وحفظ لمسار رحلتك دون
                اتصال بالإنترنت.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={onOpenMap}
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#0F3D3E] px-6 py-3 text-sm font-semibold text-[#F9F6F0] transition-colors hover:bg-[#144F50] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:bg-[#C89B3C] dark:text-[#0D1B1E] dark:hover:bg-[#D7AC4D] sm:w-auto whitespace-nowrap"
                >
                  <MapIcon className="h-4 w-4" aria-hidden="true" />
                  <span>استكشف خريطة العراق</span>
                </button>

                <button
                  type="button"
                  onClick={onExploreGovernorates}
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-[#0F3D3E]/20 bg-white/75 px-5 py-3 text-sm font-semibold text-[#0F3D3E] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:border-[#C89B3C]/30 dark:bg-[#132529]/80 dark:text-[#E7C87B] dark:hover:bg-[#193035] sm:w-auto whitespace-nowrap tabular-nums"
                >
                  <span>تصفح المحافظات ({totalGovernorates})</span>
                </button>
              </div>
            </div>

            <div aria-hidden="true" className="mesopotamian-frieze mt-8 h-3 w-full opacity-80" />
          </div>

          {/* Focal Visual Frame */}
          <div className="lg:col-span-6">
            <figure className="relative h-full min-h-[260px] overflow-hidden rounded-2xl border border-[#C89B3C]/28 bg-[#0F3D3E]">
              <LandmarkImage
                src={HERO_IMAGE_URL}
                alt="بانوراما لنهر الفرات وبساتين النخيل والقباب الذهبية في أرض السواد عند الغروب"
                priority
                className="h-full w-full object-cover lg:h-full"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1B1E]/80 via-[#0D1B1E]/20 to-transparent"
              />
              <figcaption className="absolute inset-x-0 bottom-0 p-5 text-xs leading-relaxed text-[#F4EFE6]/95">
                بساتين النخيل وضفاف الرافدين والقباب الذهبية — مشهد يجسد تسمية «أرض السواد»
                التاريخية لكثافة خضرتها وخصب ترابها.
              </figcaption>
            </figure>
          </div>
        </div>

        {/* Full-Width 4-Column Dynamic Archival Metric Strip */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[#0F3D3E]/12 pt-6 dark:border-[#C89B3C]/18 md:grid-cols-4">
          <div>
            <p
              data-testid="stat-total-governorates"
              className="font-heritage text-3xl font-bold text-[#0F3D3E] dark:text-[#E7C87B] tabular-nums"
            >
              {totalGovernorates}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#52605C] dark:text-[#A5B4AF]">
              محافظة عراقية مغطاة بالكامل
            </p>
          </div>
          <div>
            <p
              data-testid="stat-total-landmarks"
              className="font-heritage text-3xl font-bold text-[#0F3D3E] dark:text-[#E7C87B] tabular-nums"
            >
              {totalLandmarks}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#52605C] dark:text-[#A5B4AF]">
              معلماً دينياً وأثرياً وطبيعياً موثقاً
            </p>
          </div>
          <div>
            <p
              data-testid="stat-unesco-sites"
              className="font-heritage text-3xl font-bold text-[#0F3D3E] dark:text-[#E7C87B] tabular-nums"
            >
              {unescoCount}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#52605C] dark:text-[#A5B4AF]">
              مواقع مدرجة في التراث العالمي (يونسكو)
            </p>
          </div>
          <div>
            <p className="font-heritage text-3xl font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
              دون اتصال
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#52605C] dark:text-[#A5B4AF]">
              تخزين محلي لمسار رحلتك وبيانات المعالم
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
