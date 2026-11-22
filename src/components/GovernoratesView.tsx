import React, { useMemo, useState } from 'react';
import { Award, MapPin, ArrowUpLeft, Search, ImagePlus, Compass } from 'lucide-react';
import { Governorate, GovernorateProfile, Landmark } from '../types/tourism';
import { getGovernorateProfile } from '../data/governorateProfiles';
import { getGovernorateCoverImage } from '../utils/supabaseSync';
import {
  CATEGORY_SHORT_LABELS,
  getGovernoratesWithCounts,
  getUniqueRegions,
  normalizeArabic,
} from '../utils/arabicSearch';

interface GovernoratesViewProps {
  governorates: Governorate[];
  governorateProfiles: Record<string, GovernorateProfile>;
  landmarks: Landmark[];
  nationalLandmarksCount: number;
  isAdmin?: boolean;
  onExploreGovernorate: (governorateId: string) => void;
  onFocusGovernorateOnMap: (governorateId: string) => void;
  onAdminManageGovPhotos?: (governorate: Governorate, profile: GovernorateProfile) => void;
}

export const GovernoratesView: React.FC<GovernoratesViewProps> = ({
  governorates,
  governorateProfiles,
  landmarks,
  nationalLandmarksCount,
  isAdmin = false,
  onExploreGovernorate,
  onFocusGovernorateOnMap,
  onAdminManageGovPhotos,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [query, setQuery] = useState('');

  const regions = useMemo(() => getUniqueRegions(governorates), [governorates]);

  const governoratesWithStats = useMemo(
    () => getGovernoratesWithCounts(governorates, landmarks),
    [governorates, landmarks]
  );

  const filteredGovernorates = useMemo(() => {
    const normQuery = normalizeArabic(query);
    return governoratesWithStats.filter((gov) => {
      if (selectedRegion !== 'all' && gov.region !== selectedRegion) return false;
      if (!normQuery) return true;
      const profile = governorateProfiles[gov.id] ?? getGovernorateProfile(gov);
      const nicknames = profile ? profile.nicknames_ar.join(' ') : '';
      const blob = normalizeArabic(
        `${gov.name_ar} ${gov.name_en} ${gov.region} ${nicknames} ${gov.landmarkHighlights.join(' ')}`
      );
      return blob.includes(normQuery);
    });
  }, [governoratesWithStats, governorateProfiles, selectedRegion, query]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-[#0F3D3E]/12 pb-6 dark:border-[#C89B3C]/18 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#1B4B72] dark:text-[#96C2E6]">
            دليل الأقاليم والمدن العراقية
          </p>
          <h1 className="mt-1 font-heritage text-3xl font-bold text-[#0F3D3E] dark:text-[#F4EFE6] sm:text-4xl tabular-nums">
            محافظات العراق ({governorates.length} محافظة)
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4E5C58] dark:text-[#B4C0BC]">
            استعرض الهوية التراثية لكل محافظة من شمال العراق إلى جنوبه مع إحصاءات حيّة
            للمعالم ({landmarks.length} معلماً موثّقاً)، وانتقل مباشرةً إلى معالمها أو
            موقعها على الخريطة.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <label htmlFor="governorate-search" className="sr-only">
            ابحث عن محافظة عراقية
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#64736F]"
            aria-hidden="true"
          />
          <input
            id="governorate-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم المحافظة أو المعلم..."
            className="min-h-[44px] w-full rounded-xl border border-[#0F3D3E]/16 bg-white/90 pr-10 pl-4 text-sm text-[#1A2421] placeholder:text-[#7A8783] focus:border-[#0F3D3E] focus:outline-none dark:border-[#C89B3C]/24 dark:bg-[#132529] dark:text-[#F1ECE2] dark:placeholder:text-[#869691] dark:focus:border-[#C89B3C]"
          />
        </div>
      </div>

      {/* Dynamic Region Segmented Filter Buttons */}
      <div
        role="group"
        aria-label="تصفية المحافظات حسب الإقليم"
        className="mt-5 flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setSelectedRegion('all')}
          aria-pressed={selectedRegion === 'all'}
          className={`min-h-[40px] rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
            selectedRegion === 'all'
              ? 'bg-[#0F3D3E] text-[#F9F6F0] dark:bg-[#C89B3C] dark:text-[#0D1B1E]'
              : 'border border-[#0F3D3E]/15 bg-white/75 text-[#3D4B47] hover:bg-white dark:border-[#C89B3C]/22 dark:bg-[#132529] dark:text-[#C5D0CC]'
          }`}
        >
          جميع الأقاليم ({governorates.length})
        </button>

        {regions.map((region) => {
          const regionCount = governorates.filter((g) => g.region === region).length;
          return (
            <button
              key={region}
              type="button"
              onClick={() => setSelectedRegion(region)}
              aria-pressed={selectedRegion === region}
              className={`min-h-[40px] rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                selectedRegion === region
                  ? 'bg-[#0F3D3E] text-[#F9F6F0] dark:bg-[#C89B3C] dark:text-[#0D1B1E]'
                  : 'border border-[#0F3D3E]/15 bg-white/75 text-[#3D4B47] hover:bg-white dark:border-[#C89B3C]/22 dark:bg-[#132529] dark:text-[#C5D0CC]'
              }`}
            >
              {region} ({regionCount})
            </button>
          );
        })}
      </div>

      {filteredGovernorates.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[#0F3D3E]/12 bg-white/70 p-10 text-center dark:border-[#C89B3C]/18 dark:bg-[#132529]/70">
          <p className="font-heritage text-xl font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
            لم يتم العثور على محافظة مطابقة
          </p>
          <p className="mt-2 text-sm text-[#54635F] dark:text-[#A5B4AF]">
            جرّب البحث باسم مختلف أو إعادة تعيين تصفية الأقاليم.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedRegion('all');
            }}
            className="mt-4 min-h-[42px] rounded-xl bg-[#0F3D3E] px-5 py-2 text-xs font-semibold text-[#F9F6F0] dark:bg-[#C89B3C] dark:text-[#0D1B1E] tabular-nums"
          >
            عرض جميع المحافظات ({governorates.length})
          </button>
        </div>
      ) : (
        <div
          data-testid="governorates-grid"
          className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredGovernorates.map((gov) => {
            const profile = governorateProfiles[gov.id] ?? getGovernorateProfile(gov);
            const coverUrl = getGovernorateCoverImage(profile);
            return (
              <article
                key={gov.id}
                data-testid={`governorate-card-${gov.id}`}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#0F3D3E]/12 bg-white/85 transition-transform duration-200 hover:-translate-y-0.5 dark:border-[#C89B3C]/18 dark:bg-[#132529]/90"
              >
                {coverUrl && (
                  <div className="h-32 w-full overflow-hidden bg-[#18292D]">
                    <img
                      key={coverUrl}
                      src={coverUrl}
                      alt={`صورة محافظة ${gov.name_ar}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#54635F] dark:text-[#A5B4AF]">
                      <span>{gov.region}</span>
                      <span className="font-semibold text-[#0F3D3E] dark:text-[#E7C87B] tabular-nums">
                        {gov.landmarkCount} {gov.landmarkCount === 1 ? 'معلم' : 'معالم'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <h2 className="font-heritage text-2xl font-bold text-[#15221E] dark:text-[#F4EFE6]">
                        {gov.name_ar}
                      </h2>
                      <span
                        className="text-xs font-medium text-[#6B7A76] dark:text-[#8E9D98]"
                        dir="ltr"
                      >
                        {gov.name_en}
                      </span>
                    </div>

                    {profile && profile.nicknames_ar.length > 0 && (
                      <p className="mt-1.5 text-xs font-semibold text-[#8A6518] dark:text-[#E7C87B]">
                        {profile.nicknames_ar.join(' · ')}
                      </p>
                    )}

                    {gov.categories.length > 0 && (
                      <p className="mt-2 text-xs font-medium text-[#4E5C58] dark:text-[#B4C0BC]">
                        التصنيفات المتوفرة:{' '}
                        {gov.categories
                          .map((cat) => CATEGORY_SHORT_LABELS[cat])
                          .join(' · ')}
                      </p>
                    )}

                    {gov.landmarkHighlights.length > 0 && (
                      <p className="mt-3 text-sm leading-relaxed text-[#1B4B72] dark:text-[#96C2E6]">
                        أبرز المعالم: {gov.landmarkHighlights.join('، ')}
                      </p>
                    )}

                    {gov.unescoCount > 0 && (
                      <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A6518] dark:text-[#E7C87B]">
                        <Award
                          className="h-3.5 w-3.5 shrink-0 text-[#C89B3C]"
                          aria-hidden="true"
                        />
                        <span>
                          {gov.unescoCount === 1
                            ? 'تضم موقعاً مدرجاً في التراث العالمي (يونسكو)'
                            : `تضم ${gov.unescoCount} مواقع مدرجة في التراث العالمي (يونسكو)`}
                        </span>
                      </p>
                    )}
                  </div>

                  <div>
                    {isAdmin && profile && onAdminManageGovPhotos && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => onAdminManageGovPhotos(gov, profile)}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#C89B3C]/45 bg-[#C89B3C]/12 px-3 py-1 text-xs font-bold text-[#7B5B17] hover:bg-[#C89B3C]/22 dark:text-[#E7C87B]"
                        >
                          <ImagePlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>إدارة الصور</span>
                        </button>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#0F3D3E]/10 pt-3.5 dark:border-[#C89B3C]/14">
                      <button
                        type="button"
                        onClick={() => onExploreGovernorate(gov.id)}
                        className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-[#0F3D3E] transition-colors hover:text-[#1B4B72] dark:text-[#E7C87B] dark:hover:text-[#F4EFE6] whitespace-nowrap tabular-nums"
                      >
                        <span>استعراض المعالم ({gov.landmarkCount})</span>
                        <ArrowUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onFocusGovernorateOnMap(gov.id)}
                        aria-label={`عرض محافظة ${gov.name_ar} على الخريطة`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1B4B72] transition-colors hover:bg-[#1B4B72]/10 dark:text-[#96C2E6] dark:hover:bg-[#96C2E6]/10 whitespace-nowrap"
                      >
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>على الخريطة</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Optional National Cross-Governorate Landmarks Callout */}
      {nationalLandmarksCount > 0 && selectedRegion === 'all' && !query.trim() && (
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#C89B3C]/30 bg-white/85 p-5 dark:border-[#C89B3C]/24 dark:bg-[#132529]/90 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Compass className="mt-0.5 h-5 w-5 shrink-0 text-[#C89B3C]" aria-hidden="true" />
            <div>
              <h2 className="font-heritage text-xl font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
                معالم وطنية عابرة للمحافظات ({nationalLandmarksCount})
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#4E5C58] dark:text-[#B4C0BC]">
                تضم قاعدة البيانات أيضاً معالم وطنية تمتد عبر عدة محافظات عراقية مثل نهري
                دجلة والفرات والأهوار العراقية ودرب زبيدة التاريخي.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onExploreGovernorate('IQ-NATIONAL')}
            className="inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-[#0F3D3E] px-4 py-2 text-xs font-semibold text-[#F9F6F0] hover:bg-[#144F50] dark:bg-[#C89B3C] dark:text-[#0D1B1E] whitespace-nowrap"
          >
            <span>استعراض المعالم الوطنية</span>
            <ArrowUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
};
