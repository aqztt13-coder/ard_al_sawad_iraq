import React from 'react';
import { Compass, Home, Landmark, Map as MapIcon, Route } from 'lucide-react';
import { AppView } from '../types/tourism';

interface MobileBottomNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  savedCount: number;
}

const TABS: { id: AppView; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'home', label: 'الرئيسية', Icon: Home },
  { id: 'explore', label: 'اكتشف', Icon: Compass },
  { id: 'map', label: 'الخريطة', Icon: MapIcon },
  { id: 'museum', label: 'المتحف', Icon: Landmark },
  { id: 'planner', label: 'رحلتك', Icon: Route },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onNavigate,
  savedCount,
}) => {
  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#173F35]/14 bg-[#F8F6F0]/95 backdrop-blur-md pb-safe dark:border-[#C5A15A]/18 dark:bg-[#102F29]/95 lg:hidden"
    >
      <div className="grid h-16 grid-cols-5 items-center">
        {TABS.map(({ id, label, Icon }) => {
          const isActive =
            activeView === id ||
            (id === 'planner' &&
              (activeView === 'trails' || activeView === 'itinerary'));
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#C5A15A] ${
                isActive
                  ? 'text-[#173F35] dark:text-[#E7C87B]'
                  : 'text-[#5C6A66] hover:text-[#173F35] dark:text-[#9CB0A9] dark:hover:text-[#F8F6F0]'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {id === 'planner' && savedCount > 0 && (
                  <span
                    aria-label={`${savedCount} وجهات محفوظة`}
                    className="absolute -top-1.5 -left-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#C5A15A] px-1 text-[10px] font-bold text-[#102F29] tabular-nums"
                  >
                    {savedCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold leading-none whitespace-nowrap">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
