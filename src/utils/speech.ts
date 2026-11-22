import { Landmark } from '../types/tourism';

export interface SpeechVoiceLike {
  lang: string;
  name: string;
  default?: boolean;
}

/**
 * Builds the Arabic audio narration script for a landmark combining
 * its Arabic name, governorate, and full description.
 */
export function buildAudioGuideScript(landmark: Landmark): string {
  const name = landmark.name_ar.trim();
  const gov = landmark.governorate_ar.trim();
  const desc = landmark.description_ar.trim();
  return `${name}، في محافظة ${gov}. ${desc}`;
}

/**
 * Selects the best available Arabic speech synthesis voice:
 * 1. Exact `ar-SA` match
 * 2. Any `ar-*` or `ar` Arabic voice
 * 3. `null` (caller still assigns `utterance.lang = 'ar-SA'`)
 */
export function pickBestArabicVoice<T extends SpeechVoiceLike>(
  voices: readonly T[]
): T | null {
  if (!voices || voices.length === 0) return null;

  const exactSaudi = voices.find((v) => v.lang.toLowerCase() === 'ar-sa');
  if (exactSaudi) return exactSaudi;

  const regionalArabic = voices.find((v) =>
    v.lang.toLowerCase().startsWith('ar-')
  );
  if (regionalArabic) return regionalArabic;

  const genericArabic = voices.find((v) => v.lang.toLowerCase() === 'ar');
  if (genericArabic) return genericArabic;

  return null;
}
