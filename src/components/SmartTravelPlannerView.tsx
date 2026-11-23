import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookmarkCheck,
  Check,
  Compass,
  Copy,
  Plus,
  Printer,
  Route,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  GeneratedTripPlan,
  Governorate,
  ItineraryEntry,
  Landmark,
  LandmarkCategory,
  SmartTripRequest,
  TravelBudgetTier,
  TravelPartyType,
  TransportPreference,
} from '../types/tourism';
import {
  addStopToDay,
  formatTripPlanTextSummary,
  generateSmartTripPlan,
  getBudgetLabelAr,
  getPartyLabelAr,
  getTransportLabelAr,
  removeStopFromPlan,
  reorderStopWithinDay,
} from '../utils/tripPlanner';
import { buildDynamicCuratedTrails } from '../data/trails';
import { CATEGORY_SHORT_LABELS } from '../utils/arabicSearch';
import { CuratedTrailsView } from './CuratedTrailsView';
import { ItineraryView } from './ItineraryView';

interface SmartTravelPlannerViewProps {
  initialTab?: 'smart' | 'trails' | 'saved';
  landmarks: Landmark[];
  governorates: Governorate[];
  entries: ItineraryEntry[];
  savedIds: Set<string>;
  onSelectLandmark: (landmark: Landmark) => void;
  onSaveMultipleStops: (landmarkIds: string[]) => void;
  onRemoveEntry: (landmarkId: string) => void;
  onUpdateNote: (landmarkId: string, note: string) => void;
  onMoveEntry: (landmarkId: string, direction: 'up' | 'down') => void;
  onClearAll: () => void;
  onExplore: () => void;
}

