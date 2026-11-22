import test from 'node:test';
import assert from 'node:assert/strict';
import { IRAQ_GOVERNORATES, IRAQ_LANDMARKS } from '../data/database';
import {
  buildGovernorateProfilesMap,
  getGovernorateProfile,
} from '../data/governorateProfiles';
import {
  getDisplayBestTimeToVisit,
  getDisplayVisitorTips,
  getLandmarkRichContent,
} from '../data/landmarkEnrichments';
import { buildDynamicCuratedTrails } from '../data/trails';
import {
  calculateTrailDistanceKm,
  formatDistanceAr,
  getNearbyLandmarks,
  haversineDistanceKm,
  sortLandmarksByDistance,
} from './geo';

test('haversineDistanceKm accurately computes distances between Iraqi coordinates', () => {
  assert.equal(
    haversineDistanceKm({ lat: 33.3152, lng: 44.3661 }, { lat: 33.3152, lng: 44.3661 }),
    0
  );

  // Baghdad to Babylon is roughly 85–90 km straight-line
  const baghdadToBabylon = haversineDistanceKm(
    { lat: 33.3152, lng: 44.3661 },
    { lat: 32.5422, lng: 44.4211 }
  );
  assert.ok(
    baghdadToBabylon > 80 && baghdadToBabylon < 95,
    `Expected ~86 km, got ${baghdadToBabylon}`
  );
});

test('formatDistanceAr formats distances cleanly in Arabic', () => {
  assert.equal(formatDistanceAr(0.4), 'يبعد أقل من 1 كم');
  assert.equal(formatDistanceAr(4.36), 'يبعد 4.4 كم');
  assert.equal(formatDistanceAr(5.0), 'يبعد 5 كم');
  assert.equal(formatDistanceAr(12.4), 'يبعد 12 كم');
  assert.equal(formatDistanceAr(148.7), 'يبعد 149 كم');
});

test('sortLandmarksByDistance orders all 152 landmarks closest-to-farthest even with null JSON coords', () => {
  const najafCoords = { lat: 32.0, lng: 44.336 };
  const sorted = sortLandmarksByDistance(IRAQ_LANDMARKS, najafCoords, IRAQ_GOVERNORATES);

  assert.equal(sorted.length, IRAQ_LANDMARKS.length);
  assert.equal(sorted[0].landmark.governorate_id, 'IQ-GOV-08');
  assert.ok(Number.isFinite(sorted[0].distanceKm));

  for (let i = 1; i < sorted.length; i += 1) {
    assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm);
  }
});

test('getNearbyLandmarks excludes target landmark and returns closest sorted landmarks', () => {
  const babylon = IRAQ_LANDMARKS.find((l) => l.id === 'IQ-0020');
  assert.ok(babylon);

  const nearby = getNearbyLandmarks(babylon, IRAQ_LANDMARKS, 3, IRAQ_GOVERNORATES);
  assert.equal(nearby.length, 3);
  assert.ok(nearby.every((item) => item.landmark.id !== babylon.id));
  assert.ok(nearby[0].distanceKm <= nearby[1].distanceKm);
  assert.ok(nearby[1].distanceKm <= nearby[2].distanceKm);
});

test('buildDynamicCuratedTrails resolves 3 complete trails from live landmarks.json', () => {
  const trails = buildDynamicCuratedTrails(IRAQ_LANDMARKS);
  const landmarkMap = new Map(IRAQ_LANDMARKS.map((l) => [l.id, l]));
  assert.equal(trails.length, 3);

  for (const trail of trails) {
    assert.ok(
      trail.landmark_ids.length >= 3,
      `Expected >=3 stops in trail "${trail.id}", got ${trail.landmark_ids.length}`
    );
    const stops = trail.landmark_ids.map((id) => {
      const found = landmarkMap.get(id);
      assert.ok(found, `Trail "${trail.id}" references missing landmark "${id}"`);
      return found;
    });
    const dist = calculateTrailDistanceKm(stops, IRAQ_GOVERNORATES);
    assert.ok(dist > 100, `Expected trail "${trail.id}" total distance > 100 km, got ${dist}`);
  }
});

test('all 18 governorates resolve complete authentic Arabic profiles under IQ-GOV-* IDs plus synthetic fallback', () => {
  const profilesMap = buildGovernorateProfilesMap(IRAQ_GOVERNORATES);
  assert.equal(Object.keys(profilesMap).length, 18);

  for (const gov of IRAQ_GOVERNORATES) {
    const profile = profilesMap[gov.id];
    assert.ok(profile, `Missing governorate profile for "${gov.id}" (${gov.name_ar})`);
    assert.equal(profile.governorate_id, gov.id);
    assert.ok(profile.nicknames_ar.length >= 1, `Missing nicknames for "${gov.id}"`);
    assert.ok(profile.overview_ar.length > 80, `Short overview for "${gov.id}"`);
    assert.ok(profile.cultural_identity_ar.length > 50, `Short cultural identity for "${gov.id}"`);
    assert.ok(profile.traditions_cuisine_ar.length > 50, `Short cuisine for "${gov.id}"`);
    assert.ok(profile.best_time_to_visit_ar.length > 15, `Short best time for "${gov.id}"`);
  }

  // Fallback for any hypothetical new governorate added to JSON
  const fallback = getGovernorateProfile({
    id: 'IQ-GOV-19',
    name_ar: 'حلبجة',
    name_en: 'Halabja',
    region: 'شمال',
    center_coordinates: { lat: null, lng: null },
  });
  assert.ok(fallback && fallback.overview_ar.includes('حلبجة'));
});

test('all 152 landmarks resolve rich Arabic content and clean visitor guidance without raw placeholder text', () => {
  assert.equal(IRAQ_LANDMARKS.length, 152);
  for (const landmark of IRAQ_LANDMARKS) {
    const rich = getLandmarkRichContent(landmark);
    assert.ok(rich.historical_architectural_ar.length > 40, `Short historical text for "${landmark.id}"`);
    assert.ok(rich.significance_ar.length > 40, `Short significance text for "${landmark.id}"`);
    assert.ok(rich.dress_code_etiquette_ar.length > 20, `Short etiquette text for "${landmark.id}"`);
    assert.ok(rich.accessibility_ar.length > 20, `Short accessibility text for "${landmark.id}"`);

    const bestTime = getDisplayBestTimeToVisit(landmark);
    const tips = getDisplayVisitorTips(landmark);
    assert.ok(!bestTime.includes('غير محدد في البيانات الأصلية'));
    assert.ok(!tips.includes('غير محددة في البيانات الأصلية'));
  }
});
