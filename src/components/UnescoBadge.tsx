import React from 'react';
import { Award } from 'lucide-react';

interface UnescoBadgeProps {
  variant?: 'overlay' | 'inline';
  className?: string;
}

export const UnescoBadge: React.FC<UnescoBadgeProps> = ({
  variant = 'overlay',
  className = '',
}) => {
  if (variant === 'inline') {
    return (
      <span
        data-testid="unesco-badge"
        className={`inline-flex items-center gap-2 rounded-lg border border-[#C89B3C]/50 bg-[#0F3D3E] px-3 py-1.5 text-xs font-bold text-[#F5D98E] shadow-sm dark:bg-[#C89B3C]/18 dark:text-[#F5D98E] whitespace-nowrap ${className}`}
      >
        <Award className="h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
        <span>موقع تراث عالمي — اليونسكو (UNESCO)</span>
      </span>
    );
  }

  return (
    <span
      data-testid="unesco-badge"
      aria-label="موقع تراث عالمي مدرج في اليونسكو"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[#E7C87B]/55 bg-[#0D1B1E]/82 px-2.5 py-1 text-[11px] font-bold text-[#F5D98E] backdrop-blur-md shadow-sm whitespace-nowrap ${className}`}
    >
      <Award className="h-3.5 w-3.5 shrink-0 text-[#E7C87B]" aria-hidden="true" />
      <span>تراث عالمي · UNESCO</span>
    </span>
  );
};
