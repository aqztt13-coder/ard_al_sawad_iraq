import test from 'node:test';
import assert from 'node:assert/strict';
import { DATABASE_METADATA, IRAQ_GOVERNORATES, IRAQ_LANDMARKS } from '../data/database';
import {
  filterLandmarks,
  formatCoordinatesAr,
  getDatabaseStats,
  getDynamicCategoryStats,
  getGovernoratesWithCounts,
  getLandmarkGoogleMapsUrl,
  getUniqueRegions,
  normalizeArabic,
} from './arabicSearch';
import {
  hasExactCoordinates,
  resolveGovernorateCenter,
  resolveLandmarkCoordinates,
} from './coordinates';

test('landmarks.json database loads all 18 governorates and 152 landmarks dynamically', () => {
  assert.equal(DATABASE_METADATA.total_governorates, 18);
  assert.equal(DATABASE_METADATA.total_landmarks, 152);
  assert.equal(IRAQ_GOVERNORATES.length, 18);
  assert.equal(IRAQ_LANDMARKS.length, 152);

  const uniqueGovIds = new Set(IRAQ_GOVERNORATES.map((g) => g.id));
  assert.equal(uniqueGovIds.size, 18);

  const uniqueLandmarkIds = new Set(IRAQ_LANDMARKS.map((l) => l.id));
  assert.equal(uniqueLandmarkIds.size, 152);

  for (const landmark of IRAQ_LANDMARKS) {
    assert.ok(
      uniqueGovIds.has(landmark.governorate_id) ||
        landmark.governorate_id === 'IQ-NATIONAL',
      `Unknown governorate_id: ${landmark.governorate_id}`
    );
    assert.ok(
      landmark.wikimedia_search_query.trim().length > 0,
      `Missing wikimedia_search_query for ${landmark.id}`
    );
    assert.ok(
      landmark.google_maps_url.startsWith('https://www.google.com/maps'),
      `Invalid google_maps_url for ${landmark.id}`
    );
  }
});

test('getDatabaseStats and getDynamicCategoryStats compute counts dynamically and react to data changes', () => {
  const stats = getDatabaseStats(
    IRAQ_LANDMARKS,
    IRAQ_GOVERNORATES,
    DATABASE_METADATA.categories
  );

  assert.equal(stats.totalGovernorates, 18);
  assert.equal(stats.totalLandmarks, 152);
  assert.equal(stats.nationalLandmarksCount, 4);
  assert.equal(
    stats.unescoCount,
    IRAQ_LANDMARKS.filter((l) => l.unesco_site === true).length
  );

  const religiousStat = stats.categoryStats.find((c) => c.id === 'religious');
  const archStat = stats.categoryStats.find((c) => c.id === 'archaeological');
  const natureStat = stats.categoryStats.find((c) => c.id === 'nature_tourism');
  assert.equal(religiousStat?.count, 29);
  assert.equal(archStat?.count, 83);
  assert.equal(natureStat?.count, 40);
  assert.equal(
    (religiousStat?.count ?? 0) + (archStat?.count ?? 0) + (natureStat?.count ?? 0),
    152
  );

  // Verify dynamic reactivity when dataset changes (e.g. toggling UNESCO or adding a landmark)
  const mutated = IRAQ_LANDMARKS.map((l, idx) =>
    idx < 3 ? { ...l, unesco_site: true } : l
  );
  const updatedStats = getDatabaseStats(
    mutated,
    IRAQ_GOVERNORATES,
    DATABASE_METADATA.categories
  );
  assert.equal(updatedStats.unescoCount, 3);

  const subsetCats = getDynamicCategoryStats(mutated.slice(0, 10));
  const subsetTotal = subsetCats.reduce((sum, c) => sum + c.count, 0);
  assert.equal(subsetTotal, 10);
});

