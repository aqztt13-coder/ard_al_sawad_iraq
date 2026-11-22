import React from 'react';
import { Compass, Landmark, Map as MapIcon, Bookmark, Route } from 'lucide-react';
import { AppView } from '../types/tourism';

interface MobileBottomNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  savedCount: number;
}

const TABS: { id: AppView; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'explore', label: 'المعالم', Icon: Compass },
  { id: 'trails', label: 'المسارات', Icon: Route },
  { id: 'governorates', label: 'المحافظات', Icon: Landmark },
  { id: 'map', label: 'الخريطة', Icon: MapIcon },
  { id: 'itinerary', label: 'مساري', Icon: Bookmark },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onNavigate,
  savedCount,
}) => {
  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#0F3D3E]/12 bg-[#F9F6F0]/95 backdrop-blur-md pb-safe dark:border-[#C89B3C]/18 dark:bg-[#0D1B1E]/95 md:hidden"
    >
      <div className="grid h-16 grid-cols-5 items-center">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#C89B3C] ${
                isActive
                  ? 'text-[#0F3D3E] dark:text-[#E7C87B]'
                  : 'text-[#5C6A66] hover:text-[#0F3D3E] dark:text-[#96A6A1] dark:hover:text-[#F1ECE2]'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {id === 'itinerary' && savedCount > 0 && (
                  <span
                    aria-label={`${savedCount} وجهات محفوظة`}
                    className="absolute -top-1.5 -left-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#C89B3C] px-1 text-[10px] font-bold text-[#0D1B1E] tabular-nums"
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
