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
    <footer className="mt-12 border-t border-[#0F3D3E]/12 bg-[#F4EFE4]/80 pb-24 pt-10 dark:border-[#C89B3C]/18 dark:bg-[#0A1518] md:pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="font-heritage text-2xl font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
              أرض السواد
            </p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-[#54635F] dark:text-[#9AA8A3] tabular-nums">
              دليل العراق السياحي والتراثي والديني عبر {totalGovernorates} محافظة و
              {totalLandmarks} معلماً موثّقاً — مصمّم للعمل بكفاءة على الهواتف والحواسيب
              مع دعم التصفح دون اتصال.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-[#3D4B47] dark:text-[#B4C0BC]">
            <button
              type="button"
              onClick={() => onNavigate('explore')}
              className="hover:text-[#0F3D3E] dark:hover:text-[#E7C87B]"
            >
              المعالم ({totalLandmarks})
            </button>
            <button
              type="button"
              onClick={() => onNavigate('trails')}
              className="hover:text-[#0F3D3E] dark:hover:text-[#E7C87B]"
            >
              المسارات المقترحة
            </button>
            <button
              type="button"
              onClick={() => onNavigate('governorates')}
              className="hover:text-[#0F3D3E] dark:hover:text-[#E7C87B] tabular-nums"
            >
              المحافظات ({totalGovernorates})
            </button>
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="hover:text-[#0F3D3E] dark:hover:text-[#E7C87B]"
            >
              خريطة العراق
            </button>
            <button
              type="button"
              onClick={() => onNavigate('itinerary')}
              className="hover:text-[#0F3D3E] dark:hover:text-[#E7C87B]"
            >
              مساري
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              className="hover:text-[#0F3D3E] dark:hover:text-[#E7C87B]"
            >
              {theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            </button>
            {!isInstalled && (
              <button
                type="button"
                onClick={onOpenInstall}
                className="text-[#1B4B72] hover:underline dark:text-[#96C2E6]"
              >
                تثبيت التطبيق
              </button>
            )}
          </div>
        </div>

        <div aria-hidden="true" className="mesopotamian-frieze my-6 h-3 w-full opacity-50" />

        <p className="text-xs text-[#6B7A76] dark:text-[#7E8E89]">
          © {new Date().getFullYear()} أرض السواد — دليل تراث وسياحة العراق. جميع البيانات
          التاريخية والجغرافية محررة لأغراض الإرشاد السياحي والثقافي.
        </p>
      </div>
    </footer>
  );
};
