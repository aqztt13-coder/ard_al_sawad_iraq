import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Clock, MapPin, X } from 'lucide-react';
import { CulturalArticle, CultureTopicCategory } from '../types/tourism';

interface LiveIraqCultureViewProps {
  articles: CulturalArticle[];
  initialSelectedArticle?: CulturalArticle | null;
  onConsumeInitialArticle?: () => void;
}

const TOPIC_TABS: { id: 'all' | CultureTopicCategory; label: string }[] = [
  { id: 'all', label: 'جميع المواضيع' },
  { id: 'cuisine', label: 'المطبخ العراقي' },
  { id: 'hospitality', label: 'الضيافة والمقاهي' },
  { id: 'architecture', label: 'العمارة التراثية' },
  { id: 'crafts', label: 'الحرف اليدوية' },
  { id: 'music', label: 'المقام والموسيقى' },
  { id: 'marshes', label: 'حياة الأهوار' },
  { id: 'clothing', label: 'الأزياء التقليدية' },
  { id: 'markets', label: 'الأسواق والخانات' },
  { id: 'etiquette', label: 'آداب الزيارة' },
];

export const LiveIraqCultureView: React.FC<LiveIraqCultureViewProps> = ({
  articles,
  initialSelectedArticle,
  onConsumeInitialArticle,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<'all' | CultureTopicCategory>('all');
  const [activeArticle, setActiveArticle] = useState<CulturalArticle | null>(
    initialSelectedArticle ?? null
  );

  React.useEffect(() => {
    if (initialSelectedArticle) {
      setActiveArticle(initialSelectedArticle);
      onConsumeInitialArticle?.();
    }
  }, [initialSelectedArticle, onConsumeInitialArticle]);

  const publishedArticles = useMemo(
    () =>
      articles.filter(
        (a) =>
          a.status !== 'draft' &&
          (selectedTopic === 'all' || a.category === selectedTopic)
      ),
    [articles, selectedTopic]
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-[#173F35]/12 pb-6 dark:border-[#C5A15A]/18">
        <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
          تجربة ثقافية حية من بلاد الرافدين
        </p>
        <h1 className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-4xl">
          عِش العراق — الثقافة، الضيافة، والتراث الحي
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
          استكشف روح المجتمع العراقي عبر مطبخه الأصيل، ومضايف الأهوار، ومقاهي بغداد
          العريقة، والمقام العراقي، والحرف اليدوية، وآداب الضيافة المحلية.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {TOPIC_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTopic(tab.id)}
              aria-pressed={selectedTopic === tab.id}
              className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
                selectedTopic === tab.id
                  ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                  : 'border border-[#173F35]/14 bg-white text-[#4E5C58] hover:border-[#C5A15A] dark:border-[#C5A15A]/18 dark:bg-[#13352F] dark:text-[#C0CCC7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {publishedArticles.map((article) => (
          <article
            key={article.id}
            data-testid={`culture-article-${article.id}`}
            onClick={() => setActiveArticle(article)}
            className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#173F35]/12 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
          >
            <div className="aspect-[16/10] overflow-hidden bg-[#102F29]">
              <img
                src={article.image_url}
                alt={article.title_ar}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="text-[11px] font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                {article.category_ar} · {article.read_time_minutes} دقائق قراءة
              </p>
              <h2 className="font-heritage mt-1.5 text-xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
                {article.title_ar}
              </h2>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
                {article.excerpt_ar}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-[#173F35]/10 pt-3 text-xs font-bold text-[#173F35] dark:border-[#C5A15A]/15 dark:text-[#E7C87B]">
                <span className="truncate font-normal text-[#5E6D68] dark:text-[#A9B8B3]">
                  {article.regions_ar.join(' · ')}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1">
                  <span>اقرأ المقال</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Article Monograph Reader Modal */}
      {activeArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="culture-article-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102F29]/75 p-4 backdrop-blur-sm"
          onClick={() => setActiveArticle(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#C5A15A]/30 bg-[#F8F6F0] shadow-2xl dark:bg-[#102F29]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#173F35]/12 px-5 py-3.5 dark:border-[#C5A15A]/18">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                <BookOpen className="h-4 w-4" />
                <span>عِش العراق · {activeArticle.category_ar}</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                aria-label="إغلاق المقال"
                className="rounded-lg p-1.5 text-[#173F35] hover:bg-[#173F35]/10 dark:text-[#F8F6F0]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="aspect-[16/9] overflow-hidden rounded-xl bg-[#102F29]">
                <img
                  src={activeArticle.image_url}
                  alt={activeArticle.title_ar}
                  className="h-full w-full object-cover"
                />
              </div>

              <h2
                id="culture-article-title"
                className="font-heritage mt-5 text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0]"
              >
                {activeArticle.title_ar}
              </h2>
              <p className="mt-1 text-sm font-medium text-[#8C6D2B] dark:text-[#E7C87B]">
                {activeArticle.subtitle_ar}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#54635F] dark:text-[#A9B8B3]">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#C5A15A]" />
                  <span>{activeArticle.read_time_minutes} دقائق قراءة</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#C5A15A]" />
                  <span>{activeArticle.regions_ar.join(' · ')}</span>
                </span>
              </div>

              <div className="mt-6 space-y-4 text-[15px] leading-[1.95] text-[#252B29] dark:text-[#E9DFC9]">
                {activeArticle.body_paragraphs_ar.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
