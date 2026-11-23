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
      data-testid="offline-banner"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-[#C5A15A]/45 bg-[#102F29] px-4 py-3 text-xs text-[#F8F6F0] shadow-xl lg:bottom-5 lg:left-5 lg:right-auto"
    >
      <div className="flex items-start gap-2.5">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-[#E7C87B]" aria-hidden="true" />
        <div>
          <p className="font-bold text-[#E7C87B]">وضع عدم الاتصال نشط</p>
          <p className="mt-0.5 leading-relaxed text-[#E9DFC9]">
            متاح دون إنترنت: دليل المعالم المحفوظ، المتحف الرقمي، «عِش العراق»، الألعاب
            الثقافية، ومسار رحلتك. تتطلب الخريطة الحية والمزامنة السحابية اتصالاً بالإنترنت.
          </p>
        </div>
      </div>
    </div>
  );
};
