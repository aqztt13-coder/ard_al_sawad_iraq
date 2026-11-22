export type LandmarkCategory = 'religious' | 'archaeological' | 'nature_tourism';

export type AppView = 'explore' | 'trails' | 'governorates' | 'map' | 'itinerary';

export interface Coordinates {
  lat: number | null;
  lng: number | null;
}

export interface NumericCoordinates {
  lat: number;
  lng: number;
}

export interface ResolvedCoordinates extends NumericCoordinates {
  isApproximate: boolean;
}

export interface CategoryMeta {
  id: LandmarkCategory;
  name_ar: string;
  name_en?: string;
}

export interface DynamicCategoryStat {
  id: LandmarkCategory;
  label_ar: string;
  short_label_ar: string;
  count: number;
}

export interface DatabaseStats {
  totalLandmarks: number;
  totalGovernorates: number;
  unescoCount: number;
  nationalLandmarksCount: number;
  categoryStats: DynamicCategoryStat[];
}

export interface DatabaseMetadata {
  app_name: string;
  app_name_en: string;
  description_ar: string;
  version: string;
  language: string;
  categories: CategoryMeta[];
  total_governorates: number;
  total_landmarks: number;
}

export interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  region: string;
  center_coordinates: Coordinates;
}

export interface Landmark {
  id: string;
  name_ar: string;
  name_en: string;
  governorate_id: string;
  governorate_ar: string;
  category: LandmarkCategory;
  category_ar: string;
  era: string;
  coordinates: Coordinates;
  description_ar: string;
  best_time_to_visit: string;
  visitor_tips: string;
  unesco_site: boolean;
  tags: string[];
  wikimedia_search_query: string;
  google_maps_url: string;
  images?: string[];
  historical_architectural_ar?: string;
  significance_ar?: string;
  dress_code_etiquette_ar?: string;
  accessibility_ar?: string;
}

export interface LandmarksDatabase {
  metadata: DatabaseMetadata;
  governorates: Governorate[];
  landmarks: Landmark[];
}

export interface GovernorateProfile {
  governorate_id: string;
  nicknames_ar: string[];
  overview_ar: string;
  cultural_identity_ar: string;
  traditions_cuisine_ar: string;
  best_time_to_visit_ar: string;
  cover_image_url?: string | null;
}

export interface LandmarkRichContent {
  historical_architectural_ar: string;
  significance_ar: string;
  dress_code_etiquette_ar: string;
  accessibility_ar: string;
}

export interface CuratedTrail {
  id: string;
  title_ar: string;
  subtitle_ar: string;
  description_ar: string;
  duration_ar: string;
  theme_accent: 'gold' | 'lapis' | 'emerald';
  landmark_ids: string[];
}

export interface ItineraryEntry {
  landmarkId: string;
  addedAt: string;
  note: string;
}

export interface LandmarkFilterState {
  query: string;
  category: LandmarkCategory | 'all';
  governorateId: string | 'all';
  unescoOnly: boolean;
}
