/* ============================================================
 * Cultural Games Pure Logic Engine
 * 1. Sumero-Akkadian Cuneiform Phonetic Transliteration
 * 2. Royal Game of Ur (20-square ancient Mesopotamian board game)
 * 3. Iraqi Civilizations & Heritage Knowledge Quiz
 * ============================================================ */

export interface CuneiformToken {
  source: string;
  syllable: string;
  sign: string;
}

export interface CuneiformTransliterationResult {
  cleanedInput: string;
  cuneiformText: string;
  tokens: CuneiformToken[];
  disclaimerAr: string;
}

const SYLLABLE_TO_CUNEIFORM: Record<string, string> = {
  a: '𒀀',
  e: '𒂊',
  i: '𒄿',
  u: '𒌋',
  ba: '𒁀',
  bi: '𒁉',
  bu: '𒁍',
  da: '𒁕',
  di: '𒁲',
  du: '𒁺',
  ga: '𒂵',
  gi: '𒄀',
  gu: '𒄖',
  ha: '𒄩',
  hi: '𒄭',
  hu: '𒄷',
  ka: '𒅗',
  ki: '𒆠',
  ku: '𒆪',
  la: '𒆷',
  li: '𒇷',
  lu: '𒇻',
  ma: '𒈠',
  mi: '𒈪',
  mu: '𒈬',
  na: '𒈾',
  ni: '𒉌',
  nu: '𒉡',
  pa: '𒉺',
  pi: '𒉿',
  pu: '𒁍',
  qa: '𒋡',
  ra: '𒊏',
  ri: '𒊑',
  ru: '𒊒',
  sa: '𒊓',
  si: '𒋛',
  su: '𒋢',
  sha: '𒊭',
  shi: '𒅆',
  shu: '𒋗',
  ta: '𒋫',
  ti: '𒋾',
  tu: '𒌅',
  wa: '𒉿',
  ya: '𒅀',
  za: '𒍝',
  zi: '𒍣',
  zu: '𒍪',
};

const ARABIC_CHAR_TO_PHONETIC: Record<string, { syllable: string; sign: string }> = {
  ا: { syllable: 'a', sign: '𒀀' },
  أ: { syllable: 'a', sign: '𒀀' },
  إ: { syllable: 'i', sign: '𒄿' },
  آ: { syllable: 'a', sign: '𒀀' },
  ء: { syllable: 'a', sign: '𒀀' },
  ب: { syllable: 'ba', sign: '𒁀' },
  ت: { syllable: 'ta', sign: '𒋫' },
  ة: { syllable: 'ta', sign: '𒋫' },
  ث: { syllable: 'sa', sign: '𒊓' },
  ج: { syllable: 'ga', sign: '𒂵' },
  ح: { syllable: 'ha', sign: '𒄩' },
  خ: { syllable: 'hu', sign: '𒄷' },
  د: { syllable: 'da', sign: '𒁕' },
  ذ: { syllable: 'za', sign: '𒍝' },
  ر: { syllable: 'ra', sign: '𒊏' },
  ز: { syllable: 'zi', sign: '𒍣' },
  س: { syllable: 'sa', sign: '𒊓' },
  ش: { syllable: 'sha', sign: '𒊭' },
  ص: { syllable: 'su', sign: '𒋢' },
  ض: { syllable: 'du', sign: '𒁺' },
  ط: { syllable: 'ti', sign: '𒋾' },
  ظ: { syllable: 'zu', sign: '𒍪' },
  ع: { syllable: 'e', sign: '𒂊' },
  غ: { syllable: 'gu', sign: '𒄖' },
  ف: { syllable: 'pa', sign: '𒉺' },
  ق: { syllable: 'qa', sign: '𒋡' },
  ك: { syllable: 'ka', sign: '𒅗' },
  ل: { syllable: 'la', sign: '𒆷' },
  م: { syllable: 'ma', sign: '𒈠' },
  ن: { syllable: 'na', sign: '𒈾' },
  ه: { syllable: 'hi', sign: '𒄭' },
  و: { syllable: 'u', sign: '𒌋' },
  ؤ: { syllable: 'u', sign: '𒌋' },
  ي: { syllable: 'i', sign: '𒄿' },
  ى: { syllable: 'a', sign: '𒀀' },
  ئ: { syllable: 'i', sign: '𒄿' },
};

