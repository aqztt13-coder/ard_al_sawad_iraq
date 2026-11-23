import React, { useEffect, useRef, useState } from 'react';
import {
  BookmarkCheck,
  ChevronDown,
  Download,
  Menu,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';
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

const PRIMARY_NAV: { id: AppView; label: string }[] = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'explore', label: 'اكتشف العراق' },
  { id: 'map', label: 'خريطة العراق' },
  { id: 'museum', label: 'المتحف الرقمي' },
  { id: 'planner', label: 'خطط رحلتك' },
];

const MORE_NAV_GROUPS: {
  heading: string;
  items: { id: AppView; label: string; subtitle: string }[];
}[] = [
  {
    heading: 'استكشاف الوجهات',
    items: [
      { id: 'governorates', label: 'المحافظات', subtitle: 'ملفات المحافظات الـ 18' },
      { id: 'archaeological', label: 'المواقع الأثرية', subtitle: 'سومر وبابل وآشور والعباسيون' },
      { id: 'religious', label: 'المواقع الدينية', subtitle: 'العتبات والمراقد المقدسة' },
      { id: 'nature', label: 'الطبيعة والأهوار', subtitle: 'الأهوار والجبال والشلالات' },
    ],
  },
  {
    heading: 'الثقافة والزائر',
    items: [
      { id: 'culture', label: 'عِش العراق', subtitle: 'المطبخ والحرف والضيافة' },
      { id: 'games', label: 'الألعاب الثقافية', subtitle: 'المسمارية ولعبة أور والمسابقة' },
      { id: 'guide', label: 'دليل الزائر', subtitle: 'الخدمات السياحية والإرشادات' },
      { id: 'initiatives', label: 'المبادرات الوطنية', subtitle: 'صون التراث والسياحة المستدامة' },
      { id: 'about', label: 'من نحن', subtitle: 'رسالة المنصة ومعايير التوثيق' },
    ],
  },
];

