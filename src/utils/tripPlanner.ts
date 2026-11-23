import {
  GeneratedTripPlan,
  Governorate,
  Landmark,
  LandmarkCategory,
  SmartTripRequest,
  TripDayPlan,
  TripStopPlan,
} from '../types/tourism';
import { resolveGovernorateCenter, resolveLandmarkCoordinates } from './coordinates';
import { haversineDistanceKm } from './geo';

const CATEGORY_DEFAULT_HOURS: Record<LandmarkCategory, number> = {
  religious: 2,
  archaeological: 2.5,
  nature_tourism: 3,
};

const TRANSPORT_LABELS_AR: Record<SmartTripRequest['transport'], string> = {
  private_car: 'سيارة خاصة',
  public_intercity: 'نقل عام بين المحافظات',
  guided_tour: 'جولة منظمة مع مرشد',
};

const PARTY_LABELS_AR: Record<SmartTripRequest['partyType'], string> = {
  individual: 'مسافر منفرد',
  family: 'رحلة عائلية',
  group: 'مجموعة سياحية',
};

const BUDGET_LABELS_AR: Record<SmartTripRequest['budget'], string> = {
  economy: 'اقتصادية',
  moderate: 'متوسطة',
  comfort: 'مريحة',
};

export function getTransportLabelAr(transport: SmartTripRequest['transport']): string {
  return TRANSPORT_LABELS_AR[transport];
}

export function getPartyLabelAr(partyType: SmartTripRequest['partyType']): string {
  return PARTY_LABELS_AR[partyType];
}

export function getBudgetLabelAr(budget: SmartTripRequest['budget']): string {
  return BUDGET_LABELS_AR[budget];
}

/**
 * Recalculates straight-line Haversine distances for every stop in a generated plan.
 * Never fabricates road travel durations.
 */
export function recalculateTripDistances(
  days: TripDayPlan[],
  governorates: Governorate[]
): { days: TripDayPlan[]; totalStops: number; totalStraightLineKm: number } {
  let totalStops = 0;
  let totalStraightLineKm = 0;

  const updatedDays = days.map((day, idx) => {
    let dayKm = 0;
    const updatedStops: TripStopPlan[] = day.stops.map((stop, stopIdx) => {
      totalStops += 1;
      if (stopIdx === 0) {
        return { ...stop, distanceFromPreviousKm: null };
      }
      const prevCoords = resolveLandmarkCoordinates(
        day.stops[stopIdx - 1].landmark,
        governorates
      );
      const currCoords = resolveLandmarkCoordinates(stop.landmark, governorates);
      const dist = Math.round(haversineDistanceKm(prevCoords, currCoords));
      dayKm += dist;
      return {
        ...stop,
        distanceFromPreviousKm: dist,
      };
    });

    totalStraightLineKm += dayKm;
    return {
      ...day,
      dayNumber: idx + 1,
      stops: updatedStops,
      totalStraightLineKm: dayKm,
    };
  });

  return { days: updatedDays, totalStops, totalStraightLineKm };
}

/**
 * Rule-based multi-day travel planner using real database landmarks and
 * Haversine geographic proximity (nearest-neighbor ordering).
 */