const LATIN_CONSONANT_FALLBACK: Record<string, { syllable: string; sign: string }> = {
  b: { syllable: 'ba', sign: '𒁀' },
  c: { syllable: 'ka', sign: '𒅗' },
  d: { syllable: 'da', sign: '𒁕' },
  f: { syllable: 'pa', sign: '𒉺' },
  g: { syllable: 'ga', sign: '𒂵' },
  h: { syllable: 'ha', sign: '𒄩' },
  j: { syllable: 'ga', sign: '𒂵' },
  k: { syllable: 'ka', sign: '𒅗' },
  l: { syllable: 'la', sign: '𒆷' },
  m: { syllable: 'ma', sign: '𒈠' },
  n: { syllable: 'na', sign: '𒈾' },
  p: { syllable: 'pa', sign: '𒉺' },
  q: { syllable: 'qa', sign: '𒋡' },
  r: { syllable: 'ra', sign: '𒊏' },
  s: { syllable: 'sa', sign: '𒊓' },
  t: { syllable: 'ta', sign: '𒋫' },
  v: { syllable: 'pa', sign: '𒉺' },
  w: { syllable: 'wa', sign: '𒉿' },
  x: { syllable: 'sa', sign: '𒊓' },
  y: { syllable: 'ya', sign: '𒅀' },
  z: { syllable: 'za', sign: '𒍝' },
  a: { syllable: 'a', sign: '𒀀' },
  e: { syllable: 'e', sign: '𒂊' },
  i: { syllable: 'i', sign: '𒄿' },
  o: { syllable: 'u', sign: '𒌋' },
  u: { syllable: 'u', sign: '𒌋' },
};

export const CUNEIFORM_DISCLAIMER_AR =
  'هذا التحويل الصوتي تقريبي تعليمي يستند إلى مقاطع مسمارية سومرية-أكدية موثقة؛ لأن الكتابة المسمارية التاريخية كانت مقطعية ورمزية ولا تعتمد أبجدية حرفية حديثة.';

/**
 * Transliterates Arabic or Latin names into Sumero-Akkadian Unicode Cuneiform signs.
 */
