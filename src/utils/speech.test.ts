import test from 'node:test';
import assert from 'node:assert/strict';
import { IRAQ_LANDMARKS } from '../data/database';
import { buildAudioGuideScript, pickBestArabicVoice } from './speech';

test('buildAudioGuideScript combines name_ar, governorate_ar, and description_ar cleanly', () => {
  const babylon = IRAQ_LANDMARKS.find((l) => l.id === 'IQ-0020') ?? IRAQ_LANDMARKS[0];
  assert.ok(babylon);

  const script = buildAudioGuideScript(babylon);
  assert.ok(script.includes(babylon.name_ar));
  assert.ok(script.includes(babylon.governorate_ar));
  assert.ok(script.includes(babylon.description_ar));
});

test('pickBestArabicVoice prefers ar-SA, falls back to any ar-* voice, or returns null', () => {
  const withSaudi = pickBestArabicVoice([
    { lang: 'en-US', name: 'English' },
    { lang: 'ar-EG', name: 'Arabic Egypt' },
    { lang: 'ar-SA', name: 'Maged' },
  ]);
  assert.equal(withSaudi?.lang, 'ar-SA');

  const withFallback = pickBestArabicVoice([
    { lang: 'en-US', name: 'English' },
    { lang: 'ar-EG', name: 'Salma' },
  ]);
  assert.equal(withFallback?.lang, 'ar-EG');

  const withGeneric = pickBestArabicVoice([
    { lang: 'fr-FR', name: 'French' },
    { lang: 'ar', name: 'Arabic' },
  ]);
  assert.equal(withGeneric?.lang, 'ar');

  const none = pickBestArabicVoice([{ lang: 'en-US', name: 'English' }]);
  assert.equal(none, null);
});
