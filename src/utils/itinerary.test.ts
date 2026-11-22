import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deserializeItinerary,
  isSavedInItinerary,
  moveItineraryEntry,
  serializeItinerary,
  toggleItineraryEntry,
  updateItineraryNote,
} from './itinerary';

test('toggleItineraryEntry adds and removes destinations cleanly', () => {
  const afterAdd = toggleItineraryEntry([], 'imam-ali-shrine', '2026-11-22T08:00:00.000Z');
  assert.equal(afterAdd.length, 1);
  assert.equal(isSavedInItinerary(afterAdd, 'imam-ali-shrine'), true);

  const afterRemove = toggleItineraryEntry(afterAdd, 'imam-ali-shrine');
  assert.equal(afterRemove.length, 0);
  assert.equal(isSavedInItinerary(afterRemove, 'imam-ali-shrine'), false);
});

test('updateItineraryNote updates note and caps length at 280 chars', () => {
  const initial = toggleItineraryEntry([], 'ziggurat-of-ur', '2026-11-22T08:00:00.000Z');
  const updated = updateItineraryNote(initial, 'ziggurat-of-ur', 'زيارة صباحية قبل الغروب');
  assert.equal(updated[0].note, 'زيارة صباحية قبل الغروب');

  const longNote = 'أ'.repeat(350);
  const capped = updateItineraryNote(initial, 'ziggurat-of-ur', longNote);
  assert.equal(capped[0].note.length, 280);
});

test('moveItineraryEntry reorders items safely within bounds', () => {
  let list = toggleItineraryEntry([], 'a', '2026-11-22T08:00:00.000Z');
  list = toggleItineraryEntry(list, 'b', '2026-11-22T08:01:00.000Z');
  list = toggleItineraryEntry(list, 'c', '2026-11-22T08:02:00.000Z');

  const movedUp = moveItineraryEntry(list, 'c', 'up');
  assert.deepEqual(
    movedUp.map((e) => e.landmarkId),
    ['a', 'c', 'b']
  );

  const outOfBounds = moveItineraryEntry(list, 'a', 'up');
  assert.deepEqual(
    outOfBounds.map((e) => e.landmarkId),
    ['a', 'b', 'c']
  );
});

test('serializeItinerary and deserializeItinerary handle round-trip and malformed data', () => {
  const entries = updateItineraryNote(
    toggleItineraryEntry([], 'babylon-ishtar-gate', '2026-11-22T08:00:00.000Z'),
    'babylon-ishtar-gate',
    'التصوير عند البوابة'
  );
  const restored = deserializeItinerary(serializeItinerary(entries));
  assert.deepEqual(restored, entries);
  assert.deepEqual(deserializeItinerary('not-valid-json'), []);
  assert.deepEqual(deserializeItinerary(null), []);
});
