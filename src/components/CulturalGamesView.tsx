import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Dices,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  applyUrMove,
  chooseAiUrMove,
  createInitialUrState,
  evaluateHeritageQuiz,
  getLegalUrMoves,
  IRAQ_HERITAGE_QUIZ_QUESTIONS,
  rollUrDice,
  transliterateToCuneiform,
  UR_PIECES_PER_PLAYER,
  UR_ROSETTE_INDICES,
  UR_TRACK_LENGTH,
  UrGameState,
  UrMove,
} from '../utils/culturalGames';
import { PLATFORM_IMAGES } from '../data/database';

/* Board mapping for the authentic 20-square Royal Game of Ur (3 rows × 8 columns)
 * Row 0 (top): Opponent private lane [3, 2, 1, 0] + gap [null, null] + Opponent exit [13, 12]
 * Row 1 (mid): Shared central combat lane [4, 5, 6, 7(rosette), 8, 9, 10, 11]
 * Row 2 (bot): Player private lane [3, 2, 1, 0] + gap [null, null] + Player exit [13, 12]
 */
interface BoardCellSpec {
  row: number;
  col: number;
  lane: 'opponent' | 'shared' | 'player' | 'gap';
  trackIndex: number | null;
  isRosette: boolean;
}

const UR_BOARD_GRID: BoardCellSpec[] = (() => {
  const cells: BoardCellSpec[] = [];
  const topMap: Array<number | null> = [3, 2, 1, 0, null, null, 13, 12];
  const midMap: number[] = [4, 5, 6, 7, 8, 9, 10, 11];
  const botMap: Array<number | null> = [3, 2, 1, 0, null, null, 13, 12];

  for (let col = 0; col < 8; col += 1) {
    const idx = topMap[col];
    cells.push({
      row: 0,
      col,
      lane: idx === null ? 'gap' : 'opponent',
      trackIndex: idx,
      isRosette: idx !== null && UR_ROSETTE_INDICES.has(idx),
    });
  }
  for (let col = 0; col < 8; col += 1) {
    const idx = midMap[col];
    cells.push({
      row: 1,
      col,
      lane: 'shared',
      trackIndex: idx,
      isRosette: UR_ROSETTE_INDICES.has(idx),
    });
  }
  for (let col = 0; col < 8; col += 1) {
    const idx = botMap[col];
    cells.push({
      row: 2,
      col,
      lane: idx === null ? 'gap' : 'player',
      trackIndex: idx,
      isRosette: idx !== null && UR_ROSETTE_INDICES.has(idx),
    });
  }
  return cells;
})();

