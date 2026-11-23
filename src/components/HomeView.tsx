import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Compass,
  Landmark as LandmarkIcon,
  Map as MapIcon,
  MapPin,
  Route,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  AppView,
  CulturalArticle,
  DatabaseStats,
  Governorate,
  Landmark,
  MuseumArtifact,
  NationalInitiative,
  SiteSettingsConfig,
} from '../types/tourism';
import { PLATFORM_IMAGES } from '../data/database';
import { buildDynamicCuratedTrails } from '../data/trails';
import { SEASONAL_RECOMMENDATIONS } from '../data/cultureData';
import { filterLandmarks, getGovernoratesWithCounts } from '../utils/arabicSearch';
import { LandmarkCard } from './LandmarkCard';

interface HomeViewProps {
  landmarks: Landmark[];
  governorates: Governorate[];
  stats: DatabaseStats;
  settings: SiteSettingsConfig;
  artifacts: MuseumArtifact[];
  articles: CulturalArticle[];
  initiatives: NationalInitiative[];
  isSaved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
  onSelectLandmark: (landmark: Landmark) => void;
  onSelectGovernorate: (govId: string) => void;
  onNavigate: (view: AppView) => void;
  onOpenArtifact: (artifact: MuseumArtifact) => void;
  onOpenArticle: (article: CulturalArticle) => void;
  onQuickSearch: (query: string) => void;
  onSubscribeNewsletter: (email: string) => { ok: boolean; messageAr: string };
}

