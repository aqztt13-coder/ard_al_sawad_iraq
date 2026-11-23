import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Globe,
  Landmark as LandmarkIcon,
  MapPin,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  ArtifactLocationType,
  HistoricalTimelineEntry,
  Landmark,
  MuseumArtifact,
} from '../types/tourism';
import { IRAQ_HISTORICAL_TIMELINE } from '../data/museumData';
import { normalizeArabic } from '../utils/arabicSearch';

interface DigitalMuseumViewProps {
  artifacts: MuseumArtifact[];
  landmarks: Landmark[];
  initialSelectedArtifact?: MuseumArtifact | null;
  onConsumeInitialArtifact?: () => void;
  onSelectLandmark: (landmark: Landmark) => void;
  onViewArtifact?: (artifact: MuseumArtifact) => void;
}

export const DigitalMuseumView: React.FC<DigitalMuseumViewProps> = ({
  artifacts,
  landmarks,
  initialSelectedArtifact,
  onConsumeInitialArtifact,
  onSelectLandmark,
  onViewArtifact,
}) => {
  const [subTab, setSubTab] = useState<'artifacts' | 'timeline'>('artifacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<'all' | ArtifactLocationType>('all');
  const [civilizationFilter, setCivilizationFilter] = useState<string>('all');
  const [selectedArtifact, setSelectedArtifact] = useState<MuseumArtifact | null>(
    initialSelectedArtifact ?? null
  );

  React.useEffect(() => {
    if (initialSelectedArtifact) {
      setSelectedArtifact(initialSelectedArtifact);
      setSubTab('artifacts');
      onConsumeInitialArtifact?.();
    }
  }, [initialSelectedArtifact, onConsumeInitialArtifact]);

  const civilizations = useMemo(
    () => Array.from(new Set(artifacts.map((a) => a.civilization_ar))).filter(Boolean),
    [artifacts]
  );

  const filteredArtifacts = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    return artifacts.filter((a) => {
      if (locationFilter !== 'all' && a.collection_location_type !== locationFilter) {
        return false;
      }
      if (civilizationFilter !== 'all' && a.civilization_ar !== civilizationFilter) {
        return false;
      }
      if (!q) return true;
      const blob = normalizeArabic(
        `${a.name_ar} ${a.name_en} ${a.civilization_ar} ${a.period_ar} ${a.discovery_location_ar} ${a.current_location_ar} ${a.description_ar}`
      );
      return blob.includes(q);
    });
  }, [artifacts, searchQuery, locationFilter, civilizationFilter]);

  const iraqCount = useMemo(
    () => artifacts.filter((a) => a.collection_location_type === 'iraq').length,
    [artifacts]
  );
  const intlCount = useMemo(
    () => artifacts.filter((a) => a.collection_location_type === 'international').length,
    [artifacts]
  );

  const openArtifactDetail = (artifact: MuseumArtifact) => {
    setSelectedArtifact(artifact);
    onViewArtifact?.(artifact);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-[#173F35]/12 pb-5 dark:border-[#C5A15A]/18 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
            الأرشيف المتحفي والتاريخي لبلاد الرافدين
          </p>
          <h1 className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-4xl">
            المتحف العراقي الرقمي والخط الزمني
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
            استعرض روائع الحضارات السومرية والأكدية والبابلية والآشورية والإسلامية مع
            تمييز شفاف بين القطع المحفوظة داخل المتاحف العراقية وتلك المعروضة في المتاحف
            العالمية.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="أقسام المتحف الرقمي"
          className="inline-flex rounded-xl border border-[#173F35]/14 bg-white p-1 dark:border-[#C5A15A]/20 dark:bg-[#13352F]"
        >
          <button
            type="button"
            role="tab"
            data-testid="museum-tab-artifacts"
            aria-selected={subTab === 'artifacts'}
            onClick={() => setSubTab('artifacts')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              subTab === 'artifacts'
                ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                : 'text-[#4E5C58] dark:text-[#B4C0BC]'
            }`}
          >
            المقتنيات الأثرية ({artifacts.length})
          </button>
          <button
            type="button"
            role="tab"
            data-testid="museum-tab-timeline"
            aria-selected={subTab === 'timeline'}
            onClick={() => setSubTab('timeline')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              subTab === 'timeline'
                ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                : 'text-[#4E5C58] dark:text-[#B4C0BC]'
            }`}
          >
            الخط الزمني لتاريخ العراق ({IRAQ_HISTORICAL_TIMELINE.length})
          </button>
        </div>
      </div>

      {subTab === 'artifacts' && (
        <div className="mt-6 space-y-6">
          {/* Search & Transparency Filter Bar */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="relative md:col-span-5">
              <Search className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#64736F]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن قطعة أثرية، حضارة، أو متحف..."
                className="min-h-[44px] w-full rounded-xl border border-[#173F35]/16 bg-white pr-10 pl-4 text-sm text-[#252B29] focus:border-[#173F35] focus:outline-none dark:border-[#C5A15A]/22 dark:bg-[#13352F] dark:text-[#F8F6F0]"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={civilizationFilter}
                onChange={(e) => setCivilizationFilter(e.target.value)}
                aria-label="تصفية حسب الحضارة"
                className="min-h-[44px] w-full rounded-xl border border-[#173F35]/16 bg-white px-3 text-sm text-[#252B29] dark:border-[#C5A15A]/22 dark:bg-[#13352F] dark:text-[#F8F6F0]"
              >
                <option value="all">جميع الحضارات</option>
                {civilizations.map((civ) => (
                  <option key={civ} value={civ}>
                    {civ}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:col-span-4 md:justify-end">
              <button
                type="button"
                data-testid="museum-filter-all"
                onClick={() => setLocationFilter('all')}
                className={`min-h-[42px] rounded-xl px-3.5 text-xs font-bold ${
                  locationFilter === 'all'
                    ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                    : 'border border-[#173F35]/15 bg-white text-[#4E5C58] dark:bg-[#13352F] dark:text-[#C0CCC7]'
                }`}
              >
                الكل ({artifacts.length})
              </button>
              <button
                type="button"
                data-testid="museum-filter-iraq"
                onClick={() => setLocationFilter('iraq')}
                className={`min-h-[42px] rounded-xl px-3.5 text-xs font-bold ${
                  locationFilter === 'iraq'
                    ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                    : 'border border-[#173F35]/15 bg-white text-[#4E5C58] dark:bg-[#13352F] dark:text-[#C0CCC7]'
                }`}
              >
                في العراق ({iraqCount})
              </button>
              <button
                type="button"
                data-testid="museum-filter-intl"
                onClick={() => setLocationFilter('international')}
                className={`min-h-[42px] rounded-xl px-3.5 text-xs font-bold ${
                  locationFilter === 'international'
                    ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                    : 'border border-[#173F35]/15 bg-white text-[#4E5C58] dark:bg-[#13352F] dark:text-[#C0CCC7]'
                }`}
              >
                متاحف عالمية ({intlCount})
              </button>
            </div>
          </div>

          {/* Artifacts Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArtifacts.map((artifact) => (
              <article
                key={artifact.id}
                data-testid={`artifact-card-${artifact.id}`}
                onClick={() => openArtifactDetail(artifact)}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#173F35]/12 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
              >
                <div className="aspect-[16/10] overflow-hidden bg-[#102F29]">
                  <img
                    src={artifact.image_url}
                    alt={artifact.name_ar}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                    <span className="text-[#8C6D2B] dark:text-[#E7C87B]">
                      {artifact.civilization_ar} · {artifact.approximate_date_ar}
                    </span>
                    <span
                      className={
                        artifact.collection_location_type === 'iraq'
                          ? 'text-[#173F35] dark:text-[#98D9C2]'
                          : 'text-[#1B4B72] dark:text-[#96C2E6]'
                      }
                    >
                      {artifact.collection_location_type === 'iraq'
                        ? 'مجموعة عراقية'
                        : 'متحف عالمي'}
                    </span>
                  </div>
                  <h2 className="font-heritage mt-1.5 text-xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
                    {artifact.name_ar}
                  </h2>
                  <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
                    {artifact.description_ar}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-[#173F35]/10 pt-3 text-[11px] font-semibold text-[#54635F] dark:border-[#C5A15A]/15 dark:text-[#B5C4BF]">
                    <span className="truncate">{artifact.current_location_ar}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[#173F35] dark:text-[#E7C87B]">
                      <span>بطاقة القطعة</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Chronological Timeline of Iraq */}
      {subTab === 'timeline' && (
        <div className="mt-8 space-y-5" data-testid="iraq-historical-timeline">
          {IRAQ_HISTORICAL_TIMELINE.map((era: HistoricalTimelineEntry) => {
            const linkedLandmarks = era.related_landmark_ids
              .map((id) => landmarks.find((l) => l.id === id))
              .filter((l): l is Landmark => Boolean(l));
            const linkedArtifacts = era.related_artifact_ids
              .map((id) => artifacts.find((a) => a.id === id))
              .filter((a): a is MuseumArtifact => Boolean(a));

            return (
              <article
                key={era.id}
                className="rounded-2xl border border-[#173F35]/14 bg-white p-6 dark:border-[#C5A15A]/20 dark:bg-[#13352F]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#173F35]/10 pb-3 dark:border-[#C5A15A]/16">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        الحقبة {era.order} · {era.approximate_date_ar}
                      </span>
                    </p>
                    <h2 className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
                      {era.period_ar}
                    </h2>
                  </div>
                  <span dir="ltr" className="text-xs font-semibold text-[#5E6D68] dark:text-[#A9B8B3]">
                    {era.period_en}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-[1.85] text-[#2F3B38] dark:text-[#D5DDD9]">
                  {era.summary_ar}
                </p>

                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {era.key_events_ar.map((ev, idx) => (
                    <li
                      key={idx}
                      className="rounded-xl bg-[#F8F6F0] px-3.5 py-2.5 text-xs font-medium text-[#252B29] dark:bg-[#102F29] dark:text-[#E9DFC9]"
                    >
                      • {ev}
                    </li>
                  ))}
                </ul>

                <p className="mt-4 text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
                  <strong className="text-[#173F35] dark:text-[#E7C87B]">ملاحظة علمية: </strong>
                  {era.scholarly_note_ar}
                </p>

                {(linkedLandmarks.length > 0 || linkedArtifacts.length > 0) && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#173F35]/10 pt-4 dark:border-[#C5A15A]/15">
                    {linkedLandmarks.map((lm) => (
                      <button
                        key={lm.id}
                        type="button"
                        onClick={() => onSelectLandmark(lm)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-3 py-1.5 text-xs font-bold text-[#173F35] hover:border-[#C5A15A] dark:bg-[#102F29] dark:text-[#E7C87B]"
                      >
                        <MapPin className="h-3.5 w-3.5 text-[#C5A15A]" />
                        <span>{lm.name_ar}</span>
                      </button>
                    ))}
                    {linkedArtifacts.map((art) => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => openArtifactDetail(art)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#C5A15A]/45 bg-[#C5A15A]/12 px-3 py-1.5 text-xs font-bold text-[#7B5B17] hover:bg-[#C5A15A]/22 dark:text-[#E7C87B]"
                      >
                        <LandmarkIcon className="h-3.5 w-3.5" />
                        <span>{art.name_ar}</span>
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Artifact Accession Detail Modal */}
      {selectedArtifact && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="artifact-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102F29]/75 p-4 backdrop-blur-sm"
          onClick={() => setSelectedArtifact(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#C5A15A]/30 bg-[#F8F6F0] shadow-2xl dark:bg-[#102F29]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#173F35]/12 px-5 py-3.5 dark:border-[#C5A15A]/18">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                {selectedArtifact.collection_location_type === 'iraq' ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                <span>
                  {selectedArtifact.collection_location_type === 'iraq'
                    ? 'قطعة ضمن المجموعات المحفوظة في العراق'
                    : 'قطعة عراقية محفوظة في متحف عالمي'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedArtifact(null)}
                aria-label="إغلاق بطاقة القطعة"
                className="rounded-lg p-1.5 text-[#173F35] hover:bg-[#173F35]/10 dark:text-[#F8F6F0]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="aspect-[16/9] overflow-hidden rounded-xl bg-[#102F29]">
                <img
                  src={selectedArtifact.image_url}
                  alt={selectedArtifact.name_ar}
                  className="h-full w-full object-cover"
                />
              </div>

              <h2
                id="artifact-modal-title"
                className="font-heritage mt-5 text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0]"
              >
                {selectedArtifact.name_ar}
              </h2>
              <p dir="ltr" className="text-right text-xs font-semibold text-[#5E6D68] dark:text-[#A9B8B3]">
                {selectedArtifact.name_en}
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[#173F35]/12 py-4 text-xs dark:border-[#C5A15A]/18 sm:grid-cols-3">
                <div>
                  <dt className="text-[#5E6D68] dark:text-[#A9B8B3]">الحضارة والفترة</dt>
                  <dd className="mt-1 font-bold text-[#173F35] dark:text-[#F8F6F0]">
                    {selectedArtifact.civilization_ar} — {selectedArtifact.period_ar}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#5E6D68] dark:text-[#A9B8B3]">التأريخ التقريبي</dt>
                  <dd className="mt-1 font-bold text-[#173F35] dark:text-[#F8F6F0]">
                    {selectedArtifact.approximate_date_ar}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#5E6D68] dark:text-[#A9B8B3]">مادة الصنع</dt>
                  <dd className="mt-1 font-bold text-[#173F35] dark:text-[#F8F6F0]">
                    {selectedArtifact.material_ar}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#5E6D68] dark:text-[#A9B8B3]">موقع الاكتشاف</dt>
                  <dd className="mt-1 font-bold text-[#173F35] dark:text-[#F8F6F0]">
                    {selectedArtifact.discovery_location_ar}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[#5E6D68] dark:text-[#A9B8B3]">مكان الحفظ الحالي</dt>
                  <dd className="mt-1 font-bold text-[#173F35] dark:text-[#E7C87B]">
                    {selectedArtifact.current_location_ar}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 space-y-4 text-sm leading-[1.85] text-[#2F3B38] dark:text-[#D5DDD9]">
                <div>
                  <h3 className="font-heritage text-lg font-bold text-[#173F35] dark:text-[#E7C87B]">
                    الوصف الأثري
                  </h3>
                  <p className="mt-1">{selectedArtifact.description_ar}</p>
                </div>
                <div>
                  <h3 className="font-heritage text-lg font-bold text-[#173F35] dark:text-[#E7C87B]">
                    الأهمية التاريخية والحضارية
                  </h3>
                  <p className="mt-1">{selectedArtifact.cultural_significance_ar}</p>
                </div>
                <div className="rounded-xl border border-[#173F35]/12 bg-white p-4 text-xs dark:border-[#C5A15A]/18 dark:bg-[#13352F]">
                  <p className="flex items-center gap-1.5 font-bold text-[#173F35] dark:text-[#E7C87B]">
                    <BookOpen className="h-3.5 w-3.5 text-[#C5A15A]" />
                    <span>المرجع المتحفي والمصادر</span>
                  </p>
                  <p className="mt-1 text-[#54635F] dark:text-[#B5C4BF]">
                    {selectedArtifact.museum_reference_ar}
                  </p>
                  <p className="mt-1 text-[#54635F] dark:text-[#B5C4BF]">
                    {selectedArtifact.source_references_ar.join(' · ')}
                  </p>
                </div>
              </div>

              {selectedArtifact.related_landmark_id && (() => {
                const lm = landmarks.find(
                  (l) => l.id === selectedArtifact.related_landmark_id
                );
                if (!lm) return null;
                return (
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedArtifact(null);
                        onSelectLandmark(lm);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#173F35] px-4 py-2.5 text-xs font-bold text-[#F8F6F0] hover:bg-[#1E5044] dark:bg-[#C5A15A] dark:text-[#102F29]"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>زيارة الموقع المرتبط: {lm.name_ar}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