export const CulturalGamesView: React.FC = () => {
  const [activeGame, setActiveGame] = useState<'cuneiform' | 'ur' | 'quiz'>('cuneiform');

  // 1. Cuneiform Name Writer State
  const [nameInput, setNameInput] = useState('بابل');
  const [copiedCuneiform, setCopiedCuneiform] = useState(false);
  const cuneiformResult = useMemo(
    () => transliterateToCuneiform(nameInput),
    [nameInput]
  );

  // 2. Royal Game of Ur State
  const [urState, setUrState] = useState<UrGameState>(() => createInitialUrState());
  const [vsAi, setVsAi] = useState(true);

  const legalMoves: UrMove[] = useMemo(() => {
    if (urState.lastRoll === null || urState.winner) return [];
    return getLegalUrMoves(urState, urState.currentTurn, urState.lastRoll);
  }, [urState]);

  const handleUrRoll = () => {
    if (urState.winner || urState.lastRoll !== null) return;
    const { total, dice } = rollUrDice();
    const moves = getLegalUrMoves(urState, urState.currentTurn, total);
    if (total === 0 || moves.length === 0) {
      const nextTurn = urState.currentTurn === 'player' ? 'opponent' : 'player';
      setUrState((prev) => ({
        ...prev,
        lastRoll: null,
        lastDice: dice,
        currentTurn: nextTurn,
        turnNumber: prev.turnNumber + 1,
        statusMessageAr:
          total === 0
            ? 'نتيجة النرد صفر — ينتقل الدور إلى المنافس.'
            : `نتيجة النرد ${total} ولا توجد حركة قانونية متاحة — ينتقل الدور.`,
      }));
      return;
    }

    setUrState((prev) => ({
      ...prev,
      lastRoll: total,
      lastDice: dice,
      statusMessageAr: `نتيجة النرد: ${total}. اختر إحدى الحركات المميزة بالذهبي.`,
    }));
  };

  const handleSelectUrMove = (move: UrMove) => {
    setUrState((prev) => applyUrMove(prev, move));
  };

  // Automated AI opponent turn in Royal Game of Ur
  useEffect(() => {
    if (!vsAi || urState.winner || urState.currentTurn !== 'opponent') return;
    const timer = window.setTimeout(() => {
      const { total, dice } = rollUrDice();
      const moves = getLegalUrMoves(urState, 'opponent', total);
      const chosen = chooseAiUrMove(moves);
      if (!chosen) {
        setUrState((prev) => ({
          ...prev,
          lastRoll: null,
          lastDice: dice,
          currentTurn: 'player',
          turnNumber: prev.turnNumber + 1,
          statusMessageAr:
            total === 0
              ? 'المنافس رمى صفراً — دورك الآن!'
              : `المنافس رمى ${total} دون حركة متاحة — دورك الآن!`,
        }));
      } else {
        setUrState((prev) => applyUrMove({ ...prev, lastDice: dice, lastRoll: total }, chosen));
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [vsAi, urState]);

  // 3. Iraqi Heritage Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizFinished, setQuizFinished] = useState(false);

  const currentQuestion = IRAQ_HERITAGE_QUIZ_QUESTIONS[quizIndex];
  const selectedQuizOption = currentQuestion ? quizAnswers[currentQuestion.id] : undefined;
  const quizSummary = useMemo(() => evaluateHeritageQuiz(quizAnswers), [quizAnswers]);

  const handleCopyCuneiform = async () => {
    if (!cuneiformResult.cuneiformText) return;
    try {
      await navigator.clipboard.writeText(cuneiformResult.cuneiformText);
      setCopiedCuneiform(true);
      setTimeout(() => setCopiedCuneiform(false), 2000);
    } catch {
      setCopiedCuneiform(false);
    }
  };

  const playerBorneOff = urState.positions.player.filter((p) => p === UR_TRACK_LENGTH).length;
  const playerWaiting = urState.positions.player.filter((p) => p === -1).length;
  const opponentBorneOff = urState.positions.opponent.filter(
    (p) => p === UR_TRACK_LENGTH
  ).length;
  const opponentWaiting = urState.positions.opponent.filter((p) => p === -1).length;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-[#173F35]/12 pb-5 dark:border-[#C5A15A]/18 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
            تجارب تفاعلية تعليمية من حضارة وادي الرافدين
          </p>
          <h1 className="font-heritage mt-1 text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0] sm:text-4xl">
            الألعاب الثقافية والتراثية
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="اختيار اللعبة الثقافية"
          className="inline-flex flex-wrap rounded-xl border border-[#173F35]/14 bg-white p-1 dark:border-[#C5A15A]/20 dark:bg-[#13352F]"
        >
          <button
            type="button"
            role="tab"
            data-testid="game-tab-cuneiform"
            aria-selected={activeGame === 'cuneiform'}
            onClick={() => setActiveGame('cuneiform')}
            className={`rounded-lg px-4 py-2 text-xs font-bold ${
              activeGame === 'cuneiform'
                ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                : 'text-[#4E5C58] dark:text-[#B4C0BC]'
            }`}
          >
            اكتب اسمك بالمسمارية
          </button>
          <button
            type="button"
            role="tab"
            data-testid="game-tab-ur"
            aria-selected={activeGame === 'ur'}
            onClick={() => setActiveGame('ur')}
            className={`rounded-lg px-4 py-2 text-xs font-bold ${
              activeGame === 'ur'
                ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                : 'text-[#4E5C58] dark:text-[#B4C0BC]'
            }`}
          >
            لعبة أور الملكية
          </button>
          <button
            type="button"
            role="tab"
            data-testid="game-tab-quiz"
            aria-selected={activeGame === 'quiz'}
            onClick={() => setActiveGame('quiz')}
            className={`rounded-lg px-4 py-2 text-xs font-bold ${
              activeGame === 'quiz'
                ? 'bg-[#173F35] text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]'
                : 'text-[#4E5C58] dark:text-[#B4C0BC]'
            }`}
          >
            مسابقة حضارات العراق
          </button>
        </div>
      </div>

      {/* GAME 1: CUNEIFORM NAME WRITER */}
      {activeGame === 'cuneiform' && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-[#173F35]/14 bg-white p-6 dark:border-[#C5A15A]/20 dark:bg-[#13352F] lg:col-span-5">
            <h2 className="font-heritage text-2xl font-bold text-[#173F35] dark:text-[#E7C87B]">
              انقش اسمك على لوح طيني سومري
            </h2>
            <p className="text-xs leading-relaxed text-[#54635F] dark:text-[#A9B8B3]">
              أدخل اسمك باللغة العربية أو الإنجليزية لترى تقريب المقاطع الصوتية بالخط
              المسماري السومري-الأكدي الموثق في معيار يونيكود.
            </p>

            <div>
              <label
                htmlFor="cuneiform-name-input"
                className="mb-1.5 block text-xs font-bold text-[#173F35] dark:text-[#E9DFC9]"
              >
                اكتب الاسم أو الكلمة
              </label>
              <input
                id="cuneiform-name-input"
                data-testid="cuneiform-input"
                type="text"
                maxLength={48}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="مثال: بغداد، بابل، سومر، علي، نور..."
                className="min-h-[46px] w-full rounded-xl border border-[#173F35]/20 bg-[#F8F6F0] px-4 text-base font-semibold text-[#173F35] focus:border-[#C5A15A] focus:outline-none dark:border-[#C5A15A]/28 dark:bg-[#102F29] dark:text-[#F8F6F0]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {['بغداد', 'بابل', 'أور', 'نينوى', 'دجلة'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNameInput(preset)}
                  className="rounded-lg border border-[#173F35]/14 bg-[#F8F6F0] px-3 py-1.5 text-xs font-bold text-[#173F35] hover:border-[#C5A15A] dark:bg-[#102F29] dark:text-[#E7C87B]"
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[#C5A15A]/35 bg-[#F8F6F0] p-3.5 text-xs leading-relaxed text-[#54635F] dark:bg-[#102F29] dark:text-[#B5C4BF]">
              <strong className="text-[#173F35] dark:text-[#E7C87B]">
                ملاحظة علمية:
              </strong>{' '}
              {cuneiformResult.disclaimerAr}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-[#C5A15A]/45 bg-[#2A2016] p-6 text-[#F4E7CF] shadow-xl lg:col-span-7">
            <div className="flex items-center justify-between border-b border-[#C5A15A]/25 pb-3">
              <span className="text-xs font-bold text-[#E7C87B]">
                اللوح الطيني المسماري · بلاد الرافدين
              </span>
              <button
                type="button"
                onClick={handleCopyCuneiform}
                disabled={!cuneiformResult.cuneiformText}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#C5A15A]/40 bg-[#C5A15A]/15 px-3 py-1.5 text-xs font-bold text-[#E7C87B] hover:bg-[#C5A15A]/25 disabled:opacity-40"
              >
                {copiedCuneiform ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCuneiform ? 'تم النسخ' : 'نسخ النص المسماري'}</span>
              </button>
            </div>

            <div className="relative my-6 flex min-h-[170px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-[#A68452]/55 bg-gradient-to-br from-[#C7A779] via-[#B48E5C] to-[#947144] p-6 text-center shadow-inner">
              <img
                src={PLATFORM_IMAGES.cuneiformTablet}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-multiply"
              />
              <p
                data-testid="cuneiform-output"
                dir="ltr"
                className="relative z-10 break-all text-4xl tracking-widest text-[#2A1D0E] sm:text-5xl"
              >
                {cuneiformResult.cuneiformText || '𒀀 𒁀 𒆷'}
              </p>
              {cuneiformResult.cleanedInput && (
                <p className="relative z-10 mt-3 text-sm font-bold text-[#3B2A16]">
                  «{cuneiformResult.cleanedInput}»
                </p>
              )}
            </div>

            {cuneiformResult.tokens.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-[#E7C87B]">تفصيل المقاطع الصوتية:</p>
                <div className="flex flex-wrap gap-2">
                  {cuneiformResult.tokens.map((tok, idx) => (
                    <div
                      key={`${tok.source}-${idx}`}
                      className="rounded-lg border border-[#C5A15A]/30 bg-[#1F1710] px-3 py-1.5 text-center"
                    >
                      <span className="block text-xl text-[#F4E7CF]">{tok.sign}</span>
                      <span className="text-[11px] text-[#E7C87B]">
                        {tok.source} ({tok.syllable})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GAME 2: ROYAL GAME OF UR */}
      {activeGame === 'ur' && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#173F35]/14 bg-white p-5 dark:border-[#C5A15A]/20 dark:bg-[#13352F]">
            <div>
              <h2 className="font-heritage text-2xl font-bold text-[#173F35] dark:text-[#E7C87B]">
                لعبة أور الملكية (نحو 2600 ق.م)
              </h2>
              <p className="mt-1 text-xs text-[#54635F] dark:text-[#A9B8B3]">
                أقدم لعبة لوح ملكية مكتشفة في المقبرة الملكية بمدينة أور في ذي قار. أخرج
                قطعك السبع قبل المنافس، واستفد من خانات الوردة الذهبية للدور الإضافي!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setVsAi((v) => !v)}
                className="rounded-xl border border-[#173F35]/20 px-3.5 py-2 text-xs font-bold text-[#173F35] dark:border-[#C5A15A]/30 dark:text-[#E7C87B]"
              >
                الوضع: {vsAi ? 'ضد الحاسوب' : 'لاعبان محلياً'}
              </button>
              <button
                type="button"
                onClick={() => setUrState(createInitialUrState())}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#173F35] px-3.5 py-2 text-xs font-bold text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>جولة جديدة</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Board */}
            <div className="rounded-2xl border border-[#C5A15A]/35 bg-[#102F29] p-5 text-[#F8F6F0] lg:col-span-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#E9DFC9] tabular-nums">
                  المنافس (اللازورد): خرج {opponentBorneOff}/{UR_PIECES_PER_PLAYER} · متبقي
                  للبدء {opponentWaiting}
                </span>
                <span className="font-bold text-[#E7C87B] tabular-nums">
                  أنت (الذهب): خرج {playerBorneOff}/{UR_PIECES_PER_PLAYER} · متبقي للبدء{' '}
                  {playerWaiting}
                </span>
              </div>

              {/* 3x8 Authentic 20-Square Board (LTR grid coordinates) */}
              <div dir="ltr" className="grid grid-cols-8 gap-1.5 sm:gap-2">
                {UR_BOARD_GRID.map((cell) => {
                  if (cell.lane === 'gap' || cell.trackIndex === null) {
                    return <div key={`${cell.row}-${cell.col}`} className="aspect-square" />;
                  }

                  const hasPlayerPiece =
                    (cell.lane === 'player' || cell.lane === 'shared') &&
                    urState.positions.player.includes(cell.trackIndex);
                  const hasOpponentPiece =
                    (cell.lane === 'opponent' || cell.lane === 'shared') &&
                    urState.positions.opponent.includes(cell.trackIndex);

                  const matchingMove = legalMoves.find(
                    (m) =>
                      m.to === cell.trackIndex &&
                      ((urState.currentTurn === 'player' &&
                        (cell.lane === 'player' || cell.lane === 'shared')) ||
                        (urState.currentTurn === 'opponent' &&
                          (cell.lane === 'opponent' || cell.lane === 'shared')))
                  );

                  return (
                    <button
                      key={`${cell.row}-${cell.col}`}
                      type="button"
                      disabled={!matchingMove}
                      onClick={() => matchingMove && handleSelectUrMove(matchingMove)}
                      aria-label={`خانة ${cell.trackIndex}`}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 text-xs font-bold transition-all ${
                        matchingMove
                          ? 'cursor-pointer border-[#E7C87B] bg-[#C5A15A]/35 ring-2 ring-[#E7C87B]'
                          : cell.isRosette
                            ? 'border-[#C5A15A]/70 bg-[#234E42]'
                            : cell.lane === 'shared'
                              ? 'border-[#E9DFC9]/25 bg-[#173F35]'
                              : 'border-[#E9DFC9]/18 bg-[#12332B]'
                      }`}
                    >
                      {cell.isRosette && (
                        <span
                          aria-hidden="true"
                          className="text-base text-[#E7C87B] opacity-85"
                        >
                          ✿
                        </span>
                      )}
                      {hasPlayerPiece && (
                        <span className="absolute h-6 w-6 rounded-full border-2 border-white bg-[#C5A15A] shadow-md sm:h-8 sm:w-8" />
                      )}
                      {hasOpponentPiece && (
                        <span className="absolute h-6 w-6 rounded-full border-2 border-[#E7C87B] bg-[#1B4B72] shadow-md sm:h-8 sm:w-8" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status & Action Controls */}
              <div className="mt-5 rounded-xl border border-[#C5A15A]/30 bg-[#173F35] p-4">
                <p data-testid="ur-status-msg" className="text-sm font-bold text-[#E7C87B]">
                  {urState.statusMessageAr}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    data-testid="ur-roll-btn"
                    onClick={handleUrRoll}
                    disabled={
                      Boolean(urState.winner) ||
                      urState.lastRoll !== null ||
                      (vsAi && urState.currentTurn === 'opponent')
                    }
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#C5A15A] px-5 py-2 text-xs font-bold text-[#102F29] hover:bg-[#D5B26B] disabled:opacity-45"
                  >
                    <Dices className="h-4 w-4" />
                    <span>ارمِ النرد الهرمي</span>
                  </button>

                  {urState.lastDice && (
                    <div className="flex items-center gap-1.5 text-xs">
                      {urState.lastDice.map((d, i) => (
                        <span
                          key={i}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border font-bold ${
                            d === 1
                              ? 'border-[#E7C87B] bg-[#C5A15A] text-[#102F29]'
                              : 'border-[#E9DFC9]/30 bg-[#102F29] text-[#A9B8B3]'
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {legalMoves.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {legalMoves.map((move) => (
                      <button
                        key={`${move.from}-${move.to}`}
                        type="button"
                        data-testid={`ur-move-${move.from}-${move.to}`}
                        onClick={() => handleSelectUrMove(move)}
                        className="rounded-lg border border-[#E7C87B] bg-[#102F29] px-3 py-1.5 text-xs font-bold text-[#E7C87B] hover:bg-[#C5A15A] hover:text-[#102F29]"
                      >
                        {move.from === -1
                          ? `إدخال قطعة إلى الخانة ${move.to + 1}`
                          : move.bearsOff
                            ? `إخراج القطعة من الخانة ${move.from + 1}`
                            : `تحريك (${move.from + 1} ← ${move.to + 1})`}
                        {move.capturesOpponent ? ' ★ أسر' : ''}
                        {move.grantsExtraTurn ? ' ✿ دور إضافي' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rules Panel */}
            <aside className="rounded-2xl border border-[#173F35]/14 bg-white p-5 text-xs leading-relaxed text-[#4E5C58] dark:border-[#C5A15A]/20 dark:bg-[#13352F] dark:text-[#C0CCC7] lg:col-span-4">
              <h3 className="flex items-center gap-2 font-heritage text-xl font-bold text-[#173F35] dark:text-[#E7C87B]">
                <HelpCircle className="h-4 w-4 text-[#C5A15A]" />
                <span>قواعد لعبة أور الملكية</span>
              </h3>
              <ul className="mt-3 space-y-2.5">
                <li>• يمتلك كل لاعب 7 قطع تتسابق عبر المسار المكوّن من 14 خطوة للخروج من اللوح.</li>
                <li>• يُرمى 4 أحجار نرد هرمية ثنائية لتعطي نتيجة من 0 إلى 4.</li>
                <li>• الصف الأوسط هو «ممر التنافس المشترك»؛ يمكن أسر قطعة المنافس فيه وإعادتها للبداية.</li>
                <li>• الخانات المزينة بوردة (✿) تمنحك دوراً إضافياً، والوردة الوسطى ملاذ آمن لا يمكن الأسر فيه.</li>
                <li>• لإخراج القطعة من اللوح يجب الحصول على الرقم الدقيق تماماً.</li>
              </ul>
            </aside>
          </div>
        </div>
      )}

      {/* GAME 3: IRAQI HERITAGE QUIZ */}
      {activeGame === 'quiz' && (
        <div className="mt-6 mx-auto max-w-3xl">
          {quizFinished ? (
            <div className="rounded-2xl border border-[#C5A15A]/45 bg-white p-8 text-center dark:bg-[#13352F]">
              <Trophy className="mx-auto h-12 w-12 text-[#C5A15A]" />
              <h2 className="font-heritage mt-3 text-3xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
                {quizSummary.rankAr}
              </h2>
              <p className="mt-2 text-base font-bold text-[#8C6D2B] dark:text-[#E7C87B] tabular-nums">
                نتيجتك: {quizSummary.correct} من {quizSummary.total} ({quizSummary.percentage}
                %)
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuizIndex(0);
                  setQuizAnswers({});
                  setQuizFinished(false);
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#173F35] px-6 py-3 text-sm font-bold text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>إعادة المسابقة</span>
              </button>
            </div>
          ) : (
            currentQuestion && (
              <div className="rounded-2xl border border-[#173F35]/14 bg-white p-6 dark:border-[#C5A15A]/20 dark:bg-[#13352F]">
                <div className="flex items-center justify-between text-xs font-bold text-[#8C6D2B] dark:text-[#E7C87B]">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    <span>{currentQuestion.era_ar}</span>
                  </span>
                  <span className="tabular-nums">
                    سؤال {quizIndex + 1} من {IRAQ_HERITAGE_QUIZ_QUESTIONS.length}
                  </span>
                </div>

                <h2 className="font-heritage mt-4 text-2xl font-bold text-[#173F35] dark:text-[#F8F6F0]">
                  {currentQuestion.question_ar}
                </h2>

                <div className="mt-5 space-y-2.5">
                  {currentQuestion.options_ar.map((opt, optIdx) => {
                    const isAnswered = selectedQuizOption !== undefined;
                    const isChosen = selectedQuizOption === optIdx;
                    const isCorrect = optIdx === currentQuestion.correctIndex;

                    let styleClass =
                      'border-[#173F35]/16 bg-[#F8F6F0] text-[#252B29] hover:border-[#C5A15A] dark:border-[#C5A15A]/18 dark:bg-[#102F29] dark:text-[#F8F6F0]';
                    if (isAnswered) {
                      if (isCorrect) {
                        styleClass =
                          'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200';
                      } else if (isChosen) {
                        styleClass =
                          'border-red-500 bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-200';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        data-testid={`quiz-option-${optIdx}`}
                        disabled={isAnswered}
                        onClick={() =>
                          setQuizAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id]: optIdx,
                          }))
                        }
                        className={`w-full rounded-xl border px-4 py-3 text-right text-sm font-semibold transition-colors ${styleClass}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {selectedQuizOption !== undefined && (
                  <div className="mt-5 rounded-xl border border-[#C5A15A]/35 bg-[#F8F6F0] p-4 dark:bg-[#102F29]">
                    <p className="text-xs font-bold text-[#173F35] dark:text-[#E7C87B]">
                      {selectedQuizOption === currentQuestion.correctIndex
                        ? 'إجابة صحيحة!'
                        : 'إجابة غير دقيقة — إليك المعلومة الموثّقة:'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#4E5C58] dark:text-[#C0CCC7]">
                      {currentQuestion.explanation_ar}
                    </p>
                    <button
                      type="button"
                      data-testid="quiz-next-btn"
                      onClick={() => {
                        if (quizIndex + 1 < IRAQ_HERITAGE_QUIZ_QUESTIONS.length) {
                          setQuizIndex((i) => i + 1);
                        } else {
                          setQuizFinished(true);
                        }
                      }}
                      className="mt-3 rounded-xl bg-[#173F35] px-5 py-2 text-xs font-bold text-[#F8F6F0] dark:bg-[#C5A15A] dark:text-[#102F29]"
                    >
                      {quizIndex + 1 < IRAQ_HERITAGE_QUIZ_QUESTIONS.length
                        ? 'السؤال التالي'
                        : 'عرض النتيجة النهائية'}
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
};
