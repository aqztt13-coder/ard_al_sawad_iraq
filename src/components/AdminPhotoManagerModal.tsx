import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Governorate, GovernorateProfile, Landmark } from '../types/tourism';
import { CloudOperationResult } from '../hooks/useCloudData';
import {
  appendCacheBuster,
  prependPhotosToList,
  removePhotoFromList,
  sanitizeImageList,
  setCoverPhotoInList,
} from '../utils/supabaseSync';

export type PhotoManagerTarget =
  | { type: 'landmark'; landmark: Landmark }
  | { type: 'governorate'; governorate: Governorate; profile: GovernorateProfile };

interface AdminPhotoManagerModalProps {
  target: PhotoManagerTarget | null;
  onClose: () => void;
  onUploadPhoto: (
    file: File,
    folder: 'landmarks' | 'governorates',
    entityId: string
  ) => Promise<{ url: string | null; error: string | null }>;
  onDeleteStoragePhoto: (publicUrl: string) => Promise<void>;
  onUpdateLandmarkImages: (
    landmark: Landmark,
    nextImages: string[]
  ) => Promise<CloudOperationResult>;
  onUpdateGovernorateCover: (
    governorateId: string,
    coverImageUrl: string | null
  ) => Promise<CloudOperationResult>;
}

export const AdminPhotoManagerModal: React.FC<AdminPhotoManagerModalProps> = ({
  target,
  onClose,
  onUploadPhoto,
  onDeleteStoragePhoto,
  onUpdateLandmarkImages,
  onUpdateGovernorateCover,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const targetKey = target
    ? `${target.type}:${target.type === 'landmark' ? target.landmark.id : target.governorate.id}`
    : '';

  useEffect(() => {
    setStatusMessage(null);
  }, [targetKey]);

  useEffect(() => {
    if (!target) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [target, isBusy, onClose]);

  if (!target) return null;

  const isLandmark = target.type === 'landmark';
  const title = isLandmark
    ? `إدارة صور: ${target.landmark.name_ar}`
    : `إدارة صورة الغلاف: محافظة ${target.governorate.name_ar}`;

  const currentImages: string[] = isLandmark
    ? sanitizeImageList(target.landmark.images ?? [])
    : target.profile.cover_image_url
      ? [target.profile.cover_image_url]
      : [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBusy(true);
    setStatusMessage(null);

    try {
      if (isLandmark) {
        const uploadedUrls: string[] = [];
        for (const file of Array.from(files)) {
          const uploadRes = await onUploadPhoto(file, 'landmarks', target.landmark.id);
          if (uploadRes.error || !uploadRes.url) {
            setStatusMessage({
              type: 'error',
              text: uploadRes.error || 'تعذر رفع إحدى الصور.',
            });
            setIsBusy(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }
          uploadedUrls.push(uploadRes.url);
        }

        const mergedImages = prependPhotosToList(currentImages, uploadedUrls);
        const saveRes = await onUpdateLandmarkImages(target.landmark, mergedImages);
        setStatusMessage({
          type: saveRes.ok ? 'success' : 'error',
          text: saveRes.ok
            ? `تم ضغط ورفع ${uploadedUrls.length === 1 ? 'صورة واحدة' : `${uploadedUrls.length} صور`} وتعيينها كصورة رئيسية في السحابة.`
            : saveRes.message || 'تم رفع الصورة ولكن تعذر تحديث قاعدة البيانات.',
        });
      } else {
        const file = files[0];
        const uploadRes = await onUploadPhoto(
          file,
          'governorates',
          target.governorate.id
        );
        if (uploadRes.error || !uploadRes.url) {
          setStatusMessage({
            type: 'error',
            text: uploadRes.error || 'تعذر رفع صورة الغلاف.',
          });
          setIsBusy(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const previousCover = target.profile.cover_image_url;
        const saveRes = await onUpdateGovernorateCover(
          target.governorate.id,
          uploadRes.url
        );

        if (saveRes.ok && previousCover) {
          void onDeleteStoragePhoto(previousCover);
        }

        setStatusMessage({
          type: saveRes.ok ? 'success' : 'error',
          text: saveRes.ok
            ? 'تم ضغط ورفع صورة غلاف المحافظة وحفظها مباشرة للجميع.'
            : saveRes.message || 'تعذر حفظ رابط صورة الغلاف في السحابة.',
        });
      }
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetCover = async (photoUrl: string) => {
    if (!isLandmark) return;
    setIsBusy(true);
    setStatusMessage(null);
    const reordered = setCoverPhotoInList(currentImages, photoUrl);
    if (reordered.length > 0) {
      reordered[0] = appendCacheBuster(reordered[0]) || reordered[0];
    }
    const res = await onUpdateLandmarkImages(target.landmark, reordered);
    setIsBusy(false);
    setStatusMessage({
      type: res.ok ? 'success' : 'error',
      text: res.ok
        ? 'تم تعيين الصورة كصورة غلاف رئيسية للمعلم.'
        : res.message || 'تعذر تحديث ترتيب الصور.',
    });
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    setIsBusy(true);
    setStatusMessage(null);

    if (isLandmark) {
      const nextList = removePhotoFromList(currentImages, photoUrl);
      const res = await onUpdateLandmarkImages(target.landmark, nextList);
      if (res.ok) {
        void onDeleteStoragePhoto(photoUrl);
      }
      setStatusMessage({
        type: res.ok ? 'success' : 'error',
        text: res.ok ? 'تم حذف الصورة بنجاح.' : res.message || 'تعذر حذف الصورة.',
      });
    } else {
      const res = await onUpdateGovernorateCover(target.governorate.id, null);
      if (res.ok) {
        void onDeleteStoragePhoto(photoUrl);
      }
      setStatusMessage({
        type: res.ok ? 'success' : 'error',
        text: res.ok
          ? 'تمت إزالة صورة غلاف المحافظة.'
          : res.message || 'تعذر إزالة صورة الغلاف.',
      });
    }

    setIsBusy(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-manager-title"
      data-testid="admin-photo-manager-modal"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0D1B1E]/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => {
        if (!isBusy) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[#C89B3C]/30 bg-[#F9F6F0] text-[#1A2421] shadow-2xl dark:bg-[#0D1B1E] dark:text-[#F1ECE2] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#0F3D3E]/12 px-5 py-4 dark:border-[#C89B3C]/18">
          <div className="min-w-0">
            <h2
              id="photo-manager-title"
              className="truncate font-heritage text-xl font-bold text-[#0F3D3E] dark:text-[#F4EFE6]"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-[#5C6A66] dark:text-[#9AA8A3]">
              يتم ضغط الصور تلقائياً قبل الحفظ لتقديم أفضل جودة وأسرع تحميل للزوار
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="إغلاق إدارة الصور"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#0F3D3E]/15 text-[#1A2421] hover:bg-[#0F3D3E]/8 dark:border-[#C89B3C]/25 dark:text-[#F1ECE2]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* Upload Dropzone / Button */}
          <div className="rounded-2xl border-2 border-dashed border-[#C89B3C]/45 bg-white/80 p-5 text-center dark:bg-[#132529]/85">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple={isLandmark}
              onChange={handleFileChange}
              className="sr-only"
              id="admin-photo-file-input"
              disabled={isBusy}
            />
            <label
              htmlFor="admin-photo-file-input"
              className={`inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0F3D3E] px-5 py-2.5 text-sm font-semibold text-[#F9F6F0] transition-colors hover:bg-[#144F50] dark:bg-[#C89B3C] dark:text-[#0D1B1E] dark:hover:bg-[#D7AC4D] ${
                isBusy ? 'pointer-events-none opacity-65' : ''
              }`}
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>جارٍ ضغط ورفع الصور...</span>
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isLandmark
                      ? 'رفع صور جديدة من الهاتف أو الحاسوب'
                      : 'رفع أو استبدال صورة غلاف المحافظة'}
                  </span>
                </>
              )}
            </label>
            <p className="mt-2.5 text-xs text-[#5C6A66] dark:text-[#9AA8A3]">
              الصيغ المدعومة: JPG، PNG، WebP — يتم تصغير وضغط الصور تلقائياً لأسرع تحميل على
              الهواتف.
            </p>
          </div>

          {statusMessage && (
            <div
              role="status"
              className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
                statusMessage.type === 'success'
                  ? 'border-emerald-500/35 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'border-red-500/35 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Current Uploaded Cloud Photos Grid */}
          <div className="mt-6">
            <h3 className="text-sm font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
              {isLandmark
                ? `الصور السحابية المرفوعة (${currentImages.length})`
                : 'صورة غلاف المحافظة الحالية'}
            </h3>

            {currentImages.length === 0 ? (
              <p className="mt-2 rounded-xl border border-[#0F3D3E]/10 bg-white/60 p-4 text-xs leading-relaxed text-[#5C6A66] dark:border-[#C89B3C]/15 dark:bg-[#132529]/60 dark:text-[#9AA8A3]">
                {isLandmark
                  ? 'لم تُرفع صور مخصصة لهذا المعلم بعد (يعرض التطبيق حالياً صور Wikimedia Commons تلقائياً).'
                  : 'لم تُرفع صورة غلاف مخصصة لهذه المحافظة بعد.'}
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {currentImages.map((url, index) => {
                  const isCover = index === 0;
                  return (
                    <div
                      key={url}
                      className="overflow-hidden rounded-xl border border-[#0F3D3E]/15 bg-white dark:border-[#C89B3C]/22 dark:bg-[#132529]"
                    >
                      <div className="relative aspect-[16/10] w-full bg-[#18292D]">
                        <img
                          src={url}
                          alt={`صورة ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {isCover && (
                          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-lg bg-[#0F3D3E]/90 px-2.5 py-1 text-[11px] font-bold text-[#E7C87B]">
                            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                            <span>صورة الغلاف</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 p-2.5">
                        {isLandmark && !isCover ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleSetCover(url)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#C89B3C]/40 bg-[#C89B3C]/12 px-3 py-1 text-xs font-semibold text-[#7B5B17] hover:bg-[#C89B3C]/22 disabled:opacity-60 dark:text-[#E7C87B]"
                          >
                            <Star className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>تعيين كغلاف</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-[#5C6A66] dark:text-[#9AA8A3]">
                            {isLandmark ? 'تظهر أولاً في البطاقة والمعرض' : 'غلاف المحافظة'}
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDeletePhoto(url)}
                          aria-label={`حذف الصورة ${index + 1}`}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-500/20 disabled:opacity-60 dark:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