export function generateSmartTripPlan(
  request: SmartTripRequest,
  landmarks: Landmark[],
  governorates: Governorate[]
): GeneratedTripPlan {
  const safeDays = Math.min(10, Math.max(1, Math.round(request.days || 1)));
  const activeInterests: LandmarkCategory[] =
    request.interests.length > 0
      ? request.interests
      : ['archaeological', 'religious', 'nature_tourism'];

  const startGov =
    governorates.find((g) => g.id === request.startGovernorateId) ??
    governorates[0];
  const destGov =
    request.destinationGovernorateId !== 'all'
      ? governorates.find((g) => g.id === request.destinationGovernorateId)
      : undefined;

  const stopsPerDay =
    request.partyType === 'family' ? 3 : request.transport === 'public_intercity' ? 2 : 3;
  const maxTotalStops = safeDays * stopsPerDay;

  // Filter published landmarks matching interests and destination preference
  const published = landmarks.filter((l) => l.publication_status !== 'draft');
  let candidates = published.filter((l) => activeInterests.includes(l.category));

  if (destGov) {
    const inDestination = candidates.filter((l) => l.governorate_id === destGov.id);
    if (inDestination.length >= Math.min(3, maxTotalStops)) {
      candidates = inDestination;
    } else {
      // Supplement with nearby governorates if target governorate has fewer stops than requested days
      const destCenter = resolveGovernorateCenter(destGov);
      const sortedOthers = candidates
        .filter((l) => l.governorate_id !== destGov.id)
        .sort((a, b) => {
          const da = haversineDistanceKm(
            destCenter,
            resolveLandmarkCoordinates(a, governorates)
          );
          const db = haversineDistanceKm(
            destCenter,
            resolveLandmarkCoordinates(b, governorates)
          );
          return da - db;
        });
      candidates = [...inDestination, ...sortedOthers];
    }
  }

  if (candidates.length === 0) {
    candidates = published;
  }

  // Nearest-neighbor geographic ordering starting from destination (or starting governorate)
  const anchorCenter = resolveGovernorateCenter(destGov ?? startGov);
  const remaining = [...candidates];
  const ordered: Landmark[] = [];
  let currentPoint = anchorCenter;

  // Prioritize UNESCO & culturally iconic sites softly via small distance discount
  while (remaining.length > 0 && ordered.length < maxTotalStops) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const coords = resolveLandmarkCoordinates(candidate, governorates);
      const dist = haversineDistanceKm(currentPoint, coords);
      const unescoBonus = candidate.unesco_site ? 15 : 0;
      const score = Math.max(0, dist - unescoBonus);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const picked = remaining.splice(bestIndex, 1)[0];
    ordered.push(picked);
    currentPoint = resolveLandmarkCoordinates(picked, governorates);
  }

  // Distribute ordered stops across days
  const rawDays: TripDayPlan[] = [];
  for (let d = 0; d < safeDays; d += 1) {
    const startIdx = d * stopsPerDay;
    const dayLandmarks = ordered.slice(startIdx, startIdx + stopsPerDay);
    if (dayLandmarks.length === 0 && d > 0) {
      continue;
    }

    const govNames = Array.from(
      new Set(dayLandmarks.map((l) => l.governorate_ar).filter(Boolean))
    );
    const title_ar =
      govNames.length > 0
        ? `اليوم ${d + 1}: ${govNames.slice(0, 2).join(' و')}`
        : `اليوم ${d + 1}: جولة استكشافية`;

    rawDays.push({
      dayNumber: d + 1,
      title_ar,
      stops: dayLandmarks.map((landmark) => ({
        landmark,
        estimatedDurationHours: CATEGORY_DEFAULT_HOURS[landmark.category] ?? 2,
        distanceFromPreviousKm: null,
        note: landmark.best_time_to_visit || 'يُنصح بالتخطيط للزيارة صباحاً',
      })),
      totalStraightLineKm: 0,
    });
  }

  const computed = recalculateTripDistances(rawDays, governorates);
  const titleTarget = destGov ? destGov.name_ar : `من ${startGov?.name_ar ?? 'بغداد'}`;

  return {
    id: `plan-${Date.now()}`,
    title_ar: `برنامج رحلة (${computed.days.length} ${computed.days.length === 1 ? 'يوم' : 'أيام'}) — ${titleTarget}`,
    createdAt: new Date().toISOString(),
    request: { ...request, days: safeDays },
    days: computed.days,
    totalStops: computed.totalStops,
    totalStraightLineKm: computed.totalStraightLineKm,
  };
}

