import React from 'react';
import { BookOpen, Compass, ShieldCheck, WifiOff } from 'lucide-react';
import { AppView, DatabaseStats } from '../types/tourism';

interface AboutViewProps {
  stats: DatabaseStats;
  artifactsCount: number;
  articlesCount: number;
  onNavigate: (view: AppView) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  stats,
  artifactsCount,
  articlesCount,
  onNavigate,
}) => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      <div className="border-b border-[#173F35]/12 pb-6 dark:border-[#C5A15A]/18">
        <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
          رسالة المنصة ومنهجية التوثيق
        </p>
        <h1 className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-4xl">
          عن منصة «أرض السواد»
        </h1>
        <p className="mt-3 text-base leading-[1.9] text-[#4E5C58] dark:text-[#C0CCC7]">
          «أرض السواد» هو الاسم التاريخي العريق الذي أُطلق على سهل بلاد الرافدين لخصوبة
          أرضه وامتداد بساتين نخيله بين دجلة والفرات. تهدف هذه المنصة الرقمية إلى تقديم
          مرجع عربي موثوق، هادئ، وسريع الاستخدام لاكتشاف التراث الديني والأثري والطبيعي
          والثقافي في جميع محافظات العراق الثماني عشرة.
        </p>
      </div>

      {/* Live Dynamic Metrics */}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#173F35]/12 bg-white p-5 text-center dark:border-[#C5A15A]/18 dark:bg-[#13352F]">
          <dt className="text-xs font-semibold text-[#5E6D68] dark:text-[#A9B8B3]">
            المحافظات العراقية
          </dt>
          <dd className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#E7C87B] tabular-nums">
            {stats.totalGovernorates}
          </dd>
        </div>
        <div className="rounded-2xl border border-[#173F35]/12 bg-white p-5 text-center dark:border-[#C5A15A]/18 dark:bg-[#13352F]">
          <dt className="text-xs font-semibold text-[#5E6D68] dark:text-[#A9B8B3]">
            المعالم الموثّقة
          </dt>
          <dd className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#E7C87B] tabular-nums">
            {stats.totalLandmarks}
          </dd>
        </div>
        <div className="rounded-2xl border border-[#173F35]/12 bg-white p-5 text-center dark:border-[#C5A15A]/18 dark:bg-[#13352F]">
          <dt className="text-xs font-semibold text-[#5E6D68] dark:text-[#A9B8B3]">
            مقتنيات المتحف الرقمي
          </dt>
          <dd className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#E7C87B] tabular-nums">
            {artifactsCount}
          </dd>
        </div>
        <div className="rounded-2xl border border-[#173F35]/12 bg-white p-5 text-center dark:border-[#C5A15A]/18 dark:bg-[#13352F]">
          <dt className="text-xs font-semibold text-[#5E6D68] dark:text-[#A9B8B3]">
            مقالات عِش العراق
          </dt>
          <dd className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#E7C87B] tabular-nums">
            {articlesCount}
          </dd>
        </div>
      </dl>

      {/* Editorial & Engineering Standards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-[#173F35]/12 bg-white p-6 dark:border-[#C5A15A]/18 dark:bg-[#13352F]">
          <h2 className="flex items-center gap-2 font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
            <ShieldCheck className="h-5 w-5 text-[#C5A15A]" />
            <span>معايير الصدق والتوثيق التاريخي</span>
          </h2>
          <p className="mt-2.5 text-xs leading-[1.9] text-[#4E5C58] dark:text-[#C0CCC7]">
            نلتزم بعدم اختلاق رسوم دخول أو ساعات عمل أو أرقام هواتف أو تقييمات وهمية.
            عندما لا تتوفر معلومة ميدانية متحققة تُعرض بوضوح عبارة «غير متوفر حالياً»، كما
            يميز المتحف الرقمي بشفافية بين القطع المحفوظة داخل العراق وتلك المعروضة في
            المتاحف العالمية.
          </p>
        </div>

        <div className="rounded-2xl border border-[#173F35]/12 bg-white p-6 dark:border-[#C5A15A]/18 dark:bg-[#13352F]">
          <h2 className="flex items-center gap-2 font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
            <WifiOff className="h-5 w-5 text-[#C5A15A]" />
            <span>تطبيق ويب تقدمي (PWA) يعمل دون اتصال</span>
          </h2>
          <p className="mt-2.5 text-xs leading-[1.9] text-[#4E5C58] dark:text-[#C0CCC7]">
            صُممت المنصة لتعمل بسلاسة على الهواتف الذكية والأجهزة اللوحية والحواسيب مع
            إمكانية التثبيت المباشر على الشاشة الرئيسية وتصفح المعالم المحفوظة والمتحف
            الرقمي والألعاب الثقافية ومخطط الرحلات حتى عند ضعف الاتصال بالإنترنت.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#173F35] px-5 py-3 text-xs font-bold text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]"
        >
          <Compass className="h-4 w-4" />
          <span>ابدأ استكشاف المعالم</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('museum')}
          className="inline-flex items-center gap-2 rounded-xl border border-[#173F35]/20 px-5 py-3 text-xs font-bold text-[#173F35] dark:border-[#C5A15A]/30 dark:text-[#E7C87B]"
        >
          <BookOpen className="h-4 w-4" />
          <span>زيارة المتحف الرقمي</span>
        </button>
      </div>
    </section>
  );
};
