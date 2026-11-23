import test from 'node:test';
import assert from 'node:assert/strict';
import { IRAQ_GOVERNORATES, IRAQ_LANDMARKS } from '../data/database';
import {
  autoDetectCsvMapping,
  computeLandmarkRatingSummary,
  createPlatformBackupSnapshot,
  createVisitorReview,
  DEFAULT_SITE_SETTINGS,
  EMPTY_ANALYTICS,
  moderateVisitorReview,
  previewLandmarksCsvImport,
  reportVisitorReview,
  subscribeNewsletter,
  validatePlatformBackupSnapshot,
} from './platformStore';

test('visitor reviews enforce validation, rate limiting, reporting, and admin moderation with zero fake reviews', () => {
  const emptySummary = computeLandmarkRatingSummary('IQ-0020', []);
  assert.equal(emptySummary.average, null);
  assert.equal(emptySummary.count, 0);

  const bad = createVisitorReview(
    {
      landmarkId: 'IQ-0020',
      landmarkNameAr: 'مدينة بابل الأثرية',
      authorName: 'ع',
      rating: 5,
      comment: 'قصير',
    },
    [],
    100000,
    0
  );
  assert.equal(bad.ok, false);

  const created = createVisitorReview(
    {
      landmarkId: 'IQ-0020',
      landmarkNameAr: 'مدينة بابل الأثرية',
      authorName: 'حيدر السعدي',
      rating: 5,
      comment: 'موقع تاريخي عظيم وتنظيم الزيارة صباحاً كان ممتازاً.',
    },
    [],
    100000,
    0
  );
  assert.equal(created.ok, true);
  assert.equal(created.reviews.length, 1);

  // Rate limit within 30s
  const rateLimited = createVisitorReview(
    {
      landmarkId: 'IQ-0020',
      landmarkNameAr: 'مدينة بابل الأثرية',
      authorName: 'حيدر السعدي',
      rating: 4,
      comment: 'تجربة جميلة جداً ومميزة.',
    },
    created.reviews,
    105000,
    100000
  );
  assert.equal(rateLimited.ok, false);

  const reported = reportVisitorReview(
    created.review!.id,
    'تكرار',
    created.reviews
  );
  assert.equal(reported[0].reportedCount, 1);

  const hidden = moderateVisitorReview(created.review!.id, 'hide', reported);
  const summaryAfterHide = computeLandmarkRatingSummary('IQ-0020', hidden);
  assert.equal(summaryAfterHide.count, 0);

  const deleted = moderateVisitorReview(created.review!.id, 'delete', hidden);
  assert.equal(deleted.length, 0);
});

test('CSV landmark importer detects columns, validates rows, and flags duplicates accurately', () => {
  const csv = [
    'name_ar,name_en,governorate_ar,category,era,description_ar,lat,lng,unesco_site',
    'خان مرجان الأثري التجريبي,Khan Murjan Test,بغداد,أثري,العصر الجلائري,خان تاريخي مميز في بغداد,33.3401,44.3895,false',
    'مدينة بابل الأثرية,Babylon,بابل,أثري,البابلي,مكرر,32.54,44.42,true',
    'معلم بلا محافظة,No Gov,محافظة غير موجودة,أثري,قديم,خطأ,33.0,44.0,false',
  ].join('\n');

  const mapping = autoDetectCsvMapping([
    'name_ar',
    'name_en',
    'governorate_ar',
    'category',
    'era',
    'description_ar',
    'lat',
    'lng',
    'unesco_site',
  ]);

  const preview = previewLandmarksCsvImport(
    csv,
    mapping,
    IRAQ_LANDMARKS,
    IRAQ_GOVERNORATES
  );

  assert.equal(preview.validCount, 1);
  assert.equal(preview.duplicateCount, 1);
  assert.equal(preview.errorCount, 1);
  assert.equal(preview.rows[0].landmark?.governorate_id, 'IQ-GOV-01');
});

test('newsletter subscription and platform JSON backup validation work reliably', () => {
  const invalid = subscribeNewsletter('not-an-email', []);
  assert.equal(invalid.ok, false);

  const ok = subscribeNewsletter('visitor@example.iq', []);
  assert.equal(ok.ok, true);
  assert.equal(ok.subscribers.length, 1);

  const snap = createPlatformBackupSnapshot({
    settings: DEFAULT_SITE_SETTINGS,
    reviews: [],
    articles: [],
    artifacts: [],
    services: [],
    analytics: EMPTY_ANALYTICS,
    auditLogs: [],
  });
  const checked = validatePlatformBackupSnapshot(snap);
  assert.equal(checked.valid, true);
  assert.equal(validatePlatformBackupSnapshot({ bad: true }).valid, false);
});