export const SmartTravelPlannerView: React.FC<SmartTravelPlannerViewProps> = ({
  initialTab = 'smart',
  landmarks,
  governorates,
  entries,
  savedIds,
  onSelectLandmark,
  onSaveMultipleStops,
  onRemoveEntry,
  onUpdateNote,
  onMoveEntry,
  onClearAll,
  onExplore,
}) => {
  const [activeTab, setActiveTab] = useState<'smart' | 'trails' | 'saved'>(initialTab);
  const curatedTrails = useMemo(
    () => buildDynamicCuratedTrails(landmarks),
    [landmarks]
  );
  const [request, setRequest] = useState<SmartTripRequest>({
    startGovernorateId: governorates[0]?.id ?? 'IQ-GOV-01',
    destinationGovernorateId: 'all',
    days: 3,
    interests: ['archaeological', 'religious', 'nature_tourism'],
    partyType: 'family',
    budget: 'moderate',
    transport: 'private_car',
  });

  const [plan, setPlan] = useState<GeneratedTripPlan>(() =>
    generateSmartTripPlan(
      {
        startGovernorateId: governorates[0]?.id ?? 'IQ-GOV-01',
        destinationGovernorateId: 'all',
        days: 3,
        interests: ['archaeological', 'religious', 'nature_tourism'],
        partyType: 'family',
        budget: 'moderate',
        transport: 'private_car',
      },
      landmarks,
      governorates
    )
  );
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [addStopTargetDay, setAddStopTargetDay] = useState<number>(1);
  const [selectedExtraLandmarkId, setSelectedExtraLandmarkId] = useState<string>('');

  const usedIdsInPlan = useMemo(
    () => new Set(plan.days.flatMap((d) => d.stops.map((s) => s.landmark.id))),
    [plan]
  );

  const availableToAdd = useMemo(
    () => landmarks.filter((l) => !usedIdsInPlan.has(l.id)).slice(0, 60),
    [landmarks, usedIdsInPlan]
  );

  const toggleInterest = (cat: LandmarkCategory) => {
    setRequest((prev) => {
      const exists = prev.interests.includes(cat);
      if (exists && prev.interests.length === 1) return prev;
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((c) => c !== cat)
          : [...prev.interests, cat],
      };
    });
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const generated = generateSmartTripPlan(request, landmarks, governorates);
    setPlan(generated);
    setSavedNotice(false);
  };

  const handleSavePlanOffline = () => {
    const ids = plan.days.flatMap((d) => d.stops.map((s) => s.landmark.id));
    onSaveMultipleStops(ids);
    setSavedNotice(true);
  };

  const handleCopySummary = async () => {
    const text = formatTripPlanTextSummary(plan);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      setCopiedSummary(false);
    }
  };

  const handleAddExtraStop = () => {
    if (!selectedExtraLandmarkId) return;
    const lm = landmarks.find((l) => l.id === selectedExtraLandmarkId);
    if (!lm) return;
    setPlan((prev) => addStopToDay(prev, addStopTargetDay, lm, governorates));
    setSelectedExtraLandmarkId('');
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header + Sub-tabs */}
      <div className="flex flex-col gap-4 border-b border-[#173F35]/12 pb-5 dark:border-[#C5A15A]/18 md:flex-row md:items-end md:justify-between no-print">
        <div>
          <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
            التخطيط الذكي للرحلات داخل العراق
          </p>
          <h1 className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-4xl">
            خطط رحلتك في أرض السواد
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="أقسام التخطيط للرحلة"
          className="inline-flex flex-wrap rounded-xl border border-[#173F35]/14 bg-white p-1 dark:border-[#C5A15A]/20 dark:bg-[#13352F]"
        >
          <button
            type="button"
            role="tab"
            data-testid="planner-tab-smart"
            aria-selected={activeTab === 'smart'}
            onClick={() => setActiveTab('smart')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === 'smart'
                ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                : 'text-[#4E5C58] dark:text-[#B4C0BC]'
            }`}
          >
            مخطط الرحلة الذكي
          </button>
          <button
            type="button"
            role="tab"
            data-testid="planner-tab-trails"
            aria-selected={activeTab === 'trails'}
            onClick={() => setActiveTab('trails')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === 'trails'
                ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                : 'text-[#4E5C58] dark:text-[#B4C0BC]'
            }`}
          >
            المسارات المقترحة
          </button>
          <button
            type="button"
            role="tab"
            data-testid="planner-tab-saved"
            aria-selected={activeTab === 'saved'}
            onClick={() => setActiveTab('saved')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors tabular-nums ${
              activeTab === 'saved'
                ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                : 'text-[#4E5C58] dark:text-[#B4C0BC]'
            }`}
          >
            مساري المحفوظ ({entries.length})
          </button>
        </div>
      </div>

      {activeTab === 'trails' && (
        <div className="mt-4">
          <CuratedTrailsView
            trails={curatedTrails}
            landmarks={landmarks}
            governorates={governorates}
            savedIds={savedIds}
            onSelectLandmark={onSelectLandmark}
            onSaveTrailToItinerary={onSaveMultipleStops}
          />
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="mt-4">
          <div className="mb-3 flex justify-end no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#173F35]/20 bg-white px-4 py-2 text-xs font-bold text-[#173F35] hover:bg-[#F8F6F0] dark:border-[#C5A15A]/25 dark:bg-[#13352F] dark:text-[#E7C87B]"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة / تصدير PDF</span>
            </button>
          </div>
          <ItineraryView
            entries={entries}
            landmarks={landmarks}
            onSelectLandmark={onSelectLandmark}
            onRemove={onRemoveEntry}
            onUpdateNote={onUpdateNote}
            onMove={onMoveEntry}
            onClearAll={onClearAll}
            onExploreLandmarks={onExplore}
          />
        </div>
      )}

      {activeTab === 'smart' && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Form Column */}
          <form
            onSubmit={handleGenerate}
            className="space-y-4 rounded-2xl border border-[#173F35]/14 bg-white p-5 dark:border-[#C5A15A]/20 dark:bg-[#13352F] lg:col-span-4 no-print"
          >
            <div>
              <h2 className="font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
                خصّص برنامج رحلتك
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
                يُنشئ البرنامج آلياً استناداً إلى قاعدة المعالم الحقيقية وحساب القرب
                الجغرافي (Haversine) دون تخمين لزمن الطرق المرورية.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#173F35] dark:text-[#E9DFC9]">
                محافظة الانطلاق
              </label>
              <select
                value={request.startGovernorateId}
                onChange={(e) =>
                  setRequest((p) => ({ ...p, startGovernorateId: e.target.value }))
                }
                className="min-h-[42px] w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-3 text-sm text-[#252B29] dark:border-[#C5A15A]/24 dark:bg-[#102F29] dark:text-[#F8F6F0]"
              >
                {governorates.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name_ar} ({g.region})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#173F35] dark:text-[#E9DFC9]">
                الوجهة المستهدفة
              </label>
              <select
                value={request.destinationGovernorateId}
                onChange={(e) =>
                  setRequest((p) => ({
                    ...p,
                    destinationGovernorateId: e.target.value,
                  }))
                }
                className="min-h-[42px] w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-3 text-sm text-[#252B29] dark:border-[#C5A15A]/24 dark:bg-[#102F29] dark:text-[#F8F6F0]"
              >
                <option value="all">رحلة متعددة المحافظات (الأقرب جغرافياً)</option>
                {governorates.map((g) => (
                  <option key={g.id} value={g.id}>
                    التركيز على محافظة {g.name_ar}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-bold text-[#173F35] dark:text-[#E9DFC9]">
                <span>عدد أيام الرحلة</span>
                <span className="tabular-nums text-[#8C6D2B] dark:text-[#E7C87B]">
                  {request.days} {request.days === 1 ? 'يوم' : 'أيام'}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={7}
                value={request.days}
                onChange={(e) =>
                  setRequest((p) => ({ ...p, days: Number(e.target.value) }))
                }
                className="w-full accent-[#173F35] dark:accent-[#C5A15A]"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-bold text-[#173F35] dark:text-[#E9DFC9]">
                اهتماماتك السياحية
              </span>
              <div className="flex flex-wrap gap-2">
                {(['archaeological', 'religious', 'nature_tourism'] as LandmarkCategory[]).map(
                  (cat) => {
                    const active = request.interests.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleInterest(cat)}
                        aria-pressed={active}
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                          active
                            ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                            : 'border border-[#173F35]/16 bg-[#F8F6F0] text-[#4E5C58] dark:bg-[#102F29] dark:text-[#B4C0BC]'
                        }`}
                      >
                        {CATEGORY_SHORT_LABELS[cat]}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#173F35] dark:text-[#E9DFC9]">
                  طبيعة الرفقة
                </label>
                <select
                  value={request.partyType}
                  onChange={(e) =>
                    setRequest((p) => ({
                      ...p,
                      partyType: e.target.value as TravelPartyType,
                    }))
                  }
                  className="min-h-[40px] w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-2.5 text-xs text-[#252B29] dark:border-[#C5A15A]/24 dark:bg-[#102F29] dark:text-[#F8F6F0]"
                >
                  <option value="individual">مسافر منفرد</option>
                  <option value="family">رحلة عائلية</option>
                  <option value="group">مجموعة سياحية</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#173F35] dark:text-[#E9DFC9]">
                  مستوى الميزانية
                </label>
                <select
                  value={request.budget}
                  onChange={(e) =>
                    setRequest((p) => ({
                      ...p,
                      budget: e.target.value as TravelBudgetTier,
                    }))
                  }
                  className="min-h-[40px] w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-2.5 text-xs text-[#252B29] dark:border-[#C5A15A]/24 dark:bg-[#102F29] dark:text-[#F8F6F0]"
                >
                  <option value="economy">اقتصادية</option>
                  <option value="moderate">متوسطة</option>
                  <option value="comfort">مريحة</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#173F35] dark:text-[#E9DFC9]">
                وسيلة التنقل
              </label>
              <select
                value={request.transport}
                onChange={(e) =>
                  setRequest((p) => ({
                    ...p,
                    transport: e.target.value as TransportPreference,
                  }))
                }
                className="min-h-[40px] w-full rounded-xl border border-[#173F35]/18 bg-[#F8F6F0] px-3 text-xs text-[#252B29] dark:border-[#C5A15A]/24 dark:bg-[#102F29] dark:text-[#F8F6F0]"
              >
                <option value="private_car">سيارة خاصة</option>
                <option value="public_intercity">نقل عام بين المحافظات</option>
                <option value="guided_tour">جولة منظمة مع مرشد</option>
              </select>
            </div>

            <button
              type="submit"
              data-testid="generate-trip-btn"
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#173F35] px-4 py-3 text-sm font-bold text-[#F8F6F0] hover:bg-[#1E5044] dark:bg-[#C5A15A] dark:text-[#102F29]"
            >
              <Sparkles className="h-4 w-4" />
              <span>إنشاء برنامج الرحلة</span>
            </button>
          </form>

          {/* Generated Schedule Column */}
          <div className="space-y-5 lg:col-span-8">
            <div className="rounded-2xl border border-[#C5A15A]/35 bg-white p-5 dark:bg-[#13352F]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-heritage text-2xl font-bold text-[#173F35] dark:text-[#E7C87B]">
                    {plan.title_ar}
                  </h2>
                  <p className="mt-1 text-xs text-[#54635F] dark:text-[#A9B8B3] tabular-nums">
                    {getPartyLabelAr(plan.request.partyType)} · الميزانية:{' '}
                    {getBudgetLabelAr(plan.request.budget)} ·{' '}
                    {getTransportLabelAr(plan.request.transport)} · {plan.totalStops} محطات ·
                    المسافة الجوية التقريبية {plan.totalStraightLineKm} كم
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 no-print">
                  <button
                    type="button"
                    data-testid="save-plan-offline-btn"
                    onClick={handleSavePlanOffline}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#173F35] px-3.5 py-2 text-xs font-bold text-[#F8F6F0] hover:bg-[#1E5044] dark:bg-[#C5A15A] dark:text-[#102F29]"
                  >
                    <BookmarkCheck className="h-3.5 w-3.5" />
                    <span>حفظ في مساري</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#173F35]/18 px-3 py-2 text-xs font-bold text-[#173F35] dark:border-[#C5A15A]/25 dark:text-[#E7C87B]"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>مشاركة النص</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#173F35]/18 px-3 py-2 text-xs font-bold text-[#173F35] dark:border-[#C5A15A]/25 dark:text-[#E7C87B]"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>PDF / طباعة</span>
                  </button>
                </div>
              </div>

              {savedNotice && (
                <p className="mt-3 rounded-xl bg-[#F8F6F0] px-3.5 py-2 text-xs font-bold text-[#173F35] dark:bg-[#102F29] dark:text-[#E7C87B]">
                  تم حفظ جميع محطات هذا البرنامج في «مساري المحفوظ» للعمل دون اتصال.
                </p>
              )}

              {/* Quick Add Extra Stop Control */}
              <div className="mt-4 flex flex-col gap-2 border-t border-[#173F35]/10 pt-4 sm:flex-row sm:items-center dark:border-[#C5A15A]/16 no-print">
                <select
                  value={addStopTargetDay}
                  onChange={(e) => setAddStopTargetDay(Number(e.target.value))}
                  aria-label="اختر اليوم لإضافة محطة"
                  className="min-h-[38px] rounded-xl border border-[#173F35]/16 bg-[#F8F6F0] px-3 text-xs font-semibold text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
                >
                  {plan.days.map((d) => (
                    <option key={d.dayNumber} value={d.dayNumber}>
                      إضافة إلى اليوم {d.dayNumber}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedExtraLandmarkId}
                  onChange={(e) => setSelectedExtraLandmarkId(e.target.value)}
                  aria-label="اختر معلماً إضافياً"
                  className="min-h-[38px] flex-1 rounded-xl border border-[#173F35]/16 bg-[#F8F6F0] px-3 text-xs text-[#252B29] dark:bg-[#102F29] dark:text-[#F8F6F0]"
                >
                  <option value="">اختر معلماً إضافياً لتخصيص البرنامج...</option>
                  {availableToAdd.map((lm) => (
                    <option key={lm.id} value={lm.id}>
                      {lm.name_ar} — {lm.governorate_ar}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddExtraStop}
                  disabled={!selectedExtraLandmarkId}
                  className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl bg-[#C5A15A] px-4 text-xs font-bold text-[#102F29] disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>

            {/* Day-by-Day Cards */}
            <div className="space-y-4">
              {plan.days.map((day) => (
                <article
                  key={day.dayNumber}
                  className="rounded-2xl border border-[#173F35]/12 bg-white p-5 dark:border-[#C5A15A]/18 dark:bg-[#13352F]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#173F35]/10 pb-3 dark:border-[#C5A15A]/15">
                    <h3 className="flex items-center gap-2 font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
                      <Route className="h-4 w-4 text-[#C5A15A]" />
                      <span>{day.title_ar}</span>
                    </h3>
                    <span className="text-xs font-semibold text-[#54635F] dark:text-[#A9B8B3] tabular-nums">
                      {day.stops.length} محطات · {day.totalStraightLineKm} كم (مسافة جوية
                      تقريبية)
                    </span>
                  </div>

                  {day.stops.length === 0 ? (
                    <p className="mt-3 text-xs text-[#54635F] dark:text-[#A9B8B3]">
                      يوم مخصص للراحة أو يمكنك إضافة محطة من القائمة أعلاه.
                    </p>
                  ) : (
                    <ol className="mt-3 space-y-2.5">
                      {day.stops.map((stop, idx) => (
                        <li
                          key={stop.landmark.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-[#173F35]/10 bg-[#F8F6F0] p-3.5 sm:flex-row sm:items-center dark:border-[#C5A15A]/14 dark:bg-[#102F29]"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-[#8C6D2B] dark:text-[#E7C87B] tabular-nums">
                              المحطة {idx + 1} · {stop.landmark.governorate_ar} ·{' '}
                              {CATEGORY_SHORT_LABELS[stop.landmark.category]}
                              {stop.distanceFromPreviousKm !== null
                                ? ` · ~${stop.distanceFromPreviousKm} كم عن السابقة`
                                : ''}
                            </p>
                            <button
                              type="button"
                              onClick={() => onSelectLandmark(stop.landmark)}
                              className="font-heritage mt-0.5 text-right text-lg font-bold text-[#173F35] hover:underline dark:text-[#F8F6F0]"
                            >
                              {stop.landmark.name_ar}
                            </button>
                            <p className="mt-0.5 text-xs text-[#54635F] dark:text-[#A9B8B3]">
                              {stop.note}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5 no-print">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() =>
                                setPlan((prev) =>
                                  reorderStopWithinDay(
                                    prev,
                                    day.dayNumber,
                                    idx,
                                    'up',
                                    governorates
                                  )
                                )
                              }
                              aria-label="تحريك للأعلى"
                              className="rounded-lg border border-[#173F35]/15 p-1.5 text-[#173F35] disabled:opacity-35 dark:text-[#E7C87B]"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === day.stops.length - 1}
                              onClick={() =>
                                setPlan((prev) =>
                                  reorderStopWithinDay(
                                    prev,
                                    day.dayNumber,
                                    idx,
                                    'down',
                                    governorates
                                  )
                                )
                              }
                              aria-label="تحريك للأسفل"
                              className="rounded-lg border border-[#173F35]/15 p-1.5 text-[#173F35] disabled:opacity-35 dark:text-[#E7C87B]"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPlan((prev) =>
                                  removeStopFromPlan(
                                    prev,
                                    day.dayNumber,
                                    stop.landmark.id,
                                    governorates
                                  )
                                )
                              }
                              aria-label={`حذف ${stop.landmark.name_ar}`}
                              className="rounded-lg border border-red-200 p-1.5 text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </article>
              ))}
            </div>

            <p className="flex items-start gap-2 rounded-xl border border-[#173F35]/12 bg-[#F8F6F0] px-4 py-3 text-xs text-[#54635F] dark:border-[#C5A15A]/18 dark:bg-[#13352F] dark:text-[#A9B8B3]">
              <Compass className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A15A]" />
              <span>
                ملاحظة شفافة: المسافات المعروضة هي مسافات جوية مستقيمة تقريبية (Haversine)
                لتقدير القرب الجغرافي فقط، وليست تقديراً لزمن القيادة أو حالة الطرق.
              </span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
