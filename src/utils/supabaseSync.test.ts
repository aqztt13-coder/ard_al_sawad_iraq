import test from 'node:test';
import assert from 'node:assert/strict';
import { IRAQ_GOVERNORATES, IRAQ_LANDMARKS } from '../data/database';
import { buildGovernorateProfilesMap } from '../data/governorateProfiles';
import {
  appendCacheBuster,
  buildSeedGovernoratePayloads,
  buildSeedLandmarkPayloads,
  deserializeCloudCache,
  getGovernorateCoverImage,
  getPrimaryLandmarkImage,
  isSafeHttpUrl,
  mergeGovernorateProfilesWithRemote,
  mergeLandmarksWithRemote,
  prependPhotosToList,
  removePhotoFromList,
  sanitizeImageList,
  sanitizeStorageSegment,
  serializeCloudCache,
  setCoverPhotoInList,
  stripQueryFromUrl,
} from './supabaseSync';

const PROFILES_BY_ID = buildGovernorateProfilesMap(IRAQ_GOVERNORATES);

test('isSafeHttpUrl allows http(s) URLs and blocks javascript:/data: schemes', () => {
  assert.equal(
    isSafeHttpUrl(
      'https://example.supabase.co/storage/v1/object/public/landmark-photos/a.jpg'
    ),
    true
  );
  assert.equal(isSafeHttpUrl('http://example.com/photo.jpg'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeHttpUrl(''), false);
  assert.equal(isSafeHttpUrl(null), false);
});

test('appendCacheBuster and stripQueryFromUrl manage cache-busting query params cleanly', () => {
  const base =
    'https://example.supabase.co/storage/v1/object/public/landmark-photos/landmarks/iq-0001/photo.jpg';
  const busted = appendCacheBuster(base, 1700000000000);
  assert.equal(busted, `${base}?t=1700000000000`);
  assert.equal(appendCacheBuster(busted, 1700000009999), `${base}?t=1700000009999`);
  assert.equal(stripQueryFromUrl(busted), base);
  assert.equal(appendCacheBuster('javascript:alert(1)', 123), '');
});

test('sanitizeImageList deduplicates by base URL (ignoring cache-buster) and filters unsafe URLs', () => {
  const result = sanitizeImageList([
    'https://example.com/1.jpg?t=200',
    'javascript:alert(1)',
    'https://example.com/1.jpg?t=100',
    'https://example.com/2.jpg',
    'data:image/png;base64,abc',
  ]);
  assert.deepEqual(result, [
    'https://example.com/1.jpg?t=200',
    'https://example.com/2.jpg',
  ]);
});

test('prependPhotosToList puts newly uploaded photos at images[0] and deduplicates by base URL', () => {
  const existing = [
    'https://example.com/old-cover.jpg?t=100',
    'https://example.com/second.jpg?t=100',
  ];
  const uploaded = ['https://example.com/new-upload.jpg?t=200'];
  const merged = prependPhotosToList(existing, uploaded);
  assert.deepEqual(merged, [
    'https://example.com/new-upload.jpg?t=200',
    'https://example.com/old-cover.jpg?t=100',
    'https://example.com/second.jpg?t=100',
  ]);

  // Re-uploading the same base URL with a fresh cache-buster promotes it to images[0]
  const refreshed = prependPhotosToList(existing, ['https://example.com/second.jpg?t=999']);
  assert.deepEqual(refreshed, [
    'https://example.com/second.jpg?t=999',
    'https://example.com/old-cover.jpg?t=100',
  ]);
});

test('setCoverPhotoInList promotes chosen photo to index 0 and removePhotoFromList ignores query string mismatches', () => {
  const photos = [
    'https://example.com/a.jpg?t=1',
    'https://example.com/b.jpg?t=2',
    'https://example.com/c.jpg?t=3',
  ];
  assert.deepEqual(setCoverPhotoInList(photos, 'https://example.com/c.jpg'), [
    'https://example.com/c.jpg?t=3',
    'https://example.com/a.jpg?t=1',
    'https://example.com/b.jpg?t=2',
  ]);
  assert.deepEqual(removePhotoFromList(photos, 'https://example.com/b.jpg?t=999'), [
    'https://example.com/a.jpg?t=1',
    'https://example.com/c.jpg?t=3',
  ]);
});

test('getPrimaryLandmarkImage and getGovernorateCoverImage prioritize valid Supabase URLs', () => {
  const sample = {
    ...IRAQ_LANDMARKS[0],
    images: ['https://example.com/supabase-cover.jpg?t=555', 'https://example.com/2.jpg'],
  };
  assert.equal(getPrimaryLandmarkImage(sample), 'https://example.com/supabase-cover.jpg?t=555');
  assert.equal(getPrimaryLandmarkImage({ ...IRAQ_LANDMARKS[0], images: [] }), undefined);
  assert.equal(
    getGovernorateCoverImage({
      ...PROFILES_BY_ID['IQ-GOV-01'],
      cover_image_url: 'https://example.com/gov-cover.jpg?t=777',
    }),
    'https://example.com/gov-cover.jpg?t=777'
  );
  assert.equal(
    getGovernorateCoverImage({ ...PROFILES_BY_ID['IQ-GOV-01'], cover_image_url: 'javascript:bad()' }),
    undefined
  );
});

test('sanitizeStorageSegment strips traversal and special characters', () => {
  assert.equal(sanitizeStorageSegment('../../etc/passwd'), 'etc-passwd');
  assert.equal(sanitizeStorageSegment('IQ-0001'), 'iq-0001');
  assert.equal(sanitizeStorageSegment('   '), 'item');
});

test('mergeLandmarksWithRemote overwrites local images (including clearing to []) and prepends newly added cloud landmarks', () => {
  const localWithStaleImg = IRAQ_LANDMARKS.map((l) =>
    l.id === 'IQ-0001' ? { ...l, images: ['https://example.com/stale-local.jpg'] } : l
  );

  const merged = mergeLandmarksWithRemote(
    localWithStaleImg,
    [
      {
        id: 'IQ-0001',
        images: [], // Remote explicitly cleared images -> must overwrite stale local image
      },
      {
        id: 'IQ-0020',
        description_ar: 'وصف محدّث من السحابة لمدينة بابل الأثرية',
        significance_ar: 'أهمية حضارية محدّثة من لوحة الإدارة',
        unesco_site: true,
        images: [
          'https://example.supabase.co/storage/v1/object/public/landmark-photos/babylon.jpg?t=1234',
        ],
        google_maps_url: 'javascript:alert(1)', // should be rejected and keep safe local URL
      },
      {
        id: 'custom-baghdad-new',
        name_ar: 'متحف بغداد التراثي الجديد',
        name_en: 'New Baghdad Heritage Museum',
        governorate_id: 'IQ-GOV-01',
        category: 'archaeological',
        description_ar: 'معلم مضاف مباشرة من لوحة الإدارة.',
        coordinates: { lat: 33.34, lng: 44.39 },
        images: ['https://example.com/new.jpg'],
      },
    ],
    IRAQ_GOVERNORATES
  );

  assert.equal(merged.length, IRAQ_LANDMARKS.length + 1);
  assert.equal(merged[0].id, 'custom-baghdad-new');
  assert.equal(merged[0].governorate_ar, 'بغداد');
  assert.deepEqual(merged[0].images, ['https://example.com/new.jpg']);

  const clearedLandmark = merged.find((l) => l.id === 'IQ-0001');
  assert.deepEqual(clearedLandmark?.images, []);

  const babylon = merged.find((l) => l.id === 'IQ-0020');
  assert.ok(babylon);
  assert.equal(babylon.description_ar, 'وصف محدّث من السحابة لمدينة بابل الأثرية');
  assert.equal(babylon.significance_ar, 'أهمية حضارية محدّثة من لوحة الإدارة');
  assert.equal(babylon.unesco_site, true);
  assert.equal(babylon.images?.length, 1);
  assert.ok(babylon.google_maps_url.startsWith('https://'));
});

test('mergeGovernorateProfilesWithRemote merges cover_image_url across canonical slugs and respects explicit null', () => {
  const localWithExistingCover = {
    ...PROFILES_BY_ID,
    'IQ-GOV-02': {
      ...PROFILES_BY_ID['IQ-GOV-02'],
      cover_image_url: 'https://example.com/old-basra.jpg',
    },
  };

  const merged = mergeGovernorateProfilesWithRemote(
    localWithExistingCover,
    [
      {
        governorate_id: 'IQ-GOV-03',
        cover_image_url: 'https://example.com/nineveh-cover.jpg?t=100',
      },
      {
        // Legacy slug 'baghdad' should resolve cleanly onto 'IQ-GOV-01'
        governorate_id: 'baghdad',
        cover_image_url: 'https://example.com/baghdad-cover.jpg?t=200',
      },
      {
        governorate_id: 'IQ-GOV-02',
        cover_image_url: null,
      },
    ],
    IRAQ_GOVERNORATES
  );

  assert.equal(merged['IQ-GOV-03'].cover_image_url, 'https://example.com/nineveh-cover.jpg?t=100');
  assert.ok(merged['IQ-GOV-03'].nicknames_ar.includes('أم الربيعين'));
  assert.equal(merged['IQ-GOV-01'].cover_image_url, 'https://example.com/baghdad-cover.jpg?t=200');
  assert.equal(merged['IQ-GOV-02'].cover_image_url, null);
});

test('buildSeedLandmarkPayloads and buildSeedGovernoratePayloads cover all 152 landmarks and 18 governorates', () => {
  const landmarkPayloads = buildSeedLandmarkPayloads(IRAQ_LANDMARKS);
  const govPayloads = buildSeedGovernoratePayloads(PROFILES_BY_ID);

  assert.equal(landmarkPayloads.length, 152);
  assert.equal(govPayloads.length, 18);
  assert.ok(landmarkPayloads.every((row) => row.id && row.name_ar && row.significance_ar.length > 30));
  assert.ok(govPayloads.every((row) => row.governorate_id && row.overview_ar.length > 50));
});

test('offline cloud cache serializes and deserializes cleanly and rejects corrupted JSON', () => {
  const payload = {
    landmarks: IRAQ_LANDMARKS.slice(0, 2),
    governorateProfiles: { 'IQ-GOV-01': PROFILES_BY_ID['IQ-GOV-01'] },
    syncedAt: '2026-11-22T09:00:00.000Z',
  };
  const roundTrip = deserializeCloudCache(serializeCloudCache(payload));
  assert.ok(roundTrip);
  assert.equal(roundTrip.landmarks.length, 2);
  assert.equal(roundTrip.governorateProfiles['IQ-GOV-01'].governorate_id, 'IQ-GOV-01');
  assert.equal(deserializeCloudCache('{invalid json'), null);
  assert.equal(deserializeCloudCache(null), null);
});