const ALL_MORE_VIEWS = new Set<AppView>(
  MORE_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id))
);

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  savedCount,
  isInstalled,
  isAdmin,
  onRequestInstall,
  onOpenAdminLogin,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelectView = (view: AppView) => {
    onNavigate(view);
    setMoreOpen(false);
    setMobileMenuOpen(false);
  };

  const isMoreActive = ALL_MORE_VIEWS.has(activeView);

  return (
    <header className="sticky top-0 z-40 border-b border-[#173F35]/12 bg-[#F8F6F0]/94 backdrop-blur-md dark:border-[#C5A15A]/18 dark:bg-[#102F29]/94">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-5 sm:px-6 md:h-16 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleSelectView('home')}
          className="font-heritage text-2xl font-bold tracking-tight text-[#173F35] transition-colors hover:text-[#1F5447] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C5A15A] dark:text-[#E7C87B] dark:hover:text-[#F8F6F0] whitespace-nowrap shrink-0"
        >
          أرض السواد
        </button>

        {/* Zone 2: Primary Desktop Navigation + "المزيد" Popover */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden items-center gap-5 lg:flex xl:gap-6"
        >
          {PRIMARY_NAV.map((item) => {
            const isActive =
              activeView === item.id ||
              (item.id === 'planner' &&
                (activeView === 'trails' || activeView === 'itinerary'));
            const displayLabel =
              item.id === 'planner' && savedCount > 0
                ? `${item.label} (${savedCount})`
                : item.label;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C5A15A] ${
                  isActive
                    ? 'text-[#173F35] dark:text-[#E7C87B]'
                    : 'text-[#4B5854] hover:text-[#173F35] dark:text-[#C0CCC7] dark:hover:text-[#F8F6F0]'
                }`}
              >
                {displayLabel}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-[#C5A15A]"
                  />
                )}
              </button>
            );
          })}

          {/* Clean "المزيد" Dropdown */}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              data-testid="nav-more-btn"
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={`relative inline-flex items-center gap-1 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C5A15A] ${
                isMoreActive || moreOpen
                  ? 'text-[#173F35] dark:text-[#E7C87B]'
                  : 'text-[#4B5854] hover:text-[#173F35] dark:text-[#C0CCC7] dark:hover:text-[#F8F6F0]'
              }`}
            >
              <span>المزيد</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
              {isMoreActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-[#C5A15A]"
                />
              )}
            </button>

            {moreOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-2 w-[520px] rounded-2xl border border-[#173F35]/14 bg-[#FFFFFF] p-5 shadow-2xl dark:border-[#C5A15A]/22 dark:bg-[#13352F]"
              >
                <div className="grid grid-cols-2 gap-6">
                  {MORE_NAV_GROUPS.map((group) => (
                    <div key={group.heading}>
                      <p className="mb-2.5 text-[11px] font-bold tracking-wide text-[#8C6D2B] dark:text-[#E7C87B]">
                        {group.heading}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const active = activeView === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              role="menuitem"
                              onClick={() => handleSelectView(item.id)}
                              className={`w-full rounded-xl px-3 py-2 text-right transition-colors ${
                                active
                                  ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                                  : 'text-[#252B29] hover:bg-[#F8F6F0] dark:text-[#F1ECE2] dark:hover:bg-[#102F29]/70'
                              }`}
                            >
                              <span className="block text-sm font-bold leading-snug">
                                {item.label}
                              </span>
                              <span
                                className={`block text-[11px] leading-snug ${
                                  active
                                    ? 'text-[#E9DFC9] dark:text-[#102F29]/80'
                                    : 'text-[#5A6763] dark:text-[#A8B8B3]'
                                }`}
                              >
                                {item.subtitle}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Admin Access + Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="header-admin-btn"
            onClick={isAdmin ? () => handleSelectView('admin') : onOpenAdminLogin}
            aria-label={isAdmin ? 'حساب المدير' : 'لوحة الإدارة'}
            title={isAdmin ? 'فتح لوحة الإدارة' : 'دخول الإدارة'}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A15A] sm:px-3 ${
              isAdmin || activeView === 'admin'
                ? 'border-[#C5A15A]/60 bg-[#C5A15A]/15 text-[#7B5B17] hover:bg-[#C5A15A]/24 dark:border-[#C5A15A]/50 dark:bg-[#C5A15A]/18 dark:text-[#E7C87B]'
                : 'border-[#173F35]/18 bg-white/80 text-[#3D4B47] hover:border-[#173F35]/35 hover:bg-white hover:text-[#173F35] dark:border-[#C5A15A]/22 dark:bg-[#153B34]/80 dark:text-[#C5D0CC] dark:hover:text-[#E7C87B]'
            }`}
          >
            {isAdmin ? (
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#C5A15A]" aria-hidden="true" />
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
              className="hidden min-h-[40px] items-center gap-2 rounded-lg bg-[#173F35] px-3.5 py-2 text-xs font-semibold text-[#F8F6F0] transition-colors hover:bg-[#1E5044] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A15A] dark:bg-[#C5A15A] dark:text-[#102F29] dark:hover:bg-[#D5B26B] whitespace-nowrap shrink-0 sm:inline-flex"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>تثبيت التطبيق</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSelectView('planner')}
              className="hidden min-h-[40px] items-center gap-2 rounded-lg bg-[#173F35] px-3.5 py-2 text-xs font-semibold text-[#F8F6F0] transition-colors hover:bg-[#1E5044] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A15A] dark:bg-[#C5A15A] dark:text-[#102F29] dark:hover:bg-[#D5B26B] whitespace-nowrap shrink-0 sm:inline-flex"
            >
              <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
              <span>خطط رحلتك</span>
            </button>
          )}

          <button
            type="button"
            data-testid="mobile-menu-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح قائمة الأقسام'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#173F35]/18 bg-white/80 text-[#173F35] transition-colors hover:bg-white dark:border-[#C5A15A]/22 dark:bg-[#153B34] dark:text-[#E7C87B] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Full Directory Drawer (<lg) */}
      {mobileMenuOpen && (
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-[#173F35]/12 bg-[#FFFFFF] px-4 py-5 shadow-xl dark:border-[#C5A15A]/18 dark:bg-[#102F29] lg:hidden">
          <div className="mx-auto max-w-2xl space-y-5">
            <div>
              <p className="mb-2 text-[11px] font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                الأقسام الرئيسية
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRIMARY_NAV.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectView(item.id)}
                    className={`rounded-xl px-3 py-2.5 text-right text-sm font-bold transition-colors ${
                      activeView === item.id
                        ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                        : 'bg-[#F8F6F0] text-[#252B29] hover:bg-[#E9DFC9]/60 dark:bg-[#153B34] dark:text-[#F1ECE2]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {MORE_NAV_GROUPS.map((group) => (
              <div key={group.heading}>
                <p className="mb-2 text-[11px] font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  {group.heading}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectView(item.id)}
                      className={`rounded-xl px-3 py-2.5 text-right text-sm font-semibold transition-colors ${
                        activeView === item.id
                          ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                          : 'bg-[#F8F6F0] text-[#252B29] hover:bg-[#E9DFC9]/60 dark:bg-[#153B34] dark:text-[#F1ECE2]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {!isInstalled && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onRequestInstall();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173F35] py-3 text-sm font-bold text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]"
              >
                <Download className="h-4 w-4" />
                <span>تثبيت تطبيق أرض السواد على جهازك</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
