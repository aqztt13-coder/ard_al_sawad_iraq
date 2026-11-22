import React from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  onClose: () => void;
  onInstall: () => Promise<boolean>;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  isInstallable,
  isIOS,
  onClose,
  onInstall,
}) => {
  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const accepted = await onInstall();
    if (accepted) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1B1E]/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#C89B3C]/28 bg-[#F9F6F0] p-6 text-[#1A2421] shadow-2xl dark:bg-[#132529] dark:text-[#F1ECE2]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F3D3E] text-[#E7C87B]">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="pwa-install-title"
                className="font-heritage text-2xl font-bold text-[#0F3D3E] dark:text-[#E7C87B]"
              >
                تثبيت تطبيق أرض السواد
              </h2>
              <p className="text-xs text-[#54635F] dark:text-[#A5B4AF]">
                تصفح المعالم ومسار رحلتك دون اتصال بالإنترنت
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة التثبيت"
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[#4E5C58] hover:bg-[#0F3D3E]/8 dark:text-[#B4C0BC]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-relaxed text-[#394743] dark:text-[#C5D0CC]">
          {isInstallable ? (
            <>
              <p>
                يمكنك إضافة «أرض السواد» مباشرةً إلى شاشتك الرئيسية لتشغيله كتطبيق مستقل مع
                تخزين تلقائي للمعالم ومسار رحلتك.
              </p>
              <button
                type="button"
                onClick={handleInstallClick}
                className="mt-2 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#0F3D3E] px-5 py-3 text-sm font-semibold text-[#F9F6F0] hover:bg-[#144F50] dark:bg-[#C89B3C] dark:text-[#0D1B1E]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>تثبيت الآن</span>
              </button>
            </>
          ) : isIOS ? (
            <ol className="space-y-2.5 rounded-xl border border-[#0F3D3E]/12 bg-white/80 p-4 dark:border-[#C89B3C]/18 dark:bg-[#0D1B1E]">
              <li className="flex items-start gap-2">
                <Share className="mt-0.5 h-4 w-4 shrink-0 text-[#1B4B72] dark:text-[#96C2E6]" aria-hidden="true" />
                <span>
                  1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari.
                </span>
              </li>
              <li>
                2. مرّر للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
              </li>
              <li>
                3. اضغط على <strong>إضافة</strong> ليظهر تطبيق «أرض السواد» على جهازك.
              </li>
            </ol>
          ) : (
            <div className="space-y-2.5 rounded-xl border border-[#0F3D3E]/12 bg-white/80 p-4 dark:border-[#C89B3C]/18 dark:bg-[#0D1B1E]">
              <p className="font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                خطوات التثبيت على جهازك:
              </p>
              <p>
                • على <strong>Chrome أو Edge</strong>: اضغط على أيقونة التثبيت في شريط العنوان
                أو افتح القائمة واختر «تثبيت أرض السواد».
              </p>
              <p>
                • على <strong>iPhone / iPad</strong>: افتح قائمة المشاركة في Safari ثم اختر
                «إضافة إلى الشاشة الرئيسية».
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-[42px] w-full rounded-xl border border-[#0F3D3E]/16 bg-white/75 py-2 text-sm font-semibold text-[#1A2421] hover:bg-white dark:border-[#C89B3C]/22 dark:bg-[#0D1B1E] dark:text-[#F1ECE2]"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};
