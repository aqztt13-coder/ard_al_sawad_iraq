import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl border border-[#C89B3C]/40 bg-[#0F3D3E] px-4 py-2.5 text-xs font-semibold text-[#F9F6F0] shadow-lg md:bottom-5"
    >
      <WifiOff className="h-4 w-4 text-[#E7C87B]" aria-hidden="true" />
      <span>وضع عدم الاتصال — يتم عرض البيانات المخزّنة محلياً</span>
    </div>
  );
};
