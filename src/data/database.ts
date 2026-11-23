import rawDatabase from './landmarks.json';
import {
  DatabaseMetadata,
  Governorate,
  Landmark,
  LandmarksDatabase,
} from '../types/tourism';

const database = rawDatabase as LandmarksDatabase;

export const HERO_IMAGE_URL = '/src/assets/images/hero_ard_alsawad_1795363266757.jpg';

export const PLATFORM_IMAGES = {
  hero: '/src/assets/images/hero_ard_alsawad_1795363266757.jpg',
  shrine: '/src/assets/images/shrine_golden_dome_1795363272892.jpg',
  babylon: '/src/assets/images/babylon_ishtar_gate_1795363274102.jpg',
  ur: '/src/assets/images/ziggurat_of_ur_1795363274496.jpg',
  samarra: '/src/assets/images/samarra_malwiya_1795363273889.jpg',
  marshes: '/src/assets/images/chibayish_marshes_1795363273341.jpg',
  waterfalls: '/src/assets/images/kurdistan_waterfalls_1795363274365.jpg',
  erbil: '/src/assets/images/erbil_citadel_1795363274397.jpg',
  museumSumerian: '/src/assets/images/museum_sumerian_artifact_1795411411245.jpg',
  museumLamassu: '/src/assets/images/museum_assyrian_lamassu_1795411409752.jpg',
  cultureHospitality: '/src/assets/images/culture_iraqi_hospitality_1795411410347.jpg',
  cuneiformTablet: '/src/assets/images/cuneiform_clay_tablet_1795411408746.jpg',
} as const;

const FALLBACK_IMAGES = PLATFORM_IMAGES;

export const DATABASE_METADATA: DatabaseMetadata = database.metadata;
export const IRAQ_GOVERNORATES: Governorate[] = database.governorates;
export const IRAQ_LANDMARKS: Landmark[] = database.landmarks;

/**
 * Selects a context-appropriate high-resolution local fallback photo
 * whenever a Wikimedia Commons image is still loading, offline, or unavailable.
 */
export function getFallbackImageForLandmark(landmark: Landmark): string {
  const q = `${landmark.id} ${landmark.name_en} ${landmark.wikimedia_search_query}`.toLowerCase();

  if (q.includes('babylon') || q.includes('ishtar') || q.includes('mustansiriya')) {
    return FALLBACK_IMAGES.babylon;
  }
  if (q.includes('samarra') || q.includes('malwiya') || q.includes('kasra') || q.includes('wasit') || q.includes('ukhaidir')) {
    return FALLBACK_IMAGES.samarra;
  }
  if (q.includes('ur') || q.includes('uruk') || q.includes('eridu') || q.includes('nippur') || q.includes('hatra') || q.includes('ashur') || q.includes('borsippa')) {
    return FALLBACK_IMAGES.ur;
  }
  if (q.includes('marshes') || q.includes('hawizeh') || q.includes('chibayish')) {
    return FALLBACK_IMAGES.marshes;
  }
  if (q.includes('waterfall') || q.includes('dukan') || q.includes('bekhal') || q.includes('ahmad awa') || q.includes('hawraman')) {
    return FALLBACK_IMAGES.waterfalls;
  }
  if (q.includes('citadel') || q.includes('erbil') || q.includes('kirkuk') || q.includes('amadiya') || q.includes('lalish') || q.includes('mattai') || q.includes('delal')) {
    return FALLBACK_IMAGES.erbil;
  }
  if (landmark.category === 'religious') {
    return FALLBACK_IMAGES.shrine;
  }
  if (landmark.category === 'archaeological') {
    return FALLBACK_IMAGES.ur;
  }
  return FALLBACK_IMAGES.hero;
}
