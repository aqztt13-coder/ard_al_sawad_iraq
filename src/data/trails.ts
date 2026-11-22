import { CuratedTrail, Landmark, LandmarkCategory } from '../types/tourism';
import { normalizeArabic } from '../utils/arabicSearch';

interface TrailStopMatcher {
  keywords: string[];
  governorateKeywords?: string[];
  category?: LandmarkCategory;
}

interface TrailBlueprint {
  id: string;
  title_ar: string;
  subtitle_ar: string;
  description_ar: string;
  duration_ar: string;
  theme_accent: 'gold' | 'lapis' | 'emerald';
  stopMatchers: TrailStopMatcher[];
}

const TRAIL_BLUEPRINTS: TrailBlueprint[] = [
  {
    id: 'sacred-shrines-trail',
    title_ar: 'مسار العتبات والمراقد المقدسة',
    subtitle_ar: 'النجف الأشرف ← كربلاء المقدسة ← الكاظمية ← سامراء',
    description_ar:
      'رحلة روحية مباركة تربط العتبات والمراقد المقدسة الكبرى في العراق، تبدأ من مرقد أمير المؤمنين في النجف الأشرف، مروراً بكربلاء المقدسة والكاظمية في بغداد، وتُختتم في رحاب سامراء التاريخية.',
    duration_ar: '3 – 4 أيام',
    theme_accent: 'gold',
    stopMatchers: [
      {
        keywords: ['الامام علي', 'العتبه العلويه', 'imam ali'],
        governorateKeywords: ['النجف', 'najaf'],
        category: 'religious',
      },
      {
        keywords: ['الامام الحسين', 'العتبه الحسينيه', 'imam husayn', 'imam hussein'],
        governorateKeywords: ['كربلاء', 'karbala'],
        category: 'religious',
      },
      {
        keywords: ['الامام الكاظم', 'العتبه الكاظميه', 'kadhimiya', 'al-kadhim'],
        governorateKeywords: ['بغداد', 'baghdad'],
        category: 'religious',
      },
      {
        keywords: ['العتبه العسكريه', 'الجامع الكبير في سامراء', 'سامراء', 'samarra'],
        governorateKeywords: ['صلاح الدين', 'salah'],
      },
    ],
  },
  {
    id: 'dawn-of-civilization-trail',
    title_ar: 'مسار فجر الحضارة (سومر وبابل)',
    subtitle_ar: 'أور ← الوركاء ← نفر ← بابل',
    description_ar:
      'رحلة عبر آلاف السنين في قلب وادي الرافدين، تتبع فيها نشأة أولى المدن والكتابة المسمارية من زقورة أور والوركاء في الجنوب، صعوداً عبر نيبور حتى بوابة عشتار وعاصمة بابل التاريخية.',
    duration_ar: '3 – 4 أيام',
    theme_accent: 'lapis',
    stopMatchers: [
      {
        keywords: ['زقوره اور', 'مدينه اور', 'ziggurat of ur'],
        governorateKeywords: ['ذي قار', 'dhi qar'],
        category: 'archaeological',
      },
      {
        keywords: ['مدينه الوركاء', 'الوركاء', 'uruk'],
        governorateKeywords: ['المثني', 'muthanna'],
        category: 'archaeological',
      },
      {
        keywords: ['مدينه نفر', 'نيبور', 'nippur'],
        governorateKeywords: ['القادسيه', 'qadisiyyah'],
        category: 'archaeological',
      },
      {
        keywords: ['مدينه بابل الاثريه', 'بابل الاثريه', 'babylon'],
        governorateKeywords: ['بابل', 'babil', 'babylon'],
        category: 'archaeological',
      },
    ],
  },
  {
    id: 'nature-resorts-trail',
    title_ar: 'مسار الطبيعة والمصايف',
    subtitle_ar: 'أربيل ← دهوك ← السليمانية',
    description_ar:
      'جولة منعشة في ربوع إقليم كردستان الجبلية، تجمع بين شلالات كلي علي بك في أربيل، ومدينة العمادية الشاهقة في دهوك، ثم بحيرة دوكان ووادي أحمد آوا في السليمانية.',
    duration_ar: '4 – 5 أيام',
    theme_accent: 'emerald',
    stopMatchers: [
      {
        keywords: ['كلي علي بك', 'بيخال', 'gali ali beg'],
        governorateKeywords: ['اربيل', 'erbil'],
        category: 'nature_tourism',
      },
      {
        keywords: ['العماديه', 'سولاف', 'amadiya'],
        governorateKeywords: ['دهوك', 'duhok'],
      },
      {
        keywords: ['بحيره دوكان', 'دوكان', 'dukan'],
        governorateKeywords: ['السليمانيه', 'sulaymaniyah'],
        category: 'nature_tourism',
      },
      {
        keywords: ['احمد اوا', 'احمد اوي', 'ahmad awa'],
        governorateKeywords: ['السليمانيه', 'sulaymaniyah'],
        category: 'nature_tourism',
      },
    ],
  },
];

