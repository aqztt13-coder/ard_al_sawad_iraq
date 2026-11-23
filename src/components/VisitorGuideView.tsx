import React, { useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  Compass,
  ExternalLink,
  Info,
  MapPin,
  Phone,
  ShieldCheck,
  Utensils,
} from 'lucide-react';
import {
  Governorate,
  TourismServiceListing,
  TourismServiceType,
} from '../types/tourism';
import { SEASONAL_RECOMMENDATIONS } from '../data/cultureData';

interface VisitorGuideViewProps {
  services: TourismServiceListing[];
  governorates: Governorate[];
}

export const VisitorGuideView: React.FC<VisitorGuideViewProps> = ({
  services,
  governorates,
}) => {
  const [serviceType, setServiceType] = useState<'all' | TourismServiceType>('all');
  const [govFilter, setGovFilter] = useState<string>('all');

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (serviceType !== 'all' && s.service_type !== serviceType) return false;
      if (govFilter !== 'all' && s.governorate_id !== govFilter) return false;
      return true;
    });
  }, [services, serviceType, govFilter]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Header */}
      <div className="border-b border-[#173F35]/12 pb-6 dark:border-[#C5A15A]/18">
        <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
          معلومات عملية شفافة لرحلة آمنة ومريحة
        </p>
        <h1 className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-4xl">
          دليل الزائر والخدمات السياحية في العراق
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
          إرشادات السفر الأساسية، والمواسم المناسبة للزيارة، ودليل تعريفي للخدمات
          السياحية (الإقامة، المطاعم التراثية، والمرشدين) دون أي حجوزات وهمية أو أرقام غير
          متحققة.
        </p>
      </div>

      {/* Essential Practical Travel Tips */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:border-[#C5A15A]/18 dark:bg-[#13352F]">
          <h2 className="flex items-center gap-2 font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
            <ShieldCheck className="h-5 w-5 text-[#C5A15A]" />
            <span>آداب الزيارة واللباس</span>
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#54635F] dark:text-[#B5C4BF]">
            يُنصح بارتداء ملابس محتشمة عند زيارة العتبات والمراقد والمساجد التاريخية،
            واستئذان الأهالي قبل تصوير الأشخاص في الأسواق التراثية وقرى الأهوار.
          </p>
        </article>

        <article className="rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:border-[#C5A15A]/18 dark:bg-[#13352F]">
          <h2 className="flex items-center gap-2 font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
            <Compass className="h-5 w-5 text-[#C5A15A]" />
            <span>التنقل والوثائق</span>
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#54635F] dark:text-[#B5C4BF]">
            احمل هوية شخصية أو جواز السفر عند التنقل بين المحافظات، وراجع خرائط الطرق
            وساعات عمل المواقع الأثرية والمتاحف الرسمية قبل الانطلاق صباحاً.
          </p>
        </article>

        <article className="rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:border-[#C5A15A]/18 dark:bg-[#13352F]">
          <h2 className="flex items-center gap-2 font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
            <Calendar className="h-5 w-5 text-[#C5A15A]" />
            <span>الطقس والعملة</span>
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#54635F] dark:text-[#B5C4BF]">
            العملة الرسمية هي الدينار العراقي (IQD) ويُفضل حمل سيولة نقدية في الأسواق
            التقليدية والأهوار. يعتدل الطقس في الوسط والجنوب بين أكتوبر وأبريل.
          </p>
        </article>
      </div>

      {/* Tourism Services Directory */}
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
              دليل تعريفي قابل للتحديث من لوحة الإدارة
            </p>
            <h2 className="font-heritage mt-1 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-3xl">
              دليل الخدمات السياحية ({filteredServices.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', label: 'الكل' },
                { id: 'accommodation', label: 'الإقامة والفنادق' },
                { id: 'restaurant', label: 'المطاعم والمقاهي' },
                { id: 'guide_transport', label: 'المرشدون والتنقل' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setServiceType(tab.id)}
                className={`min-h-[38px] rounded-xl px-3.5 text-xs font-bold ${
                  serviceType === tab.id
                    ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                    : 'border border-[#173F35]/15 bg-white text-[#4E5C58] dark:bg-[#13352F] dark:text-[#C0CCC7]'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <select
              value={govFilter}
              onChange={(e) => setGovFilter(e.target.value)}
              aria-label="تصفية الخدمات حسب المحافظة"
              className="min-h-[38px] rounded-xl border border-[#173F35]/15 bg-white px-3 text-xs font-semibold text-[#252B29] dark:bg-[#13352F] dark:text-[#F8F6F0]"
            >
              <option value="all">كل المحافظات</option>
              {governorates.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name_ar}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-[#C5A15A]/40 bg-[#FFF9EB] px-4 py-3 text-xs text-[#6E4F12] dark:border-[#C5A15A]/30 dark:bg-[#1B2B22] dark:text-[#E9DFC9]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A15A]" />
          <span>
            ملاحظة شفافية: تعرض هذه القائمة خدمات تعريفية بدون أسعار أو أرقام غير متحققة.
            الحقول التي لم تُوثق ميدانياً تظهر بعبارة «غير متوفر حالياً».
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((svc) => (
            <article
              key={svc.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#173F35]/12 bg-white dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
            >
              <div className="aspect-[16/9] overflow-hidden bg-[#102F29]">
                <img
                  src={svc.image_url}
                  alt={svc.name_ar}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                  <span className="inline-flex items-center gap-1 text-[#8C6D2B] dark:text-[#E7C87B]">
                    {svc.service_type === 'accommodation' ? (
                      <Building2 className="h-3.5 w-3.5" />
                    ) : svc.service_type === 'restaurant' ? (
                      <Utensils className="h-3.5 w-3.5" />
                    ) : (
                      <Compass className="h-3.5 w-3.5" />
                    )}
                    <span>{svc.service_type_ar}</span>
                  </span>
                  <span className="text-[#5E6D68] dark:text-[#A9B8B3]">
                    {svc.verification_status === 'verified'
                      ? 'موثّق'
                      : 'قيد التحقق الميداني'}
                  </span>
                </div>

                <h3 className="font-heritage mt-1.5 text-xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
                  {svc.name_ar}
                </h3>
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#54635F] dark:text-[#A9B8B3]">
                  <MapPin className="h-3.5 w-3.5 text-[#C5A15A]" />
                  <span>
                    {svc.governorate_ar} · {svc.area_ar}
                  </span>
                </p>

                <p className="mt-2.5 flex-1 text-xs leading-relaxed text-[#4E5C58] dark:text-[#C0CCC7]">
                  {svc.description_ar}
                </p>

                <div className="mt-4 border-t border-[#173F35]/10 pt-3 text-xs dark:border-[#C5A15A]/15">
                  <p className="text-[#54635F] dark:text-[#A9B8B3]">
                    <strong className="text-[#173F35] dark:text-[#E7C87B]">
                      نطاق الأسعار:{' '}
                    </strong>
                    {svc.price_range_ar || 'غير متوفر حالياً'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {svc.phone ? (
                      <a
                        href={`tel:${svc.phone}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#173F35] px-3 py-1.5 text-[11px] font-bold text-white"
                      >
                        <Phone className="h-3 w-3" />
                        <span>اتصال</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#6B7A75] dark:text-[#8E9E99]">
                        بيانات التواصل المباشر: غير متوفر حالياً
                      </span>
                    )}
                    {svc.website_url && /^https?:\/\//i.test(svc.website_url) && (
                      <a
                        href={svc.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#173F35]/20 px-3 py-1.5 text-[11px] font-bold text-[#173F35] dark:text-[#E7C87B]"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>الموقع الرسمي</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Seasonal Matrix */}
      <div>
        <h2 className="font-heritage text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
          التقويم الموسمي للزيارة
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SEASONAL_RECOMMENDATIONS.map((s) => (
            <div
              key={s.season_ar}
              className="rounded-2xl border border-[#173F35]/12 bg-white p-4 dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
            >
              <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                {s.season_ar}
              </p>
              <h3 className="font-heritage mt-1 text-lg font-bold text-[#173F35] dark:text-[#F8F6F0]">
                {s.headline_ar}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
                {s.summary_ar}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