export function transliterateToCuneiform(input: string): CuneiformTransliterationResult {
  const cleaned = input
    .trim()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .slice(0, 48);

  if (!cleaned) {
    return {
      cleanedInput: '',
      cuneiformText: '',
      tokens: [],
      disclaimerAr: CUNEIFORM_DISCLAIMER_AR,
    };
  }

  const tokens: CuneiformToken[] = [];
  const lower = cleaned.toLowerCase();
  let i = 0;

  while (i < lower.length) {
    const ch = lower[i];
    if (ch === ' ') {
      tokens.push({ source: ' ', syllable: '·', sign: '  ' });
      i += 1;
      continue;
    }

    // Arabic mapping with optional following vowel letter (ا/و/ي)
    if (ARABIC_CHAR_TO_PHONETIC[ch]) {
      const base = ARABIC_CHAR_TO_PHONETIC[ch];
      const next = lower[i + 1];
      const consonantStem = base.syllable.replace(/[aeiou]$/, '');
      if (consonantStem && (next === 'و' || next === 'ي')) {
        const vowel = next === 'و' ? 'u' : 'i';
        const combined = `${consonantStem}${vowel}`;
        if (SYLLABLE_TO_CUNEIFORM[combined]) {
          tokens.push({
            source: cleaned.slice(i, i + 2),
            syllable: combined,
            sign: SYLLABLE_TO_CUNEIFORM[combined],
          });
          i += 2;
          continue;
        }
      }
      tokens.push({ source: cleaned[i], syllable: base.syllable, sign: base.sign });
      i += 1;
      continue;
    }

    // Latin digraphs (sha/shi/shu) and CV syllables
    const tri = lower.slice(i, i + 3);
    if (SYLLABLE_TO_CUNEIFORM[tri]) {
      tokens.push({
        source: cleaned.slice(i, i + 3),
        syllable: tri,
        sign: SYLLABLE_TO_CUNEIFORM[tri],
      });
      i += 3;
      continue;
    }

    const pair = lower.slice(i, i + 2);
    if (SYLLABLE_TO_CUNEIFORM[pair]) {
      tokens.push({
        source: cleaned.slice(i, i + 2),
        syllable: pair,
        sign: SYLLABLE_TO_CUNEIFORM[pair],
      });
      i += 2;
      continue;
    }

    if (LATIN_CONSONANT_FALLBACK[ch]) {
      const mapped = LATIN_CONSONANT_FALLBACK[ch];
      tokens.push({ source: cleaned[i], syllable: mapped.syllable, sign: mapped.sign });
    }
    i += 1;
  }

  return {
    cleanedInput: cleaned,
    cuneiformText: tokens.map((t) => t.sign).join(''),
    tokens: tokens.filter((t) => t.source.trim().length > 0),
    disclaimerAr: CUNEIFORM_DISCLAIMER_AR,
  };
}

/* ============================================================
 * Royal Game of Ur (2600 BCE) — Authentic Pure Rules Engine
 * ============================================================
 * Each player has 7 pieces.
 * Piece position values:
 *   -1   : waiting off-board (start)
 *   0..3 : private starting lane (4 squares; index 3 is a rosette)
 *   4..11: shared central combat lane (8 squares; index 7 is the safe central rosette)
 *   12..13: private ending lane (2 squares; index 13 is the exit rosette)
 *   14   : borne off (scored!)
 */
export type UrPlayer = 'player' | 'opponent';

export const UR_PIECES_PER_PLAYER = 7;
export const UR_TRACK_LENGTH = 14;
export const UR_ROSETTE_INDICES = new Set<number>([3, 7, 13]);
export const UR_SHARED_START = 4;
export const UR_SHARED_END = 11;
export const UR_CENTRAL_ROSETTE = 7;

export interface UrMove {
  pieceIndex: number;
  from: number;
  to: number;
  capturesOpponent: boolean;
  grantsExtraTurn: boolean;
  bearsOff: boolean;
}

export interface UrGameState {
  positions: Record<UrPlayer, number[]>;
  currentTurn: UrPlayer;
  lastRoll: number | null;
  lastDice: [0 | 1, 0 | 1, 0 | 1, 0 | 1] | null;
  winner: UrPlayer | null;
  statusMessageAr: string;
  turnNumber: number;
}

export function createInitialUrState(): UrGameState {
  return {
    positions: {
      player: Array(UR_PIECES_PER_PLAYER).fill(-1),
      opponent: Array(UR_PIECES_PER_PLAYER).fill(-1),
    },
    currentTurn: 'player',
    lastRoll: null,
    lastDice: null,
    winner: null,
    statusMessageAr: 'اضغط على «ارمِ النرد الهرمي» لبدء جولة لعبة أور الملكية.',
    turnNumber: 1,
  };
}

export function rollUrDice(rng: () => number = Math.random): {
  total: number;
  dice: [0 | 1, 0 | 1, 0 | 1, 0 | 1];
} {
  const d0: 0 | 1 = rng() < 0.5 ? 1 : 0;
  const d1: 0 | 1 = rng() < 0.5 ? 1 : 0;
  const d2: 0 | 1 = rng() < 0.5 ? 1 : 0;
  const d3: 0 | 1 = rng() < 0.5 ? 1 : 0;
  return {
    total: d0 + d1 + d2 + d3,
    dice: [d0, d1, d2, d3],
  };
}