function findMatchingLandmark(
  landmarks: Landmark[],
  matcher: TrailStopMatcher,
  usedIds: Set<string>
): Landmark | undefined {
  const normalizedKeywords = matcher.keywords.map((k) => normalizeArabic(k));
  const normalizedGovs = (matcher.governorateKeywords ?? []).map((g) =>
    normalizeArabic(g)
  );

  // Pass 1: Match keyword + governorate
  for (const keyword of normalizedKeywords) {
    const hit = landmarks.find((lm) => {
      if (usedIds.has(lm.id)) return false;
      const text = normalizeArabic(`${lm.name_ar} ${lm.name_en}`);
      if (!text.includes(keyword)) return false;
      if (normalizedGovs.length === 0) return true;
      const govText = normalizeArabic(`${lm.governorate_ar} ${lm.governorate_id}`);
      return normalizedGovs.some((g) => govText.includes(g));
    });
    if (hit) return hit;
  }

  // Pass 2: Match keyword regardless of governorate
  for (const keyword of normalizedKeywords) {
    const hit = landmarks.find((lm) => {
      if (usedIds.has(lm.id)) return false;
      const text = normalizeArabic(`${lm.name_ar} ${lm.name_en}`);
      return text.includes(keyword);
    });
    if (hit) return hit;
  }

  // Pass 3: Fallback to any matching governorate + category landmark
  if (normalizedGovs.length > 0) {
    return landmarks.find((lm) => {
      if (usedIds.has(lm.id)) return false;
      const govText = normalizeArabic(`${lm.governorate_ar} ${lm.governorate_id}`);
      const govMatch = normalizedGovs.some((g) => govText.includes(g));
      if (!govMatch) return false;
      return !matcher.category || lm.category === matcher.category;
    });
  }

  return undefined;
}

/**
 * Dynamically builds the curated trails by resolving real landmarks from the active
 * `landmarks` array rather than relying on hardcoded legacy IDs.
 */
export function buildDynamicCuratedTrails(landmarks: Landmark[]): CuratedTrail[] {
  return TRAIL_BLUEPRINTS.map((blueprint) => {
    const usedIds = new Set<string>();
    const resolvedIds: string[] = [];

    for (const matcher of blueprint.stopMatchers) {
      const match = findMatchingLandmark(landmarks, matcher, usedIds);
      if (match) {
        usedIds.add(match.id);
        resolvedIds.push(match.id);
      }
    }

    return {
      id: blueprint.id,
      title_ar: blueprint.title_ar,
      subtitle_ar: blueprint.subtitle_ar,
      description_ar: blueprint.description_ar,
      duration_ar: blueprint.duration_ar,
      theme_accent: blueprint.theme_accent,
      landmark_ids: resolvedIds,
    };
  }).filter((trail) => trail.landmark_ids.length > 0);
}
