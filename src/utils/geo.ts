import {
  Governorate,
  Landmark,
  NumericCoordinates,
} from '../types/tourism';
import { resolveLandmarkCoordinates } from './coordinates';

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates great-circle distance in kilometers between two numeric coordinates
 * using the Haversine formula.
 */
export function haversineDistanceKm(
  from: NumericCoordinates,
  to: NumericCoordinates
): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const a =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  return EARTH_RADIUS_KM * c;
}

/**
 * Formats a distance in kilometers into clean Arabic display text.
 */
export function formatDistanceAr(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return '';
  }
  if (distanceKm < 1) {
    return 'يبعد أقل من 1 كم';
  }
  if (distanceKm < 10) {
    const roundedOneDecimal = Math.round(distanceKm * 10) / 10;
    const formatted = Number.isInteger(roundedOneDecimal)
      ? String(roundedOneDecimal)
      : roundedOneDecimal.toFixed(1);
    return `يبعد ${formatted} كم`;
  }
  return `يبعد ${Math.round(distanceKm)} كم`;
}

export interface LandmarkWithDistance {
  landmark: Landmark;
  distanceKm: number;
}

/**
 * Returns a new array of landmarks paired with their Haversine distance
 * from `origin`, sorted from closest to farthest.
 * Gracefully resolves missing/null landmark coordinates via governorate centers.
 */
export function sortLandmarksByDistance(
  landmarks: Landmark[],
  origin: NumericCoordinates,
  governorates: Governorate[] = []
): LandmarkWithDistance[] {
  return landmarks
    .map((landmark) => {
      const resolved = resolveLandmarkCoordinates(landmark, governorates);
      return {
        landmark,
        distanceKm: haversineDistanceKm(origin, resolved),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Computes approximate total straight-line route distance along consecutive stops.
 */
export function calculateTrailDistanceKm(
  stops: Landmark[],
  governorates: Governorate[] = []
): number {
  if (stops.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < stops.length - 1; i += 1) {
    const from = resolveLandmarkCoordinates(stops[i], governorates);
    const to = resolveLandmarkCoordinates(stops[i + 1], governorates);
    total += haversineDistanceKm(from, to);
  }
  return Math.round(total);
}

/**
 * Returns the closest `limit` landmarks to `target` (excluding `target` itself),
 * ordered ascending by Haversine distance.
 */
export function getNearbyLandmarks(
  target: Landmark,
  allLandmarks: Landmark[],
  limit: number = 3,
  governorates: Governorate[] = []
): LandmarkWithDistance[] {
  const targetCoords = resolveLandmarkCoordinates(target, governorates);
  return allLandmarks
    .filter((item) => item.id !== target.id)
    .map((landmark) => {
      const candidateCoords = resolveLandmarkCoordinates(landmark, governorates);
      return {
        landmark,
        distanceKm: haversineDistanceKm(targetCoords, candidateCoords),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, Math.max(0, limit));
}
