export type LandmarkCategory = 'religious' | 'archaeological' | 'nature_tourism';

export type AppView =
  | 'home'
  | 'explore'
  | 'map'
  | 'governorates'
  | 'archaeological'
  | 'religious'
  | 'nature'
  | 'museum'
  | 'planner'
  | 'trails'
  | 'itinerary'
  | 'culture'
  | 'games'
  | 'guide'
  | 'initiatives'
  | 'about'
  | 'admin';

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
  // Extended verified directory fields (display "غير متوفر حالياً" when unset)
  district_ar?: string;
  civilization_ar?: string;
  visiting_hours_ar?: string;
  entrance_fee_ar?: string;
  expected_duration_ar?: string;
  facilities_ar?: string[];
  safety_guidance_ar?: string;
  official_sources_ar?: string[];
  last_verified_at?: string;
  verification_status?: 'verified' | 'pending_verification';
  publication_status?: 'published' | 'draft';
  family_friendly?: boolean;
  wheelchair_accessible?: boolean;
  video_url?: string;
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
  dayNumber?: number;
}

export type LandmarkSortOption = 'featured' | 'alphabetical' | 'unesco_first' | 'recent';

export interface LandmarkFilterState {
  query: string;
  category: LandmarkCategory | 'all';
  governorateId: string | 'all';
  unescoOnly: boolean;
  civilization?: string;
  familyFriendlyOnly?: boolean;
  accessibleOnly?: boolean;
  sortBy?: LandmarkSortOption;
}

/* ===========================
 * Digital Iraqi Museum & Timeline
 * =========================== */
export type ArtifactLocationType = 'iraq' | 'international';

export interface MuseumArtifact {
  id: string;
  name_ar: string;
  name_en: string;
  civilization_ar: string;
  period_ar: string;
  approximate_date_ar: string;
  category_ar: string;
  material_ar: string;
  discovery_location_ar: string;
  current_location_ar: string;
  collection_location_type: ArtifactLocationType;
  description_ar: string;
  cultural_significance_ar: string;
  museum_reference_ar: string;
  source_references_ar: string[];
  image_url: string;
  related_artifact_ids: string[];
  related_landmark_id?: string;
  verification_status: 'verified' | 'pending_verification';
}

export interface HistoricalTimelineEntry {
  id: string;
  order: number;
  period_ar: string;
  period_en: string;
  approximate_date_ar: string;
  summary_ar: string;
  key_events_ar: string[];
  related_landmark_ids: string[];
  related_artifact_ids: string[];
  scholarly_note_ar: string;
  references_ar: string[];
}

/* ===========================
 * "Live Iraq" Culture, Initiatives & Tourism Services
 * =========================== */
export type CultureTopicCategory =
  | 'cuisine'
  | 'clothing'
  | 'crafts'
  | 'music'
  | 'hospitality'
  | 'architecture'
  | 'markets'
  | 'festivals'
  | 'marshes'
  | 'traditions'
  | 'etiquette'
  | 'seasonal';

export interface CulturalArticle {
  id: string;
  title_ar: string;
  subtitle_ar: string;
  category: CultureTopicCategory;
  category_ar: string;
  read_time_minutes: number;
  image_url: string;
  excerpt_ar: string;
  body_paragraphs_ar: string[];
  regions_ar: string[];
  published_at: string;
  status: 'published' | 'draft';
}

export type TourismServiceType = 'accommodation' | 'restaurant' | 'guide_transport';

export interface TourismServiceListing {
  id: string;
  name_ar: string;
  service_type: TourismServiceType;
  service_type_ar: string;
  governorate_id: string;
  governorate_ar: string;
  area_ar: string;
  description_ar: string;
  price_range_ar: string;
  phone?: string;
  whatsapp?: string;
  website_url?: string;
  image_url: string;
  verification_status: 'verified' | 'pending_verification';
  features_ar: string[];
}

export interface NationalInitiative {
  id: string;
  title_ar: string;
  category_ar: string;
  summary_ar: string;
  objectives_ar: string[];
  status_ar: string;
  related_governorates_ar: string[];
  image_url: string;
}

/* ===========================
 * Visitor Reviews & Moderation
 * =========================== */
export interface VisitorReview {
  id: string;
  landmarkId: string;
  landmarkNameAr: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: 'approved' | 'pending' | 'hidden';
  reportedCount: number;
  reportReasons?: string[];
}

/* ===========================
 * Smart Travel Planner
 * =========================== */
export type TravelPartyType = 'individual' | 'family' | 'group';
export type TravelBudgetTier = 'economy' | 'moderate' | 'comfort';
export type TransportPreference = 'private_car' | 'public_intercity' | 'guided_tour';

export interface SmartTripRequest {
  startGovernorateId: string;
  destinationGovernorateId: string | 'all';
  days: number;
  interests: LandmarkCategory[];
  partyType: TravelPartyType;
  budget: TravelBudgetTier;
  transport: TransportPreference;
}

export interface TripStopPlan {
  landmark: Landmark;
  estimatedDurationHours: number;
  distanceFromPreviousKm: number | null;
  note: string;
}

export interface TripDayPlan {
  dayNumber: number;
  title_ar: string;
  stops: TripStopPlan[];
  totalStraightLineKm: number;
}

export interface GeneratedTripPlan {
  id: string;
  title_ar: string;
  createdAt: string;
  request: SmartTripRequest;
  days: TripDayPlan[];
  totalStops: number;
  totalStraightLineKm: number;
}

/* ===========================
 * Admin Dashboard, Settings, Analytics & Audit
 * =========================== */
export interface HomepageSectionsConfig {
  featuredDestinations: boolean;
  governoratesGrid: boolean;
  archaeologicalHighlights: boolean;
  religiousLandmarks: boolean;
  marshlandsNature: boolean;
  recommendedItineraries: boolean;
  museumHighlights: boolean;
  culturalExperiences: boolean;
  seasonalRecommendations: boolean;
  latestStories: boolean;
  nationalInitiatives: boolean;
  newsletterSignup: boolean;
}

export interface SiteSettingsConfig {
  siteTitleAr: string;
  heroHeadlineAr: string;
  heroSubtitleAr: string;
  metaDescriptionAr: string;
  homepageSections: HomepageSectionsConfig;
}

export interface PlatformAnalytics {
  destinationViews: Record<string, number>;
  governorateViews: Record<string, number>;
  artifactViews: Record<string, number>;
  searchTerms: Record<string, number>;
  itinerarySavesCount: number;
  newsletterSubscribersCount: number;
}

export interface AuditLogEntry {
  id: string;
  action_ar: string;
  entity_type: string;
  entity_id?: string;
  details_ar: string;
  timestamp: string;
}
