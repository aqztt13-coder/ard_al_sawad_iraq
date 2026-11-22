import React from 'react';
import { Download, BookmarkCheck, Shield, ShieldCheck } from 'lucide-react';
import { AppView } from '../types/tourism';

interface HeaderProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  savedCount: number;
  isInstalled: boolean;
  isAdmin: boolean;
  onRequestInstall: () => void;
  onOpenAdminLogin: () => void;
}

const NAV_ITEMS: { id: AppView; label: string }[] = [
  { id: 'explore', label: 'المعالم' },
  { id: 'trails', label: 'المسارات المقترحة' },
  { id: 'governorates', label: 'المحافظات' },
  { id: 'map', label: 'الخريطة' },
  { id: 'itinerary', label: 'مساري' },
];

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  savedCount,
  isInstalled,
  isAdmin,
  onRequestInstall,
  onOpenAdminLogin,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[#0F3D3E]/12 bg-[#F9F6F0]/92 backdrop-blur-md dark:border-[#C89B3C]/18 dark:bg-[#0D1B1E]/92">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 md:h-16 lg:px-8">
        {/* Zone 1: Single-line Heritage Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className="font-heritage text-2xl font-bold tracking-tight text-[#0F3D3E] transition-colors hover:text-[#1B4B72] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C] dark:text-[#E7C87B] dark:hover:text-[#F9F6F0] whitespace-nowrap shrink-0"
        >
          أرض السواد
        </button>

        {/* Zone 2: Single-line Navigation Links (Desktop) */}
        <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-6 lg:gap-7 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            const displayLabel =
              item.id === 'itinerary' && savedCount > 0
                ? `${item.label} (${savedCount})`
                : item.label;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C89B3C] ${
                  isActive
                    ? 'text-[#0F3D3E] dark:text-[#E7C87B]'
                    : 'text-[#4B5854] hover:text-[#0F3D3E] dark:text-[#B4C0BC] dark:hover:text-[#F1ECE2]'
                }`}
              >
                {displayLabel}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-[#C89B3C]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Admin Access + Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="header-admin-btn"
            onClick={onOpenAdminLogin}
            aria-label={isAdmin ? 'حساب المدير' : 'لوحة الإدارة'}
            title={isAdmin ? 'حساب المدير' : 'لوحة الإدارة'}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] sm:px-3 ${
              isAdmin
                ? 'border-[#C89B3C]/50 bg-[#C89B3C]/14 text-[#7B5B17] hover:bg-[#C89B3C]/22 dark:border-[#C89B3C]/45 dark:bg-[#C89B3C]/16 dark:text-[#E7C87B]'
                : 'border-[#0F3D3E]/16 bg-white/70 text-[#3D4B47] hover:border-[#0F3D3E]/30 hover:bg-white hover:text-[#0F3D3E] dark:border-[#C89B3C]/22 dark:bg-[#132529]/80 dark:text-[#C5D0CC] dark:hover:text-[#E7C87B]'
            }`}
          >
            {isAdmin ? (
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
            ) : (
              <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {isAdmin ? 'حساب المدير' : 'لوحة الإدارة'}
            </span>
          </button>

          {!isInstalled ? (
            <button
              type="button"
              onClick={onRequestInstall}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#0F3D3E] px-3.5 py-2 text-xs font-semibold text-[#F9F6F0] transition-colors hover:bg-[#144F50] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:bg-[#C89B3C] dark:text-[#0D1B1E] dark:hover:bg-[#D7AC4D] whitespace-nowrap shrink-0 sm:px-4"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>تثبيت التطبيق</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('itinerary')}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#0F3D3E] px-3.5 py-2 text-xs font-semibold text-[#F9F6F0] transition-colors hover:bg-[#144F50] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:bg-[#C89B3C] dark:text-[#0D1B1E] dark:hover:bg-[#D7AC4D] whitespace-nowrap shrink-0 sm:px-4"
            >
              <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
              <span>مسار رحلتي</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
