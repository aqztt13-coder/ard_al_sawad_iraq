import React, { useState } from 'react';
import {
  CheckCircle2,
  CloudUpload,
  Loader2,
  LogOut,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { CloudOperationResult } from '../hooks/useCloudData';

interface AdminBarProps {
  isSyncing: boolean;
  onAddLandmark: () => void;
  onSeedCloudData: () => Promise<CloudOperationResult>;
  onRefreshCloud: () => Promise<CloudOperationResult>;
  onSignOut: () => Promise<{ error: string | null }>;
}

export const AdminBar: React.FC<AdminBarProps> = ({
  isSyncing,
  onAddLandmark,
  onSeedCloudData,
  onRefreshCloud,
  onSignOut,
}) => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [notice, setNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSeed = async () => {
    setIsSeeding(true);
    setNotice(null);
    const result = await onSeedCloudData();
    setIsSeeding(false);

    setNotice({
      type: result.ok ? 'success' : 'error',
      text:
        result.message ||
        (result.ok
          ? 'تم نشر البيانات الأولية بنجاح.'
          : 'تعذر نشر البيانات الأولية حالياً.'),
    });
  };

  const handleRefresh = async () => {
    setNotice(null);
    const result = await onRefreshCloud();
    setNotice({
      type: result.ok ? 'success' : 'error',
      text: result.message || (result.ok ? 'تم تحديث البيانات.' : 'تعذر تحديث البيانات حالياً.'),
    });
  };

  return (
    <div
      data-testid="admin-panel-bar"
      className="border-b border-[#C89B3C]/35 bg-[#0F3D3E] text-[#F9F6F0] dark:bg-[#102428]"
    >
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#E7C87B]" aria-hidden="true" />
            <span className="font-bold text-[#E7C87B]">لوحة الإدارة</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="admin-add-landmark-btn"
              onClick={onAddLandmark}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#C89B3C] px-3 py-1.5 text-xs font-bold text-[#0D1B1E] transition-colors hover:bg-[#D7AC4D] whitespace-nowrap"
            >
              <PlusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>إضافة معلم جديد</span>
            </button>

            <button
              type="button"
              data-testid="admin-seed-cloud-btn"
              onClick={handleSeed}
              disabled={isSeeding}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E7C87B]/45 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#F9F6F0] transition-colors hover:bg-white/18 disabled:opacity-65 whitespace-nowrap"
            >
              {isSeeding ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5 shrink-0 text-[#E7C87B]" aria-hidden="true" />
              )}
              <span>
                {isSeeding ? 'جارٍ نشر البيانات...' : 'مزامنة البيانات الأولية'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isSyncing}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-[#E6EFEA] transition-colors hover:bg-white/12 disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            <button
              type="button"
              data-testid="admin-bar-signout-btn"
              onClick={() => void onSignOut()}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-red-300/35 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/25 whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className={`mt-2.5 flex items-center justify-between gap-3 rounded-lg px-3.5 py-2 text-xs ${
              notice.type === 'success'
                ? 'bg-emerald-950/70 text-emerald-100 border border-emerald-400/35'
                : 'bg-amber-950/75 text-amber-100 border border-amber-400/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#E7C87B]" aria-hidden="true" />
              <span>{notice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="إغلاق الإشعار"
              className="rounded p-0.5 hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