export function getLegalUrMoves(
  state: UrGameState,
  player: UrPlayer,
  roll: number
): UrMove[] {
  if (roll <= 0 || state.winner) return [];

  const ownPieces = state.positions[player];
  const enemy: UrPlayer = player === 'player' ? 'opponent' : 'player';
  const enemyPieces = state.positions[enemy];

  const moves: UrMove[] = [];
  const seenFrom = new Set<number>();

  for (let i = 0; i < ownPieces.length; i += 1) {
    const from = ownPieces[i];
    if (from >= UR_TRACK_LENGTH) continue; // Already borne off
    // Deduplicate waiting pieces at -1 so UI presents one move for entering
    if (from === -1 && seenFrom.has(-1)) continue;
    seenFrom.add(from);

    const to = from + roll;
    if (to > UR_TRACK_LENGTH) continue; // Must roll exact number to bear off

    // Cannot land on own piece (except when bearing off at 14)
    if (to < UR_TRACK_LENGTH && ownPieces.includes(to)) {
      continue;
    }

    // Check shared central lane rules
    const inSharedLane = to >= UR_SHARED_START && to <= UR_SHARED_END;
    const enemyOnTarget = inSharedLane && enemyPieces.includes(to);

    // Central rosette (index 7) is a sanctuary — cannot capture a piece standing on it
    if (enemyOnTarget && to === UR_CENTRAL_ROSETTE) {
      continue;
    }

    moves.push({
      pieceIndex: i,
      from,
      to,
      capturesOpponent: enemyOnTarget,
      grantsExtraTurn: UR_ROSETTE_INDICES.has(to),
      bearsOff: to === UR_TRACK_LENGTH,
    });
  }

  return moves;
}

export function applyUrMove(
  state: UrGameState,
  move: UrMove
): UrGameState {
  const player = state.currentTurn;
  const enemy: UrPlayer = player === 'player' ? 'opponent' : 'player';
  const nextOwn = [...state.positions[player]];
  const nextEnemy = [...state.positions[enemy]];

  nextOwn[move.pieceIndex] = move.to;

  if (move.capturesOpponent) {
    const enemyIdx = nextEnemy.findIndex((pos) => pos === move.to);
    if (enemyIdx !== -1) {
      nextEnemy[enemyIdx] = -1;
    }
  }

  const nextPositions: Record<UrPlayer, number[]> = {
    player: player === 'player' ? nextOwn : nextEnemy,
    opponent: player === 'opponent' ? nextOwn : nextEnemy,
  };

  const borneOffCount = nextOwn.filter((p) => p === UR_TRACK_LENGTH).length;
  const winner: UrPlayer | null =
    borneOffCount === UR_PIECES_PER_PLAYER ? player : null;

  const actorAr = player === 'player' ? 'أنت' : 'المنافس';
  let statusMessageAr = '';
  if (winner) {
    statusMessageAr =
      winner === 'player'
        ? 'أحسنت! أخرجت جميع قطعك السبع وفزت بلعبة أور الملكية.'
        : 'أكمل المنافس إخراج قطعه السبع وفاز بالجولة.';
  } else if (move.grantsExtraTurn) {
    statusMessageAr = `${actorAr} على خانة الوردة الذهبية — دور إضافي مجاني!`;
  } else if (move.capturesOpponent) {
    statusMessageAr = `${actorAr} أسر قطعة في الممر الأوسط وأعادها للبداية!`;
  } else if (move.bearsOff) {
    statusMessageAr = `${actorAr} أخرج قطعة بأمان إلى خارج اللوح.`;
  } else {
    statusMessageAr =
      player === 'player'
        ? 'انتقل الدور إلى المنافس.'
        : 'دورك الآن — ارمِ النرد الهرمي.';
  }

  return {
    positions: nextPositions,
    currentTurn: winner ? player : move.grantsExtraTurn ? player : enemy,
    lastRoll: null,
    lastDice: state.lastDice,
    winner,
    statusMessageAr,
    turnNumber: state.turnNumber + 1,
  };
}

