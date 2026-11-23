import test from 'node:test';
import assert from 'node:assert/strict';
import { IRAQ_GOVERNORATES, IRAQ_LANDMARKS } from '../data/database';
import {
  addStopToDay,
  formatTripPlanTextSummary,
  generateSmartTripPlan,
  removeStopFromPlan,
  reorderStopWithinDay,
} from './tripPlanner';

test('generateSmartTripPlan builds a multi-day itinerary from real Iraq landmarks with Haversine distances', () => {
  const plan = generateSmartTripPlan(
    {
      startGovernorateId: 'IQ-GOV-01',
      destinationGovernorateId: 'IQ-GOV-01',
      days: 3,
      interests: ['archaeological', 'religious'],
      partyType: 'family',
      budget: 'moderate',
      transport: 'private_car',
    },
    IRAQ_LANDMARKS,
    IRAQ_GOVERNORATES
  );

  assert.equal(plan.days.length, 3);
  assert.ok(plan.totalStops >= 6);
  assert.ok(plan.totalStraightLineKm >= 0);

  const uniqueIds = new Set<string>();
  for (const day of plan.days) {
    for (const stop of day.stops) {
      assert.ok(!uniqueIds.has(stop.landmark.id), 'Duplicate landmark in generated plan');
      uniqueIds.add(stop.landmark.id);
    }
  }
});

test('trip planner editing operations (remove, reorder, add) maintain valid stops and distances', () => {
  const plan = generateSmartTripPlan(
    {
      startGovernorateId: 'IQ-GOV-01',
      destinationGovernorateId: 'all',
      days: 2,
      interests: ['archaeological'],
      partyType: 'individual',
      budget: 'economy',
      transport: 'guided_tour',
    },
    IRAQ_LANDMARKS,
    IRAQ_GOVERNORATES
  );

  const day1 = plan.days[0];
  assert.ok(day1.stops.length >= 2);
  const firstId = day1.stops[0].landmark.id;
  const secondId = day1.stops[1].landmark.id;

  const reordered = reorderStopWithinDay(plan, 1, 0, 'down', IRAQ_GOVERNORATES);
  assert.equal(reordered.days[0].stops[0].landmark.id, secondId);
  assert.equal(reordered.days[0].stops[1].landmark.id, firstId);

  const removed = removeStopFromPlan(reordered, 1, firstId, IRAQ_GOVERNORATES);
  assert.equal(removed.totalStops, plan.totalStops - 1);

  const candidate = IRAQ_LANDMARKS.find(
    (l) => !removed.days.some((d) => d.stops.some((s) => s.landmark.id === l.id))
  );
  assert.ok(candidate);
  const added = addStopToDay(removed, 1, candidate, IRAQ_GOVERNORATES);
  assert.equal(added.totalStops, removed.totalStops + 1);

  const summary = formatTripPlanTextSummary(added);
  assert.ok(summary.includes('أرض السواد'));
  assert.ok(summary.includes('Haversine'));
});