export const HomeView: React.FC<HomeViewProps> = ({
  landmarks,
  governorates,
  stats,
  settings,
  artifacts,
  articles,
  initiatives,
  isSaved,
  onToggleSave,
  onSelectLandmark,
  onSelectGovernorate,
  onNavigate,
  onOpenArtifact,
  onOpenArticle,
  onQuickSearch,
  onSubscribeNewsletter,
}) => {
  const [heroQuery, setHeroQuery] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterFeedback, setNewsletterFeedback] = useState<{
    ok: boolean;
    messageAr: string;
  } | null>(null);

  const sections = settings.homepageSections;

  const curatedTrails = useMemo(
    () => buildDynamicCuratedTrails(landmarks),
    [landmarks]
  );

  const instantMatches = useMemo(() => {
    const trimmed = heroQuery.trim();
    if (!trimmed) return [];
    return filterLandmarks(landmarks, governorates, {
      query: trimmed,
      category: 'all',
      governorateId: 'all',
      unescoOnly: false,
    }).slice(0, 6);
  }, [heroQuery, landmarks, governorates]);

  const governoratesWithCounts = useMemo(
    () => getGovernoratesWithCounts(governorates, landmarks),
    [governorates, landmarks]
  );

  const featuredLandmarks = useMemo(() => {
    const unesco = landmarks.filter((l) => l.unesco_site);
    if (unesco.length >= 4) {
      return unesco.slice(0, 4);
    }

    const picked: Landmark[] = [...unesco];
    const usedIds = new Set(picked.map((l) => l.id));
    const usedGovs = new Set(picked.map((l) => l.governorate_id));

    // Curated flagship fallback across diverse Iraqi regions and heritage categories
    const preferredPatterns: Array<{
      category?: Landmark['category'];
      keywords: RegExp;
    }> = [
      { category: 'archaeological', keywords: /بابل|زقورة أور|سامراء|الملوية/ },
      { category: 'religious', keywords: /الإمام علي|الحسين|العباس|الكاظم/ },
      { category: 'nature_tourism', keywords: /أهوار|الجبايش|كلي علي بك|بيخال|دوكان/ },
      { category: 'archaeological', keywords: /قلعة أربيل|الحضر|المستنصرية|طاق كسرى/ },
    ];

    for (const pref of preferredPatterns) {
      if (picked.length >= 4) break;
      const match = landmarks.find(
        (l) =>
          !usedIds.has(l.id) &&
          !usedGovs.has(l.governorate_id) &&
          (!pref.category || l.category === pref.category) &&
          pref.keywords.test(l.name_ar)
      );
      if (match) {
        picked.push(match);
        usedIds.add(match.id);
        usedGovs.add(match.governorate_id);
      }
    }

    // Fill any remaining slots from distinct categories/governorates
    for (const l of landmarks) {
      if (picked.length >= 4) break;
      if (!usedIds.has(l.id) && !usedGovs.has(l.governorate_id)) {
        picked.push(l);
        usedIds.add(l.id);
        usedGovs.add(l.governorate_id);
      }
    }

    for (const l of landmarks) {
      if (picked.length >= 4) break;
      if (!usedIds.has(l.id)) {
        picked.push(l);
        usedIds.add(l.id);
      }
    }

    return picked.slice(0, 4);
  }, [landmarks]);

  const archaeologicalHighlights = useMemo(() => {
    const featuredIds = new Set(featuredLandmarks.map((l) => l.id));
    const distinct = landmarks.filter(
      (l) => l.category === 'archaeological' && !featuredIds.has(l.id)
    );
    return (distinct.length >= 4 ? distinct : landmarks.filter((l) => l.category === 'archaeological')).slice(0, 4);
  }, [landmarks, featuredLandmarks]);

  const religiousHighlights = useMemo(
    () => landmarks.filter((l) => l.category === 'religious').slice(0, 4),
    [landmarks]
  );

  const natureHighlights = useMemo(
    () => landmarks.filter((l) => l.category === 'nature_tourism').slice(0, 4),
    [landmarks]
  );

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroQuery.trim();
    if (q) {
      onQuickSearch(q);
    } else {
      onNavigate('explore');
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onSubscribeNewsletter(newsletterEmail);
    setNewsletterFeedback(result);
    if (result.ok) {
      setNewsletterEmail('');
    }
  };

  return (
    <div className="space-y-16 pb-10">
      {/* 1. Full-Width Mesopotamian Editorial Hero */}
      <section className="relative overflow-hidden bg-[#102F29] text-[#F8F6F0]">
        <div className="absolute inset-0">
          <img
            src={PLATFORM_IMAGES.hero}
            alt="منظر بانورامي لتراث وحضارة العراق"
            className="h-full w-full object-cover object-center opacity-45"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-[#102F29]/82 via-[#173F35]/72 to-[#102F29]/95"
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-bold tracking-wider text-[#E7C87B]">
              جمهورية العراق · {stats.totalGovernorates} محافظة · {stats.totalLandmarks} معلماً موثّقاً
            </p>
            <h1 className="font-heritage mt-3 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {settings.heroHeadlineAr}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#E9DFC9] sm:text-lg">
              {settings.heroSubtitleAr}
            </p>

            {/* Primary CTAs */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#C5A15A] px-6 py-3 text-sm font-bold text-[#102F29] transition-colors hover:bg-[#D4B36E]"
              >
                <Route className="h-4 w-4" aria-hidden="true" />
                <span>ابدأ رحلتك</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('map')}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-[#E9DFC9]/35 bg-[#102F29]/55 px-6 py-3 text-sm font-bold text-[#F8F6F0] backdrop-blur-sm transition-colors hover:bg-[#173F35]"
              >
                <MapIcon className="h-4 w-4 text-[#E7C87B]" aria-hidden="true" />
                <span>استكشف الخريطة</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('museum')}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-[#C5A15A]/30 px-5 py-3 text-sm font-semibold text-[#E9DFC9] transition-colors hover:border-[#C5A15A] hover:text-white"
              >
                <LandmarkIcon className="h-4 w-4 text-[#E7C87B]" aria-hidden="true" />
                <span>المتحف الرقمي</span>
              </button>
            </div>

            {/* Intelligent Arabic Search Bar with Live Dropdown */}
            <form onSubmit={handleHeroSearchSubmit} className="relative mt-8 max-w-2xl">
              <label htmlFor="hero-smart-search" className="sr-only">
                ابحث في معالم ومحافظات العراق
              </label>
              <div className="flex items-center overflow-hidden rounded-2xl border border-[#C5A15A]/40 bg-[#FFFFFF] shadow-xl">
                <Search
                  className="mr-4 h-5 w-5 shrink-0 text-[#173F35]"
                  aria-hidden="true"
                />
                <input
                  id="hero-smart-search"
                  data-testid="hero-search-input"
                  type="search"
                  value={heroQuery}
                  onChange={(e) => setHeroQuery(e.target.value)}
                  placeholder="ابحث عن معلم أثري، مرقد مقدس، أهوار، أو محافظة (مثال: بابل، أور، النجف، أربيل)..."
                  className="min-h-[52px] w-full bg-transparent px-3 text-sm font-medium text-[#252B29] placeholder:text-[#6B7A75] focus:outline-none"
                />
                <button
                  type="submit"
                  className="m-1.5 min-h-[42px] shrink-0 rounded-xl bg-[#173F35] px-5 text-xs font-bold text-[#F8F6F0] transition-colors hover:bg-[#1F5447]"
                >
                  بحث
                </button>
              </div>

              {instantMatches.length > 0 && (
                <div
                  role="listbox"
                  aria-label="نتائج البحث الفورية"
                  className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-[#173F35]/15 bg-[#FFFFFF] text-[#252B29] shadow-2xl"
                >
                  {instantMatches.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setHeroQuery('');
                        onSelectLandmark(item);
                      }}
                      className="flex w-full items-center justify-between gap-3 border-b border-[#173F35]/8 px-4 py-3 text-right transition-colors last:border-b-0 hover:bg-[#F8F6F0]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#173F35]">
                          {item.name_ar}
                        </p>
                        <p className="truncate text-xs text-[#5E6D68]">
                          {item.governorate_ar} · {item.category_ar} · {item.era}
                        </p>
                      </div>
                      <ArrowLeft className="h-4 w-4 shrink-0 text-[#C5A15A]" />
                    </button>
                  ))}
                  <button
                    type="submit"
                    className="w-full bg-[#F8F6F0] px-4 py-2.5 text-center text-xs font-bold text-[#173F35] hover:bg-[#E9DFC9]/60"
                  >
                    عرض جميع النتائج في دليل الوجهات
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 sm:px-6 lg:px-8">
        {/* 2. Featured Destinations */}
        {sections.featuredDestinations && (
          <section aria-labelledby="home-featured-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  مختارات أرض السواد
                </p>
                <h2
                  id="home-featured-heading"
                  className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl"
                >
                  وجهات مميزة في العراق
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('explore')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173F35] hover:text-[#8C6D2B] dark:text-[#E7C87B]"
              >
                <span>تصفح جميع المعالم ({stats.totalLandmarks})</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredLandmarks.map((landmark) => (
                <LandmarkCard
                  key={landmark.id}
                  landmark={landmark}
                  isSaved={isSaved(landmark.id)}
                  onSelect={onSelectLandmark}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. Governorates Grid */}
        {sections.governoratesGrid && (
          <section aria-labelledby="home-govs-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  من زاخو إلى الفاو
                </p>
                <h2
                  id="home-govs-heading"
                  className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl"
                >
                  المحافظات العراقية ({stats.totalGovernorates})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('governorates')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173F35] hover:text-[#8C6D2B] dark:text-[#E7C87B]"
              >
                <span>عرض دليل المحافظات الكامل</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {governoratesWithCounts.map((gov) => (
                <button
                  key={gov.id}
                  type="button"
                  onClick={() => onSelectGovernorate(gov.id)}
                  className="group flex flex-col items-start rounded-2xl border border-[#173F35]/12 bg-[#FFFFFF] p-4 text-right transition-all hover:-translate-y-0.5 hover:border-[#C5A15A]/60 hover:shadow-md dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
                >
                  <span className="font-heritage text-lg font-bold text-[#173F35] group-hover:text-[#8C6D2B] dark:text-[#F8F6F0] dark:group-hover:text-[#E7C87B]">
                    {gov.name_ar}
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-[#5E6D68] dark:text-[#A8B8B3] tabular-nums">
                    {gov.region} · {gov.landmarkCount} معلم
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 4. Archaeological Highlights */}
        {sections.archaeologicalHighlights && (
          <section aria-labelledby="home-arch-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  سومر · بابل · آشور · الحضارة الإسلامية
                </p>
                <h2
                  id="home-arch-heading"
                  className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl"
                >
                  أبرز المواقع الأثرية
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('archaeological')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173F35] hover:text-[#8C6D2B] dark:text-[#E7C87B]"
              >
                <span>كل المواقع الأثرية</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {archaeologicalHighlights.map((landmark) => (
                <LandmarkCard
                  key={landmark.id}
                  landmark={landmark}
                  isSaved={isSaved(landmark.id)}
                  onSelect={onSelectLandmark}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          </section>
        )}

        {/* 5. Religious Landmarks */}
        {sections.religiousLandmarks && (
          <section aria-labelledby="home-rel-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  السياحة الدينية والروحانية
                </p>
                <h2
                  id="home-rel-heading"
                  className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl"
                >
                  العتبات والمراقد والمواقع الدينية
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('religious')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173F35] hover:text-[#8C6D2B] dark:text-[#E7C87B]"
              >
                <span>كل المواقع الدينية</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {religiousHighlights.map((landmark) => (
                <LandmarkCard
                  key={landmark.id}
                  landmark={landmark}
                  isSaved={isSaved(landmark.id)}
                  onSelect={onSelectLandmark}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          </section>
        )}

        {/* 6. Marshlands & Nature */}
        {sections.marshlandsNature && (
          <section aria-labelledby="home-nature-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  من أهوار الجنوب إلى جبال كردستان
                </p>
                <h2
                  id="home-nature-heading"
                  className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl"
                >
                  الطبيعة والأهوار والمصايف
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('nature')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173F35] hover:text-[#8C6D2B] dark:text-[#E7C87B]"
              >
                <span>استكشف الطبيعة العراقية</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {natureHighlights.map((landmark) => (
                <LandmarkCard
                  key={landmark.id}
                  landmark={landmark}
                  isSaved={isSaved(landmark.id)}
                  onSelect={onSelectLandmark}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          </section>
        )}

        {/* 7. Recommended Itineraries */}
        {sections.recommendedItineraries && (
          <section
            aria-labelledby="home-trails-heading"
            className="rounded-3xl border border-[#173F35]/12 bg-[#FFFFFF] p-6 sm:p-8 dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
          >
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  برامج سفر جاهزة ومخطط ذكي
                </p>
                <h2
                  id="home-trails-heading"
                  className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl"
                >
                  المسارات السياحية المقترحة
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#173F35] px-4 py-2.5 text-xs font-bold text-[#F8F6F0] hover:bg-[#1E5044] dark:bg-[#C5A15A] dark:text-[#102F29]"
              >
                <span>صمّم برنامج رحلتك الآن</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {curatedTrails.map((trail) => (
                <article
                  key={trail.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#173F35]/10 bg-[#F8F6F0] p-5 dark:border-[#C5A15A]/16 dark:bg-[#102F29]/80"
                >
                  <div>
                    <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                      {trail.duration_ar} · {trail.landmark_ids.length} محطات
                    </p>
                    <h3 className="font-heritage mt-1.5 text-xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
                      {trail.title_ar}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#4C5B57] dark:text-[#B5C4BF]">
                      {trail.description_ar}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('planner')}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#173F35] hover:text-[#8C6D2B] dark:text-[#E7C87B]"
                  >
                    <span>استعراض المسار الكامل</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 8. Digital Museum Highlights */}
        {sections.museumHighlights && (
          <section aria-labelledby="home-museum-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  ذاكرة الرافدين الموثّقة
                </p>
                <h2
                  id="home-museum-heading"
                  className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl"
                >
                  مقتنيات المتحف العراقي الرقمي
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('museum')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173F35] hover:text-[#8C6D2B] dark:text-[#E7C87B]"
              >
                <span>دخول المتحف والخط الزمني</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {artifacts.slice(0, 4).map((artifact) => (
                <article
                  key={artifact.id}
                  onClick={() => onOpenArtifact(artifact)}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-[#173F35]/12 bg-[#FFFFFF] transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#102F29]">
                    <img
                      src={artifact.image_url}
                      alt={artifact.name_ar}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                      {artifact.civilization_ar} ·{' '}
                      {artifact.collection_location_type === 'iraq'
                        ? 'محفوظ في العراق'
                        : 'متاحف عالمية'}
                    </p>
                    <h3 className="font-heritage mt-1 text-lg font-bold text-[#173F35] dark:text-[#F8F6F0]">
                      {artifact.name_ar}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
                      {artifact.description_ar}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 9. Cultural Experiences («عِش العراق») & Games Banner */}
        {sections.culturalExperiences && (
          <section aria-labelledby="home-culture-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  عِش العراق
                </p>
                <h2
                  id="home-culture-heading"
                  className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl"
                >
                  تجارب الثقافة والضيافة العراقية
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate('games')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C6D2B] hover:underline dark:text-[#E7C87B]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>جرّب الألعاب الثقافية</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('culture')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173F35] hover:text-[#8C6D2B] dark:text-[#E7C87B]"
                >
                  <span>كل مقالات عِش العراق</span>
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {articles.slice(0, 3).map((article) => (
                <article
                  key={article.id}
                  onClick={() => onOpenArticle(article)}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-[#173F35]/12 bg-[#FFFFFF] transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-[#102F29]">
                    <img
                      src={article.image_url}
                      alt={article.title_ar}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-[11px] font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                      {article.category_ar} · قراءة {article.read_time_minutes} دقائق
                    </p>
                    <h3 className="font-heritage mt-1.5 text-xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
                      {article.title_ar}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
                      {article.excerpt_ar}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 10. Seasonal Tourism Recommendations */}
        {sections.seasonalRecommendations && (
          <section aria-labelledby="home-seasonal-heading">
            <div className="mb-6">
              <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                تخطيط ذكي حسب الفصول
              </p>
              <h2
                id="home-seasonal-heading"
                className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl"
              >
                متى تزور العراق؟ توصيات موسمية
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {SEASONAL_RECOMMENDATIONS.map((season) => (
                <button
                  key={season.season_ar}
                  type="button"
                  onClick={() => onNavigate(season.target_view)}
                  className="rounded-2xl border border-[#173F35]/12 bg-[#FFFFFF] p-5 text-right transition-colors hover:border-[#C5A15A]/60 dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
                >
                  <div className="flex items-center gap-2 text-[#8C6D2B] dark:text-[#E7C87B]">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-bold">{season.season_ar}</span>
                  </div>
                  <h3 className="font-heritage mt-2 text-xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
                    {season.headline_ar}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#4C5B57] dark:text-[#B5C4BF]">
                    {season.summary_ar}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 11. Latest Cultural Stories */}
        {sections.latestStories && articles.length > 3 && (
          <section aria-labelledby="home-stories-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  مقالات وقصص تراثية
                </p>
                <h2
                  id="home-stories-heading"
                  className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl"
                >
                  أحدث القصص الثقافية من أرض الرافدين
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('culture')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173F35] hover:text-[#8C6D2B] dark:text-[#E7C87B]"
              >
                <span>تصفح الأرشيف الكامل</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {articles.slice(3, 6).map((story) => (
                <article
                  key={story.id}
                  onClick={() => onOpenArticle(story)}
                  className="flex cursor-pointer flex-col justify-between rounded-2xl border border-[#173F35]/12 bg-[#FFFFFF] p-5 transition-colors hover:border-[#C5A15A]/60 dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
                >
                  <div>
                    <p className="text-[11px] font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                      {story.category_ar} · {story.regions_ar.join('، ')}
                    </p>
                    <h3 className="font-heritage mt-1.5 text-lg font-bold text-[#173F35] dark:text-[#F8F6F0]">
                      {story.title_ar}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
                      {story.excerpt_ar}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#173F35] dark:text-[#E7C87B]">
                    <span>اقرأ المقال</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 12. National Initiatives */}
        {sections.nationalInitiatives && (
          <section aria-labelledby="home-initiatives-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  حماية التراث والسياحة المسؤولة
                </p>
                <h2
                  id="home-initiatives-heading"
                  className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl"
                >
                  المبادرات الوطنية للتراث والبيئة
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('initiatives')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#173F35] hover:text-[#8C6D2B] dark:text-[#E7C87B]"
              >
                <span>عرض جميع المبادرات</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {initiatives.slice(0, 2).map((init) => (
                <div
                  key={init.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#173F35]/12 bg-[#FFFFFF] p-5 sm:flex-row dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
                >
                  <img
                    src={init.image_url}
                    alt={init.title_ar}
                    loading="lazy"
                    className="h-32 w-full shrink-0 rounded-xl object-cover sm:w-36"
                  />
                  <div>
                    <p className="text-[11px] font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                      {init.category_ar} · {init.status_ar}
                    </p>
                    <h3 className="font-heritage mt-1 text-lg font-bold text-[#173F35] dark:text-[#F8F6F0]">
                      {init.title_ar}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
                      {init.summary_ar}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 13. Newsletter & Platform Updates */}
        {sections.newsletterSignup && (
          <section
            aria-labelledby="home-newsletter-heading"
            className="rounded-3xl bg-[#173F35] p-6 text-[#F8F6F0] sm:p-10 dark:border dark:border-[#C5A15A]/25 dark:bg-[#13352F]"
          >
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-[#E7C87B]">تحديثات أرض السواد</p>
                <h2
                  id="home-newsletter-heading"
                  className="font-heritage mt-1 text-2xl font-bold text-white sm:text-3xl"
                >
                  اشترك لتصلك المسارات الجديدة والملفات الثقافية
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#E9DFC9]">
                  نرسل تحديثات دورية عند إضافة معالم موثّقة جديدة، أو مقالات في «عِش العراق»،
                  أو مسارات سياحية موسمية.
                </p>
              </div>
              <form onSubmit={handleNewsletterSubmit} className="space-y-2.5">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label htmlFor="newsletter-email" className="sr-only">
                    البريد الإلكتروني
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني..."
                    className="min-h-[46px] flex-1 rounded-xl border border-[#C5A15A]/35 bg-[#102F29] px-4 text-sm text-white placeholder:text-[#A7B9B3] focus:border-[#C5A15A] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="min-h-[46px] shrink-0 rounded-xl bg-[#C5A15A] px-6 text-sm font-bold text-[#102F29] transition-colors hover:bg-[#D5B26B]"
                  >
                    اشترك الآن
                  </button>
                </div>
                {newsletterFeedback && (
                  <p
                    role="status"
                    className={`text-xs font-semibold ${
                      newsletterFeedback.ok ? 'text-[#E7C87B]' : 'text-red-300'
                    }`}
                  >
                    {newsletterFeedback.messageAr}
                  </p>
                )}
              </form>
            </div>
          </section>
        )}

        {/* Quick Value Navigation Row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => onNavigate('guide')}
            className="flex items-center gap-3 rounded-2xl border border-[#173F35]/12 bg-[#FFFFFF] p-4 text-right transition-colors hover:border-[#C5A15A]/60 dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
          >
            <Compass className="h-6 w-6 shrink-0 text-[#C5A15A]" />
            <div>
              <p className="text-sm font-bold text-[#173F35] dark:text-[#F8F6F0]">
                دليل الزائر والخدمات السياحية
              </p>
              <p className="text-xs text-[#5E6D68] dark:text-[#A8B8B3]">
                الإقامة، المطاعم التراثية، وإرشادات السفر
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('games')}
            className="flex items-center gap-3 rounded-2xl border border-[#173F35]/12 bg-[#FFFFFF] p-4 text-right transition-colors hover:border-[#C5A15A]/60 dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
          >
            <Sparkles className="h-6 w-6 shrink-0 text-[#C5A15A]" />
            <div>
              <p className="text-sm font-bold text-[#173F35] dark:text-[#F8F6F0]">
                الألعاب الثقافية والتراثية
              </p>
              <p className="text-xs text-[#5E6D68] dark:text-[#A8B8B3]">
                اكتب اسمك بالمسمارية، لعبة أور الملكية، والمسابقة
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="flex items-center gap-3 rounded-2xl border border-[#173F35]/12 bg-[#FFFFFF] p-4 text-right transition-colors hover:border-[#C5A15A]/60 dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
          >
            <MapPin className="h-6 w-6 shrink-0 text-[#C5A15A]" />
            <div>
              <p className="text-sm font-bold text-[#173F35] dark:text-[#F8F6F0]">
                منشئ المسارات على الخريطة
              </p>
              <p className="text-xs text-[#5E6D68] dark:text-[#A8B8B3]">
                تجميع العلامات، القرب الجغرافي، ورسم مسارك
              </p>
            </div>
          </button>
        </section>
      </div>
    </div>
  );
};
