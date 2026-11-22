import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { Governorate, Landmark, LandmarkCategory } from '../types/tourism';
import { getLandmarkRichContent } from '../data/landmarkEnrichments';
import { CloudOperationResult } from '../hooks/useCloudData';
import {
  resolveGovernorateCenter,
  resolveLandmarkCoordinates,
} from '../utils/coordinates';

interface AdminLandmarkEditorModalProps {
  isOpen: boolean;
  landmark: Landmark | null; // null => Add brand-new landmark
  governorates: Governorate[];
  onClose: () => void;
  onSave: (landmark: Landmark) => Promise<CloudOperationResult>;
  onDelete?: (landmarkId: string) => Promise<CloudOperationResult>;
}

const CATEGORY_OPTIONS: { value: LandmarkCategory; label: string }[] = [
  { value: 'religious', label: 'المراقد والمواقع الدينية' },
  { value: 'archaeological', label: 'المواقع الأثرية والتاريخية' },
  { value: 'nature_tourism', label: 'الطبيعة والسياحة' },
];

export const AdminLandmarkEditorModal: React.FC<AdminLandmarkEditorModalProps> = ({
  isOpen,
  landmark,
  governorates,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(landmark);

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [governorateId, setGovernorateId] = useState(() => governorates[0]?.id || 'IQ-GOV-01');
  const [category, setCategory] = useState<LandmarkCategory>('religious');
  const [era, setEra] = useState('');
  const [lat, setLat] = useState('33.3152');
  const [lng, setLng] = useState('44.3661');
  const [unescoSite, setUnescoSite] = useState(false);
  const [descriptionAr, setDescriptionAr] = useState('');
  const [historicalAr, setHistoricalAr] = useState('');
  const [significanceAr, setSignificanceAr] = useState('');
  const [bestTime, setBestTime] = useState('');
  const [visitorTips, setVisitorTips] = useState('');
  const [etiquetteAr, setEtiquetteAr] = useState('');
  const [accessibilityAr, setAccessibilityAr] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [wikimediaQuery, setWikimediaQuery] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setConfirmDelete(false);

    if (landmark) {
      const rich = getLandmarkRichContent(landmark);
      const resolved = resolveLandmarkCoordinates(landmark, governorates);
      setNameAr(landmark.name_ar);
      setNameEn(landmark.name_en);
      setGovernorateId(landmark.governorate_id);
      setCategory(landmark.category);
      setEra(landmark.era);
      setLat(String(landmark.coordinates.lat ?? resolved.lat));
      setLng(String(landmark.coordinates.lng ?? resolved.lng));
      setUnescoSite(landmark.unesco_site);
      setDescriptionAr(landmark.description_ar);
      setHistoricalAr(rich.historical_architectural_ar);
      setSignificanceAr(rich.significance_ar);
      setBestTime(landmark.best_time_to_visit);
      setVisitorTips(landmark.visitor_tips);
      setEtiquetteAr(rich.dress_code_etiquette_ar);
      setAccessibilityAr(rich.accessibility_ar);
      setTagsText(landmark.tags.join('، '));
      setGoogleMapsUrl(landmark.google_maps_url);
      setWikimediaQuery(landmark.wikimedia_search_query);
    } else {
      const defaultGov = governorates[0];
      const defaultCenter = resolveGovernorateCenter(defaultGov);
      setNameAr('');
      setNameEn('');
      setGovernorateId(defaultGov?.id || 'IQ-GOV-01');
      setCategory('religious');
      setEra('');
      setLat(String(defaultCenter.lat));
      setLng(String(defaultCenter.lng));
      setUnescoSite(false);
      setDescriptionAr('');
      setHistoricalAr('');
      setSignificanceAr('');
      setBestTime('من أكتوبر إلى أبريل (الأشهر المعتدلة)');
      setVisitorTips('');
      setEtiquetteAr('');
      setAccessibilityAr('');
      setTagsText('');
      setGoogleMapsUrl('');
      setWikimediaQuery('');
    }
  }, [isOpen, landmark, governorates]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleGovernorateChange = (nextGovId: string) => {
    setGovernorateId(nextGovId);
    if (!isEditing) {
      const gov = governorates.find((g) => g.id === nextGovId);
      if (gov) {
        const center = resolveGovernorateCenter(gov);
        setLat(String(center.lat));
        setLng(String(center.lng));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!nameAr.trim()) {
      setFeedback({ type: 'error', text: 'يُرجى إدخال اسم المعلم باللغة العربية.' });
      return;
    }
    if (!descriptionAr.trim()) {
      setFeedback({ type: 'error', text: 'يُرجى إدخال وصف عربي مختصر للمعلم.' });
      return;
    }

    const parsedLat = Number.parseFloat(lat);
    const parsedLng = Number.parseFloat(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      setFeedback({
        type: 'error',
        text: 'يُرجى إدخال إحداثيات جغرافية صالحة (خط العرض وخط الطول).',
      });
      return;
    }

    const selectedGov = governorates.find((g) => g.id === governorateId);
    const selectedCategoryMeta = CATEGORY_OPTIONS.find((c) => c.value === category);

    const id =
      landmark?.id ||
      `custom-${governorateId}-${Date.now().toString(36)}`;

    const parsedTags = tagsText
      .split(/[,،]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const safeMapsUrl =
      googleMapsUrl.trim() ||
      `https://www.google.com/maps/search/?api=1&query=${parsedLat},${parsedLng}`;

    const updatedLandmark: Landmark = {
      id,
      name_ar: nameAr.trim(),
      name_en: nameEn.trim() || nameAr.trim(),
      governorate_id: governorateId,
      governorate_ar: selectedGov?.name_ar || landmark?.governorate_ar || 'العراق',
      category,
      category_ar: selectedCategoryMeta?.label || 'المواقع الأثرية والتاريخية',
      era: era.trim() || 'تاريخي',
      coordinates: { lat: parsedLat, lng: parsedLng },
      description_ar: descriptionAr.trim(),
      best_time_to_visit:
        bestTime.trim() || 'من أكتوبر إلى أبريل (الأشهر المعتدلة)',
      visitor_tips: visitorTips.trim() || 'يُرجى احترام قدسية وطابع المكان.',
      unesco_site: unescoSite,
      tags: parsedTags,
      wikimedia_search_query: wikimediaQuery.trim() || nameEn.trim() || nameAr.trim(),
      google_maps_url: safeMapsUrl,
      images: landmark?.images ?? [],
      historical_architectural_ar: historicalAr.trim() || undefined,
      significance_ar: significanceAr.trim() || undefined,
      dress_code_etiquette_ar: etiquetteAr.trim() || undefined,
      accessibility_ar: accessibilityAr.trim() || undefined,
    };

    setIsSaving(true);
    const res = await onSave(updatedLandmark);
    setIsSaving(false);

    if (!res.ok) {
      setFeedback({
        type: 'error',
        text: res.message || 'تعذر حفظ التعديلات في السحابة.',
      });
      return;
    }

    setFeedback({
      type: 'success',
      text: res.message || 'تم الحفظ بنجاح.',
    });
    window.setTimeout(() => onClose(), 700);
  };

  const handleDelete = async () => {
    if (!landmark || !onDelete) return;
    setIsSaving(true);
    const res = await onDelete(landmark.id);
    setIsSaving(false);
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.message || 'تعذر حذف المعلم.' });
      return;
    }
    onClose();
  };

  const inputClass =
    'mt-1.5 w-full rounded-xl border border-[#0F3D3E]/18 bg-white px-3.5 py-2.5 text-sm text-[#1A2421] focus:border-[#0F3D3E] focus:outline-none dark:border-[#C89B3C]/24 dark:bg-[#132529] dark:text-[#F1ECE2] dark:focus:border-[#C89B3C]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="landmark-editor-title"
      data-testid="admin-landmark-editor-modal"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0D1B1E]/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-[#C89B3C]/30 bg-[#F9F6F0] text-[#1A2421] shadow-2xl dark:bg-[#0D1B1E] dark:text-[#F1ECE2] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#0F3D3E]/12 px-5 py-4 dark:border-[#C89B3C]/18">
          <div>
            <h2
              id="landmark-editor-title"
              className="font-heritage text-2xl font-bold text-[#0F3D3E] dark:text-[#F4EFE6]"
            >
              {isEditing ? `تعديل المعلم: ${landmark?.name_ar}` : 'إضافة معلم جديد إلى السحابة'}
            </h2>
            <p className="text-xs text-[#5C6A66] dark:text-[#9AA8A3]">
              تظهر جميع التغييرات مباشرة لكافة زوار «أرض السواد»
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="إغلاق محرر المعلم"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#0F3D3E]/15 text-[#1A2421] hover:bg-[#0F3D3E]/8 dark:border-[#C89B3C]/25 dark:text-[#F1ECE2]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
            {feedback && (
              <div
                role="status"
                className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
                  feedback.type === 'success'
                    ? 'border-emerald-500/35 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-red-500/35 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  اسم المعلم (بالعربية) *
                </label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  الاسم بالإنجليزية
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className={`${inputClass} text-right`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  المحافظة
                </label>
                <select
                  value={governorateId}
                  onChange={(e) => handleGovernorateChange(e.target.value)}
                  className={inputClass}
                >
                  {governorates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name_ar} — {g.region}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  التصنيف
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LandmarkCategory)}
                  className={inputClass}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  الحقبة التاريخية
                </label>
                <input
                  type="text"
                  value={era}
                  onChange={(e) => setEra(e.target.value)}
                  placeholder="مثال: العصر العباسي / الألف الثالث قبل الميلاد"
                  className={inputClass}
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  <input
                    type="checkbox"
                    checked={unescoSite}
                    onChange={(e) => setUnescoSite(e.target.checked)}
                    className="h-4.5 w-4.5 accent-[#C89B3C]"
                  />
                  <span>موقع تراث عالمي مدرج في اليونسكو (UNESCO)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                الوصف العربي المختصر (يظهر في البطاقة والدليل الصوتي) *
              </label>
              <textarea
                rows={3}
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                نبذة تاريخية ومعمارية مفصّلة
              </label>
              <textarea
                rows={3}
                value={historicalAr}
                onChange={(e) => setHistoricalAr(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                الأهمية الدينية والحضارية
              </label>
              <textarea
                rows={3}
                value={significanceAr}
                onChange={(e) => setSignificanceAr(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  أفضل وقت للزيارة
                </label>
                <input
                  type="text"
                  value={bestTime}
                  onChange={(e) => setBestTime(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  الوسوم (افصل بينها بفاصلة)
                </label>
                <input
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="آثار، بابل، يونسكو"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                نصائح وإرشادات الزائر
              </label>
              <textarea
                rows={2}
                value={visitorTips}
                onChange={(e) => setVisitorTips(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  آداب الزيارة واللباس
                </label>
                <textarea
                  rows={2}
                  value={etiquetteAr}
                  onChange={(e) => setEtiquetteAr(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  الوصول والتسهيلات
                </label>
                <textarea
                  rows={2}
                  value={accessibilityAr}
                  onChange={(e) => setAccessibilityAr(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  خط العرض (Latitude)
                </label>
                <input
                  type="number"
                  step="any"
                  dir="ltr"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className={`${inputClass} text-right`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  خط الطول (Longitude)
                </label>
                <input
                  type="number"
                  step="any"
                  dir="ltr"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className={`${inputClass} text-right`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  رابط خرائط جوجل
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://www.google.com/maps/..."
                  className={`${inputClass} text-right`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F3D3E] dark:text-[#E7C87B]">
                  عبارة البحث عن صور احتياطية (Wikimedia)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={wikimediaQuery}
                  onChange={(e) => setWikimediaQuery(e.target.value)}
                  className={`${inputClass} text-right`}
                />
              </div>
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#0F3D3E]/12 bg-[#F4EFE4] px-5 py-3.5 dark:border-[#C89B3C]/18 dark:bg-[#102125]">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0F3D3E] px-5 py-2.5 text-sm font-semibold text-[#F9F6F0] hover:bg-[#144F50] disabled:opacity-65 dark:bg-[#C89B3C] dark:text-[#0D1B1E] dark:hover:bg-[#D7AC4D]"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isEditing ? 'حفظ التعديلات في السحابة' : 'إضافة المعلم ونشره'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="inline-flex min-h-[44px] items-center rounded-xl border border-[#0F3D3E]/18 bg-white px-4 py-2 text-sm font-semibold text-[#1A2421] hover:bg-[#F9F6F0] dark:border-[#C89B3C]/24 dark:bg-[#132529] dark:text-[#F1ECE2]"
              >
                إلغاء
              </button>
            </div>

            {isEditing && onDelete && (
              <div>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                      تأكيد الحذف؟
                    </span>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleDelete}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                    >
                      نعم، احذف
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-[#0F3D3E]/20 px-2.5 py-1.5 text-xs font-semibold"
                    >
                      تراجع
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-500/20 dark:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>حذف المعلم</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