export function chooseAiUrMove(moves: UrMove[]): UrMove | null {
  if (moves.length === 0) return null;
  const scored = [...moves].sort((a, b) => {
    const score = (m: UrMove) =>
      (m.bearsOff ? 60 : 0) +
      (m.capturesOpponent ? 50 : 0) +
      (m.grantsExtraTurn ? 45 : 0) +
      (m.to === UR_CENTRAL_ROSETTE ? 35 : 0) +
      m.to;
    return score(b) - score(a);
  });
  return scored[0];
}

/* ============================================================
 * Iraqi Civilizations & Heritage Knowledge Quiz
 * ============================================================ */
export interface HeritageQuizQuestion {
  id: string;
  era_ar: string;
  question_ar: string;
  options_ar: string[];
  correctIndex: number;
  explanation_ar: string;
}

export const IRAQ_HERITAGE_QUIZ_QUESTIONS: HeritageQuizQuestion[] = [
  {
    id: 'q-1',
    era_ar: 'الحضارة السومرية',
    question_ar: 'في أي مدينة عراقية قديمة ظهرت أقدم النصوص المسمارية المعروفة في التاريخ البشري؟',
    options_ar: ['أوروك (الوركاء)', 'الحضر', 'سامراء', 'واسط'],
    correctIndex: 0,
    explanation_ar:
      'ظهرت أقدم الألواح الطينية المسجلة بالخط المسماري المبكر في مدينة أوروك (الوركاء) في محافظة المثنى قرابة 3200 ق.م.',
  },
  {
    id: 'q-2',
    era_ar: 'الحضارة البابلية',
    question_ar: 'من الملك البابلي الذي دوّن المسلة القانونية الشهيرة المحفوظة اليوم في متحف اللوفر؟',
    options_ar: ['نبوخذنصر الثاني', 'حمورابي', 'آشوربانيبال', 'أور نمو'],
    correctIndex: 1,
    explanation_ar:
      'أصدر الملك حمورابي شريعته الشهيرة في بابل قرابة 1754 ق.م، وتضم 282 مادة قانونية منقوشة بالخط المسماري الأكدي.',
  },
  {
    id: 'q-3',
    era_ar: 'الحضارة السومرية',
    question_ar: 'في أي محافظة عراقية تقع زقورة أور العظيمة التي بناها الملك أور نمو؟',
    options_ar: ['ذي قار', 'بابل', 'ديالى', 'الأنبار'],
    correctIndex: 0,
    explanation_ar:
      'تقع زقورة أور في محافظة ذي قار قرب مدينة الناصرية، وقد شُيدت قرابة 2100 ق.م في عهد سلالة أور الثالثة.',
  },
  {
    id: 'q-4',
    era_ar: 'الحضارة الآشورية',
    question_ar: 'ما الاسم الذي يُطلق على التماثيل الآشورية الضخمة للثور المجنح ذي الرأس البشري؟',
    options_ar: ['اللاماسو (شيدو)', 'الزقورة', 'المسلة', 'الراية'],
    correctIndex: 0,
    explanation_ar:
      'اللاماسو (Lamassu) تماثيل حارسة نُحتت في القصور الآشورية بنينوى ونمرود وخورساباد لرمز القوة والحكمة.',
  },
  {
    id: 'q-5',
    era_ar: 'الحضارة البابلية الحديثة',
    question_ar: 'ما اللون المميز للآجر المزجج الذي كسا بوابة عشتار في مدينة بابل؟',
    options_ar: ['الأزرق اللازوردي', 'الأخضر الزمردي', 'الأبيض الرخامي', 'الأحمر القاني'],
    correctIndex: 0,
    explanation_ar:
      'شُيدت بوابة عشتار في عهد نبوخذنصر الثاني نحو 575 ق.م بآجر مزجج بلون أزرق لازوردي مزين بالثيران والتنانين البارزة.',
  },
  {
    id: 'q-6',
    era_ar: 'العصر العباسي',
    question_ar: 'في أي مدينة عراقية تقع المئذنة الملوية الحلزونية الشهيرة؟',
    options_ar: ['سامراء', 'الكوفة', 'البصرة', 'كركوك'],
    correctIndex: 0,
    explanation_ar:
      'بُنيت المئذنة الملوية في مدينة سامراء بمحافظة صلاح الدين خلال القرن التاسع الميلادي في عهد الخليفة العباسي المتوكل.',
  },
  {
    id: 'q-7',
    era_ar: 'التراث الطبيعي العالمي',
    question_ar: 'أي موقع طبيعي وثقافي في جنوب العراق أُدرج ضمن لائحة التراث العالمي لليونسكو عام 2016؟',
    options_ar: ['الأهوار وملاذ التنوع الأحيائي', 'بحيرة الثرثار', 'جبل سنجار', 'وادي حوران'],
    correctIndex: 0,
    explanation_ar:
      'أُدرجت أهوار جنوب العراق مع المدن الأثرية أور وأوروك وإريدو ضمن لائحة التراث العالمي لليونسكو كموقع مختلط عام 2016.',
  },
  {
    id: 'q-8',
    era_ar: 'التراث العباسي ببغداد',
    question_ar: 'ما اسم المدرسة التاريخية التي تأسست عام 1233م على ضفاف دجلة في بغداد؟',
    options_ar: ['المدرسة المستنصرية', 'المدرسة النظامية بالبصرة', 'مدرسة النجف القديمة', 'مدرسة الحضر'],
    correctIndex: 0,
    explanation_ar:
      'أسس الخليفة المستنصر بالله المدرسة المستنصرية عام 1233م في بغداد وتُعد من أقدم الصروح الجامعية القائمة في العالم الإسلامي.',
  },
  {
    id: 'q-9',
    era_ar: 'التراث المعماري الكردستاني',
    question_ar: 'أي قلعة عراقية تُعد من أقدم المستوطنات المأهولة بشكل مستمر في العالم وأُدرجت في اليونسكو عام 2014؟',
    options_ar: ['قلعة أربيل', 'قلعة كركوك', 'حصن الأخيضر', 'قلعة تكريت'],
    correctIndex: 0,
    explanation_ar:
      'تقف قلعة أربيل فوق تل أثري عريق في قلب مدينة أربيل وقد أُدرجت ضمن لائحة التراث العالمي لليونسكو عام 2014.',
  },
  {
    id: 'q-10',
    era_ar: 'التراث الثقافي اللامادي',
    question_ar: 'ما اسم دار الضيافة التقليدية المشيدة من القصب والبردي في أهوار جنوب العراق؟',
    options_ar: ['المضيف', 'الشناشيل', 'الإيوان', 'الخان'],
    correctIndex: 0,
    explanation_ar:
      'المضيف بناء معماري فريد من القصب المعقود دون مسامير، يمثل رمز الضيافة والاجتماع العشائري في أهوار جنوب العراق.',
  },
];

export function evaluateHeritageQuiz(
  answers: Record<string, number>,
  questions: HeritageQuizQuestion[] = IRAQ_HERITAGE_QUIZ_QUESTIONS
): { correct: number; total: number; percentage: number; rankAr: string } {
  const total = questions.length;
  let correct = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correctIndex) {
      correct += 1;
    }
  }
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  let rankAr = 'مستكشف مبتدئ';
  if (percentage >= 90) rankAr = 'خبير حضارات الرافدين';
  else if (percentage >= 70) rankAr = 'باحث متمرس في التراث العراقي';
  else if (percentage >= 50) rankAr = 'رحّالة شغوف بالتاريخ';
  return { correct, total, percentage, rankAr };
}
