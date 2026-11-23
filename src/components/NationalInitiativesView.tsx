import React from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import { NationalInitiative } from '../types/tourism';

interface NationalInitiativesViewProps {
  initiatives: NationalInitiative[];
}

export const NationalInitiativesView: React.FC<NationalInitiativesViewProps> = ({
  initiatives,
}) => {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-[#173F35]/12 pb-6 dark:border-[#C5A15A]/18">
        <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
          صون الإرث الحضاري والبيئي
        </p>
        <h1 className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-4xl">
          المبادرات الوطنية للتراث والسياحة المستدامة
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
          نظرة تعريفية على المحاور الوطنية لحماية المواقع الأثرية، وإحياء البيئة المائية
          في الأهوار، وتأهيل المراكز التاريخية في المدن العراقية.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {initiatives.map((init) => (
          <article
            key={init.id}
            className="grid grid-cols-1 gap-6 overflow-hidden rounded-2xl border border-[#173F35]/12 bg-white p-5 sm:p-6 lg:grid-cols-12 dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
          >
            <div className="overflow-hidden rounded-xl bg-[#102F29] lg:col-span-4">
              <img
                src={init.image_url}
                alt={init.title_ar}
                loading="lazy"
                className="h-56 w-full object-cover lg:h-full"
              />
            </div>

            <div className="flex flex-col justify-between lg:col-span-8">
              <div>
                <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  {init.category_ar} · {init.status_ar}
                </p>
                <h2 className="font-heritage mt-1.5 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
                  {init.title_ar}
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-[#4E5C58] dark:text-[#C0CCC7]">
                  {init.summary_ar}
                </p>

                <ul className="mt-4 space-y-2">
                  {init.objectives_ar.map((obj, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs font-medium text-[#252B29] dark:text-[#E9DFC9]"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A15A]" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-4 flex items-center gap-1.5 border-t border-[#173F35]/10 pt-3 text-xs font-semibold text-[#54635F] dark:border-[#C5A15A]/16 dark:text-[#A9B8B3]">
                <MapPin className="h-3.5 w-3.5 text-[#C5A15A]" />
                <span>النطاق الجغرافي: {init.related_governorates_ar.join(' · ')}</span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
