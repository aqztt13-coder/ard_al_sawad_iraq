import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyUrMove,
  chooseAiUrMove,
  createInitialUrState,
  evaluateHeritageQuiz,
  getLegalUrMoves,
  IRAQ_HERITAGE_QUIZ_QUESTIONS,
  rollUrDice,
  transliterateToCuneiform,
  UR_CENTRAL_ROSETTE,
  UR_PIECES_PER_PLAYER,
  UR_TRACK_LENGTH,
} from './culturalGames';

test('transliterateToCuneiform converts Arabic and Latin names into Unicode Cuneiform signs with disclaimer', () => {
  const ar = transliterateToCuneiform('بابل');
  assert.ok(ar.cuneiformText.length > 0);
  assert.ok(ar.tokens.length >= 3);
  assert.ok(ar.disclaimerAr.includes('المسمارية'));

  const en = transliterateToCuneiform('Sumer');
  assert.ok(en.cuneiformText.length > 0);
  assert.ok(en.tokens.some((t) => t.syllable === 'su'));

  const empty = transliterateToCuneiform('   ');
  assert.equal(empty.cuneiformText, '');
  assert.equal(empty.tokens.length, 0);
});

test('Royal Game of Ur enforces dice bounds, rosette extra turns, central sanctuary, captures, and winning', () => {
  const rollZero = rollUrDice(() => 0.9);
  assert.equal(rollZero.total, 0);
  const rollFour = rollUrDice(() => 0.1);
  assert.equal(rollFour.total, 4);

  let state = createInitialUrState();
  assert.equal(state.currentTurn, 'player');
  assert.equal(state.positions.player.length, UR_PIECES_PER_PLAYER);

  // Roll 4 from start (-1) lands on index 3 (entry rosette -> extra turn!)
  const openingMoves = getLegalUrMoves(state, 'player', 4);
  assert.equal(openingMoves.length, 1);
  assert.equal(openingMoves[0].to, 3);
  assert.equal(openingMoves[0].grantsExtraTurn, true);

  state = applyUrMove(state, openingMoves[0]);
  assert.equal(state.currentTurn, 'player', 'Landing on rosette must keep turn');

  // Test central sanctuary protection at index 7
  const sanctuaryState = {
    ...createInitialUrState(),
    positions: {
      player: [5, -1, -1, -1, -1, -1, -1],
      opponent: [UR_CENTRAL_ROSETTE, -1, -1, -1, -1, -1, -1],
    },
  };
  const blockedMoves = getLegalUrMoves(sanctuaryState, 'player', 2);
  assert.ok(
    !blockedMoves.some((m) => m.to === UR_CENTRAL_ROSETTE),
    'Cannot capture opponent on central rosette'
  );

  // Test capture on shared lane index 6
  const captureState = {
    ...createInitialUrState(),
    positions: {
      player: [4, -1, -1, -1, -1, -1, -1],
      opponent: [6, -1, -1, -1, -1, -1, -1],
    },
  };
  const captureMoves = getLegalUrMoves(captureState, 'player', 2);
  const capMove = captureMoves.find((m) => m.from === 4 && m.to === 6);
  assert.ok(capMove && capMove.capturesOpponent);
  const afterCapture = applyUrMove(captureState, capMove);
  assert.equal(afterCapture.positions.opponent[0], -1, 'Captured piece returns to start');

  // Test AI heuristic prefers bearing off / captures
  const aiPick = chooseAiUrMove(captureMoves);
  assert.ok(aiPick && aiPick.capturesOpponent);

  // Test winning condition when 7th piece bears off at index 14
  const almostWon = {
    ...createInitialUrState(),
    positions: {
      player: [14, 14, 14, 14, 14, 14, 12],
      opponent: [-1, -1, -1, -1, -1, -1, -1],
    },
  };
  const winMoves = getLegalUrMoves(almostWon, 'player', 2);
  assert.equal(winMoves.length, 1);
  assert.equal(winMoves[0].to, UR_TRACK_LENGTH);
  const won = applyUrMove(almostWon, winMoves[0]);
  assert.equal(won.winner, 'player');
});

test('IRAQ_HERITAGE_QUIZ_QUESTIONS and evaluateHeritageQuiz score accurately', () => {
  assert.ok(IRAQ_HERITAGE_QUIZ_QUESTIONS.length >= 10);
  const allCorrect: Record<string, number> = {};
  for (const q of IRAQ_HERITAGE_QUIZ_QUESTIONS) {
    allCorrect[q.id] = q.correctIndex;
  }
  const perfect = evaluateHeritageQuiz(allCorrect);
  assert.equal(perfect.percentage, 100);
  assert.equal(perfect.correct, IRAQ_HERITAGE_QUIZ_QUESTIONS.length);

  const none = evaluateHeritageQuiz({});
  assert.equal(none.correct, 0);
  assert.equal(none.percentage, 0);
});