test('normalizeArabic unifies Alef variants, Teh Marbuta, Alef Maksura, and strips diacritics', () => {
  assert.equal(normalizeArabic('الإمام عليّ'), 'الامام علي');
  assert.equal(normalizeArabic('بوابة عشتار'), normalizeArabic('بوابه عشتار'));
  assert.equal(normalizeArabic('أوروك — الوَرْكاء'), 'اوروك — الوركاء');
  assert.equal(normalizeArabic('آثار سُومَر'), 'اثار سومر');
  assert.equal(normalizeArabic('موسى الكاظم'), normalizeArabic('موسي الكاظم'));
});

test('filterLandmarks matches Arabic & English queries, categories, governorates, and UNESCO flag', () => {
  const babylonResults = filterLandmarks(IRAQ_LANDMARKS, IRAQ_GOVERNORATES, {
    query: 'مدينه بابل الاثريه',
    category: 'all',
    governorateId: 'all',
    unescoOnly: false,
  });
  assert.ok(babylonResults.some((l) => l.id === 'IQ-0020'));

  const englishQueryResults = filterLandmarks(IRAQ_LANDMARKS, IRAQ_GOVERNORATES, {
    query: 'Ziggurat of Ur',
    category: 'all',
    governorateId: 'all',
    unescoOnly: false,
  });
  assert.ok(englishQueryResults.some((l) => l.id === 'IQ-0044'));

  const natureInErbil = filterLandmarks(IRAQ_LANDMARKS, IRAQ_GOVERNORATES, {
    query: '',
    category: 'nature_tourism',
    governorateId: 'IQ-GOV-04',
    unescoOnly: false,
  });
  assert.ok(natureInErbil.length > 0);
  assert.ok(
    natureInErbil.every(
      (l) => l.category === 'nature_tourism' && l.governorate_id === 'IQ-GOV-04'
    )
  );

  const nationalOnly = filterLandmarks(IRAQ_LANDMARKS, IRAQ_GOVERNORATES, {
    query: '',
    category: 'all',
    governorateId: 'IQ-NATIONAL',
    unescoOnly: false,
  });
  assert.equal(nationalOnly.length, 4);
});

test('coordinate resolution and Google Maps URLs handle null JSON coordinates gracefully', () => {
  const sample = IRAQ_LANDMARKS[0];
  assert.equal(hasExactCoordinates(sample.coordinates), false);
  assert.equal(
    formatCoordinatesAr(sample.coordinates.lat, sample.coordinates.lng),
    'وفق موقع المحافظة'
  );
  assert.equal(formatCoordinatesAr(31.9959, 44.3145), '31.9959° ش، 44.3145° ق');

  assert.ok(getLandmarkGoogleMapsUrl(sample).startsWith('https://www.google.com/maps'));

  for (const gov of IRAQ_GOVERNORATES) {
    const center = resolveGovernorateCenter(gov);
    assert.ok(Number.isFinite(center.lat) && center.lat > 29 && center.lat < 38);
    assert.ok(Number.isFinite(center.lng) && center.lng > 38 && center.lng < 49);
  }

  for (const lm of IRAQ_LANDMARKS) {
    const resolved = resolveLandmarkCoordinates(lm, IRAQ_GOVERNORATES);
    assert.ok(Number.isFinite(resolved.lat), `Invalid lat for ${lm.id}`);
    assert.ok(Number.isFinite(resolved.lng), `Invalid lng for ${lm.id}`);
  }
});

test('getGovernoratesWithCounts and getUniqueRegions cover all 18 governorates accurately', () => {
  const stats = getGovernoratesWithCounts(IRAQ_GOVERNORATES, IRAQ_LANDMARKS);
  assert.equal(stats.length, 18);

  const baghdad = stats.find((g) => g.id === 'IQ-GOV-01');
  assert.ok(baghdad && baghdad.landmarkCount === 19);

  for (const gov of stats) {
    assert.ok(gov.landmarkCount >= 2, `Expected >=2 landmarks for ${gov.name_ar}`);
  }

  const regions = getUniqueRegions(IRAQ_GOVERNORATES);
  assert.ok(regions.includes('وسط'));
  assert.ok(regions.includes('شمال'));
  assert.ok(regions.includes('جنوب'));
});