export function removeStopFromPlan(
  plan: GeneratedTripPlan,
  dayNumber: number,
  landmarkId: string,
  governorates: Governorate[]
): GeneratedTripPlan {
  const nextDays = plan.days.map((day) =>
    day.dayNumber === dayNumber
      ? { ...day, stops: day.stops.filter((s) => s.landmark.id !== landmarkId) }
      : day
  );
  const computed = recalculateTripDistances(nextDays, governorates);
  return {
    ...plan,
    days: computed.days,
    totalStops: computed.totalStops,
    totalStraightLineKm: computed.totalStraightLineKm,
  };
}

export function reorderStopWithinDay(
  plan: GeneratedTripPlan,
  dayNumber: number,
  stopIndex: number,
  direction: 'up' | 'down',
  governorates: Governorate[]
): GeneratedTripPlan {
  const targetIndex = direction === 'up' ? stopIndex - 1 : stopIndex + 1;
  const nextDays = plan.days.map((day) => {
    if (day.dayNumber !== dayNumber) return day;
    if (targetIndex < 0 || targetIndex >= day.stops.length) return day;
    const nextStops = [...day.stops];
    const [moved] = nextStops.splice(stopIndex, 1);
    nextStops.splice(targetIndex, 0, moved);
    return { ...day, stops: nextStops };
  });
  const computed = recalculateTripDistances(nextDays, governorates);
  return {
    ...plan,
    days: computed.days,
    totalStops: computed.totalStops,
    totalStraightLineKm: computed.totalStraightLineKm,
  };
}

export function addStopToDay(
  plan: GeneratedTripPlan,
  dayNumber: number,
  landmark: Landmark,
  governorates: Governorate[]
): GeneratedTripPlan {
  const exists = plan.days.some((d) =>
    d.stops.some((s) => s.landmark.id === landmark.id)
  );
  if (exists) return plan;

  const nextDays = plan.days.map((day) =>
    day.dayNumber === dayNumber
      ? {
          ...day,
          stops: [
            ...day.stops,
            {
              landmark,
              estimatedDurationHours: CATEGORY_DEFAULT_HOURS[landmark.category] ?? 2,
              distanceFromPreviousKm: null,
              note: landmark.best_time_to_visit || 'محطة مضافة يدوياً',
            },
          ],
        }
      : day
  );
  const computed = recalculateTripDistances(nextDays, governorates);
  return {
    ...plan,
    days: computed.days,
    totalStops: computed.totalStops,
    totalStraightLineKm: computed.totalStraightLineKm,
  };
}

export function formatTripPlanTextSummary(plan: GeneratedTripPlan): string {
  const lines: string[] = [
    `أرض السواد — ${plan.title_ar}`,
    `نوع الرحلة: ${getPartyLabelAr(plan.request.partyType)} | الميزانية: ${getBudgetLabelAr(plan.request.budget)} | التنقل: ${getTransportLabelAr(plan.request.transport)}`,
    `إجمالي المحطات: ${plan.totalStops} | المسافة الجوية التقريبية: ${plan.totalStraightLineKm} كم`,
    '',
  ];

  for (const day of plan.days) {
    lines.push(`— ${day.title_ar} (${day.totalStraightLineKm} كم مسافة جوية تقريبية):`);
    day.stops.forEach((stop, index) => {
      const distText =
        stop.distanceFromPreviousKm !== null
          ? ` (حوالي ${stop.distanceFromPreviousKm} كم عن المحطة السابقة)`
          : '';
      lines.push(
        `  ${index + 1}. ${stop.landmark.name_ar} — ${stop.landmark.governorate_ar}${distText}`
      );
    });
    lines.push('');
  }

  lines.push(
    'ملاحظة: المسافات محسوبة كمسافة جوية تقريبية (Haversine) دون تقديرات مرورية؛ يُنصح بمراجعة خرائط الطريق قبل الانطلاق.'
  );
  return lines.join('\n');
}
