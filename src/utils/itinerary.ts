import { ItineraryEntry } from '../types/tourism';

export const ITINERARY_STORAGE_KEY = 'ard_alsawad_itinerary_v1';

export function isSavedInItinerary(entries: ItineraryEntry[], landmarkId: string): boolean {
  return entries.some((entry) => entry.landmarkId === landmarkId);
}

export function toggleItineraryEntry(
  entries: ItineraryEntry[],
  landmarkId: string,
  nowIso: string = new Date().toISOString()
): ItineraryEntry[] {
  if (isSavedInItinerary(entries, landmarkId)) {
    return entries.filter((entry) => entry.landmarkId !== landmarkId);
  }
  return [...entries, { landmarkId, addedAt: nowIso, note: '' }];
}

export function updateItineraryNote(
  entries: ItineraryEntry[],
  landmarkId: string,
  note: string
): ItineraryEntry[] {
  return entries.map((entry) =>
    entry.landmarkId === landmarkId ? { ...entry, note: note.slice(0, 280) } : entry
  );
}

export function moveItineraryEntry(
  entries: ItineraryEntry[],
  landmarkId: string,
  direction: 'up' | 'down'
): ItineraryEntry[] {
  const index = entries.findIndex((entry) => entry.landmarkId === landmarkId);
  if (index === -1) return entries;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= entries.length) return entries;
  const copy = [...entries];
  const [moved] = copy.splice(index, 1);
  copy.splice(targetIndex, 0, moved);
  return copy;
}

export function serializeItinerary(entries: ItineraryEntry[]): string {
  return JSON.stringify(entries);
}

export function deserializeItinerary(raw: string | null): ItineraryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is ItineraryEntry =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.landmarkId === 'string' &&
          item.landmarkId.length > 0
      )
      .map((item) => ({
        landmarkId: item.landmarkId,
        addedAt: typeof item.addedAt === 'string' ? item.addedAt : new Date().toISOString(),
        note: typeof item.note === 'string' ? item.note : '',
      }));
  } catch {
    return [];
  }
}

export function loadItineraryFromStorage(): ItineraryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return deserializeItinerary(window.localStorage.getItem(ITINERARY_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveItineraryToStorage(entries: ItineraryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ITINERARY_STORAGE_KEY, serializeItinerary(entries));
  } catch {
    // Ignore storage quota / private-mode write failures cleanly
  }
}
