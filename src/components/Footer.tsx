import React from 'react';
import { AppView } from '../types/tourism';
import { ThemeMode } from '../hooks/useTheme';

interface FooterProps {
  totalGovernorates: number;
  totalLandmarks: number;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNavigate: (view: AppView) => void;
  onOpenInstall: () => void;
  isInstalled: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  totalGovernorates,
  totalLandmarks,
  theme,
  onToggleTheme,
  onNavigate,
  onOpenInstall,
  isInstalled,
}) => {
  return (
    <footer className="mt-16 border-t border-[#173F35]/14 bg-[#EFE9DA]/85 pb-24 pt-12 dark:border-[#C5A15A]/18 dark:bg-[#0B221E] md:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="font-heritage text-2xl font-bold text-[#173F35] dark:text-[#E7C87B]"
            >
              أرض السواد
            </button>
            <p className="mt-2.5 text-xs leading-relaxed text-[#4C5B57] dark:text-[#A9B8B3] tabular-nums">
              المنصة الرقمية الشاملة لاستكشاف السياحة والتراث والآثار والعتبات المقدسة
              والطبيعة عبر {totalGovernorates} محافظة و{totalLandmarks} معلماً موثّقاً
              في جمهورية العراق.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-wide text-[#8C6D2B] dark:text-[#E7C87B]">
              استكشاف العراق
            </h3>
            <ul className="mt-3 space-y-2 text-xs font-semibold text-[#3B4A46] dark:text-[#C1CEC9]">
              <li>
                <button type="button" onClick={() => onNavigate('explore')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  اكتشف العراق ({totalLandmarks})
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('governorates')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  المحافظات العراقية ({totalGovernorates})
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('archaeological')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  المواقع الأثرية والتاريخية
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('religious')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  العتبات والمواقع الدينية
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('nature')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  الطبيعة والأهوار والمصايف
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-wide text-[#8C6D2B] dark:text-[#E7C87B]">
              الثقافة والتخطيط
            </h3>
            <ul className="mt-3 space-y-2 text-xs font-semibold text-[#3B4A46] dark:text-[#C1CEC9]">
              <li>
                <button type="button" onClick={() => onNavigate('map')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  خريطة العراق التفاعلية
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('museum')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  المتحف الرقمي والخط الزمني
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('planner')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  خطط رحلتك والمسارات المقترحة
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('culture')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  عِش العراق (الثقافة والضيافة)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('games')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  الألعاب الثقافية والتراثية
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-wide text-[#8C6D2B] dark:text-[#E7C87B]">
              الزائر والمنصة
            </h3>
            <ul className="mt-3 space-y-2 text-xs font-semibold text-[#3B4A46] dark:text-[#C1CEC9]">
              <li>
                <button type="button" onClick={() => onNavigate('guide')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  دليل الزائر والخدمات السياحية
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('initiatives')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  المبادرات الوطنية للتراث
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('about')} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  من نحن ومعايير الدقة
                </button>
              </li>
              <li>
                <button type="button" onClick={onToggleTheme} className="hover:text-[#173F35] dark:hover:text-[#E7C87B]">
                  {theme === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
                </button>
              </li>
              {!isInstalled && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenInstall}
                    className="font-bold text-[#173F35] underline decoration-[#C5A15A] underline-offset-4 dark:text-[#E7C87B]"
                  >
                    تثبيت التطبيق للعمل دون اتصال
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div aria-hidden="true" className="mesopotamian-frieze my-7 h-3 w-full opacity-45" />

        <div className="flex flex-col justify-between gap-2 text-xs text-[#5E6D68] dark:text-[#899993] sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} أرض السواد — المنصة الثقافية والسياحية لاكتشاف
            العراق.
          </p>
          <p>
            جميع النصوص محررة بعناية لأغراض التثقيف والإرشاد السياحي — مع شفافية تامة
            لحالة التوثيق.
          </p>
        </div>
      </div>
    </footer>
  );
};
