import { useCallback, useEffect, useRef, useState } from 'react';
import { IRAQ_GOVERNORATES, IRAQ_LANDMARKS } from '../data/database';
import {
  buildGovernorateProfilesMap,
  getGovernorateProfile,
} from '../data/governorateProfiles';
import { supabase, SUPABASE_PHOTO_BUCKET, SUPABASE_URL } from '../lib/supabase';
import { GovernorateProfile, Landmark } from '../types/tourism';
import { compressImageFile } from '../utils/imageCompression';
import {
  appendCacheBuster,
  buildSeedGovernoratePayloads,
  buildSeedLandmarkPayloads,
  loadCloudCacheFromStorage,
  mergeGovernorateProfilesWithRemote,
  mergeLandmarksWithRemote,
  sanitizeImageList,
  sanitizeStorageSegment,
  saveCloudCacheToStorage,
  stripQueryFromUrl,
  SupabaseGovernorateRow,
  SupabaseLandmarkRow,
  toSupabaseLandmarkPayload,
} from '../utils/supabaseSync';

const DEFAULT_GOVERNORATE_PROFILES = buildGovernorateProfilesMap(IRAQ_GOVERNORATES);

export interface CloudOperationResult {
  ok: boolean;
  message?: string;
}

function isMissingSchemaError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache') ||
    msg.includes('bucket not found')
  );
}

function isMissingColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === '42703' ||
    err.code === 'PGRST204' ||
    (msg.includes('column') && (msg.includes('does not exist') || msg.includes('could not find')))
  );
}

function formatCloudErrorAr(
  err: { code?: string; message?: string } | null,
  fallback: string
): string {
  if (!err) return fallback;
  const msg = (err.message || '').toLowerCase();
  if (isMissingSchemaError(err)) {
    return 'الخدمة السحابية غير متاحة حالياً. يُرجى المحاولة مجدداً بعد قليل.';
  }
  if (
    err.code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('not authorized')
  ) {
    return 'ليس لديك صلاحية تنفيذ هذا الإجراء. يُرجى التأكد من تسجيل الدخول بحساب المدير.';
  }
  return fallback;
}

function extractBucketPathFromPublicUrl(publicUrl: string): string | null {
  const cleanUrl = stripQueryFromUrl(publicUrl);
  const prefix = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${SUPABASE_PHOTO_BUCKET}/`;
  if (!cleanUrl.startsWith(prefix)) return null;
  const path = decodeURIComponent(cleanUrl.slice(prefix.length));
  if (!path || path.includes('..')) return null;
  return path;
}

export function useCloudData() {
  const [landmarks, setLandmarks] = useState<Landmark[]>(() => {
    const cached = loadCloudCacheFromStorage();
    if (cached && cached.landmarks.length > 0) {
      return cached.landmarks;
    }
    return IRAQ_LANDMARKS;
  });

  const [governorateProfiles, setGovernorateProfiles] = useState<
    Record<string, GovernorateProfile>
  >(() => {
    const cached = loadCloudCacheFromStorage();
    if (cached && Object.keys(cached.governorateProfiles).length > 0) {
      return { ...DEFAULT_GOVERNORATE_PROFILES, ...cached.governorateProfiles };
    }
    return DEFAULT_GOVERNORATE_PROFILES;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    const cached = loadCloudCacheFromStorage();
    return cached?.syncedAt || null;
  });

  // Always mirror latest state in refs so async mutations never overwrite concurrent edits
  const landmarksRef = useRef<Landmark[]>(landmarks);
  const profilesRef = useRef<Record<string, GovernorateProfile>>(governorateProfiles);
  const mutationVersionRef = useRef<number>(0);

  useEffect(() => {
    landmarksRef.current = landmarks;
  }, [landmarks]);

  useEffect(() => {
    profilesRef.current = governorateProfiles;
  }, [governorateProfiles]);

  const persistState = useCallback(
    (
      nextLandmarks: Landmark[],
      nextProfiles: Record<string, GovernorateProfile>,
      isMutation = false
    ) => {
      if (isMutation) {
        mutationVersionRef.current += 1;
      }
      const syncedAt = new Date().toISOString();
      landmarksRef.current = nextLandmarks;
      profilesRef.current = nextProfiles;
      setLandmarks(nextLandmarks);
      setGovernorateProfiles(nextProfiles);
      setLastSyncedAt(syncedAt);
      saveCloudCacheToStorage({
        landmarks: nextLandmarks,
        governorateProfiles: nextProfiles,
        syncedAt,
      });
    },
    []
  );

  const refreshFromCloud = useCallback(async (): Promise<CloudOperationResult> => {
    const startMutationVersion = mutationVersionRef.current;
    setIsSyncing(true);
    try {
      const [landmarksRes, govsRes] = await Promise.all([
        supabase.from('landmarks').select('*'),
        supabase.from('governorates_content').select('*'),
      ]);

      const remoteLandmarks =
        !landmarksRes.error && Array.isArray(landmarksRes.data)
          ? (landmarksRes.data as SupabaseLandmarkRow[])
          : null;
      const remoteGovs =
        !govsRes.error && Array.isArray(govsRes.data)
          ? (govsRes.data as SupabaseGovernorateRow[])
          : null;

      if (!remoteLandmarks && !remoteGovs) {
        return {
          ok: false,
          message: formatCloudErrorAr(
            landmarksRes.error || govsRes.error,
            'تعذر جلب أحدث البيانات حالياً؛ يتم عرض النسخة المحلية المخزنة.'
          ),
        };
      }

      // If an admin mutation committed while this older initial fetch was in flight, do not clobber it
      if (mutationVersionRef.current !== startMutationVersion) {
        return {
          ok: true,
          message: 'تم الحفاظ على أحدث تعديلات المدير المنفّذة للتو.',
        };
      }

      const nextLandmarks =
        remoteLandmarks && remoteLandmarks.length > 0
          ? mergeLandmarksWithRemote(IRAQ_LANDMARKS, remoteLandmarks, IRAQ_GOVERNORATES)
          : IRAQ_LANDMARKS;

      const nextProfiles =
        remoteGovs && remoteGovs.length > 0
          ? mergeGovernorateProfilesWithRemote(
              DEFAULT_GOVERNORATE_PROFILES,
              remoteGovs,
              IRAQ_GOVERNORATES
            )
          : DEFAULT_GOVERNORATE_PROFILES;

      persistState(nextLandmarks, nextProfiles, false);
      return {
        ok: true,
        message: 'تمت مزامنة أحدث البيانات من السحابة بنجاح.',
      };
    } catch {
      return {
        ok: false,
        message: 'التطبيق يعمل حالياً بالوضع غير المتصل (Offline) باستخدام النسخة المحلية.',
      };
    } finally {
      setIsSyncing(false);
    }
  }, [persistState]);

  // Always fetch fresh data from Supabase first on initial app load (and whenever browser reconnects)
  useEffect(() => {
    void refreshFromCloud();
    const handleOnline = () => {
      void refreshFromCloud();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refreshFromCloud]);

  const ensureAuthenticated = async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session?.user);
  };

  const saveLandmark = useCallback(
    async (landmark: Landmark): Promise<CloudOperationResult> => {
      if (!(await ensureAuthenticated())) {
        return { ok: false, message: 'يجب تسجيل الدخول كمدير لإجراء التعديلات.' };
      }

      const sanitizedLandmark: Landmark = {
        ...landmark,
        images: sanitizeImageList(landmark.images ?? []),
      };
      const payload = toSupabaseLandmarkPayload(sanitizedLandmark);

      let { error } = await supabase
        .from('landmarks')
        .upsert(payload, { onConflict: 'id' });

      // Fallback if an older remote table schema is missing optional enrichment columns
      if (error && isMissingColumnError(error)) {
        const minimalPayload = {
          id: sanitizedLandmark.id,
          name_ar: sanitizedLandmark.name_ar,
          name_en: sanitizedLandmark.name_en,
          governorate_id: sanitizedLandmark.governorate_id,
          governorate_ar: sanitizedLandmark.governorate_ar,
          category: sanitizedLandmark.category,
          category_ar: sanitizedLandmark.category_ar,
          era: sanitizedLandmark.era,
          coordinates: sanitizedLandmark.coordinates,
          description_ar: sanitizedLandmark.description_ar,
          best_time_to_visit: sanitizedLandmark.best_time_to_visit,
          visitor_tips: sanitizedLandmark.visitor_tips,
          unesco_site: sanitizedLandmark.unesco_site,
          tags: sanitizedLandmark.tags,
          wikimedia_search_query: sanitizedLandmark.wikimedia_search_query,
          google_maps_url: sanitizedLandmark.google_maps_url,
          images: sanitizedLandmark.images ?? [],
        };
        const retry = await supabase
          .from('landmarks')
          .upsert(minimalPayload, { onConflict: 'id' });
        error = retry.error;
      }

      if (error) {
        return {
          ok: false,
          message: formatCloudErrorAr(error, 'تعذر حفظ بيانات المعلم حالياً. يُرجى المحاولة مجدداً.'),
        };
      }

      const currentLandmarks = landmarksRef.current;
      const exists = currentLandmarks.some((l) => l.id === sanitizedLandmark.id);
      const nextLandmarks = exists
        ? currentLandmarks.map((l) =>
            l.id === sanitizedLandmark.id ? { ...l, ...sanitizedLandmark } : l
          )
        : [sanitizedLandmark, ...currentLandmarks];

      persistState(nextLandmarks, profilesRef.current, true);
      return {
        ok: true,
        message: exists
          ? 'تم تحديث بيانات المعلم ونشرها مباشرة للجميع.'
          : 'تمت إضافة المعلم الجديد ونشره مباشرة للجميع.',
      };
    },
    [persistState]
  );

  const deleteLandmark = useCallback(
    async (landmarkId: string): Promise<CloudOperationResult> => {
      if (!(await ensureAuthenticated())) {
        return { ok: false, message: 'يجب تسجيل الدخول كمدير لحذف المعالم.' };
      }

      const { error } = await supabase
        .from('landmarks')
        .delete()
        .eq('id', landmarkId);

      if (error) {
        return {
          ok: false,
          message: formatCloudErrorAr(error, 'تعذر حذف المعلم حالياً. يُرجى المحاولة مجدداً.'),
        };
      }

      const nextLandmarks = landmarksRef.current.filter((l) => l.id !== landmarkId);
      persistState(nextLandmarks, profilesRef.current, true);
      return { ok: true, message: 'تم حذف المعلم بنجاح.' };
    },
    [persistState]
  );

  const updateLandmarkImages = useCallback(
    async (landmark: Landmark, nextImages: string[]): Promise<CloudOperationResult> => {
      const sanitized = sanitizeImageList(nextImages);
      // Merge with the latest landmark record from ref so no concurrent edits are lost
      const latestLandmark =
        landmarksRef.current.find((item) => item.id === landmark.id) ?? landmark;
      return saveLandmark({
        ...latestLandmark,
        images: sanitized,
      });
    },
    [saveLandmark]
  );

  const updateGovernorateCoverImage = useCallback(
    async (
      governorateId: string,
      coverImageUrl: string | null
    ): Promise<CloudOperationResult> => {
      if (!(await ensureAuthenticated())) {
        return { ok: false, message: 'يجب تسجيل الدخول كمدير لتحديث صورة المحافظة.' };
      }

      const matchedGov = IRAQ_GOVERNORATES.find((g) => g.id === governorateId);
      const currentProfile =
        profilesRef.current[governorateId] ??
        DEFAULT_GOVERNORATE_PROFILES[governorateId] ??
        getGovernorateProfile(governorateId, matchedGov);
      if (!currentProfile) {
        return { ok: false, message: 'المحافظة المحددة غير موجودة.' };
      }

      const updatedProfile: GovernorateProfile = {
        ...currentProfile,
        governorate_id: governorateId,
        cover_image_url: coverImageUrl,
      };

      let { error } = await supabase.from('governorates_content').upsert(
        {
          governorate_id: updatedProfile.governorate_id,
          nicknames_ar: updatedProfile.nicknames_ar,
          overview_ar: updatedProfile.overview_ar,
          cultural_identity_ar: updatedProfile.cultural_identity_ar,
          traditions_cuisine_ar: updatedProfile.traditions_cuisine_ar,
          best_time_to_visit_ar: updatedProfile.best_time_to_visit_ar,
          cover_image_url: updatedProfile.cover_image_url ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'governorate_id' }
      );

      if (error && isMissingColumnError(error)) {
        const retry = await supabase.from('governorates_content').upsert(
          {
            governorate_id: updatedProfile.governorate_id,
            cover_image_url: updatedProfile.cover_image_url ?? null,
          },
          { onConflict: 'governorate_id' }
        );
        error = retry.error;
      }

      if (error) {
        return {
          ok: false,
          message: formatCloudErrorAr(
            error,
            'تعذر حفظ صورة الغلاف للمحافظة حالياً. يُرجى المحاولة مجدداً.'
          ),
        };
      }

      const nextProfiles = {
        ...profilesRef.current,
        [governorateId]: updatedProfile,
      };
      persistState(landmarksRef.current, nextProfiles, true);
      return {
        ok: true,
        message: coverImageUrl
          ? 'تم تحديث صورة غلاف المحافظة بنجاح.'
          : 'تمت إزالة صورة غلاف المحافظة.',
      };
    },
    [persistState]
  );

  const uploadPhotoToBucket = useCallback(
    async (
      file: File,
      folder: 'landmarks' | 'governorates',
      entityId: string
    ): Promise<{ url: string | null; error: string | null }> => {
      if (!(await ensureAuthenticated())) {
        return { url: null, error: 'يجب تسجيل الدخول بحساب المدير لرفع الصور.' };
      }

      try {
        const compressedBlob = await compressImageFile(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.82,
        });

        const safeEntity = sanitizeStorageSegment(entityId);
        const now = Date.now();
        const randomSuffix = Math.random().toString(36).slice(2, 8);
        const objectPath = `${folder}/${safeEntity}/${now}-${randomSuffix}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_PHOTO_BUCKET)
          .upload(objectPath, compressedBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          return {
            url: null,
            error: formatCloudErrorAr(
              uploadError,
              'تعذر رفع الصورة حالياً. يُرجى المحاولة مجدداً.'
            ),
          };
        }

        const { data: publicUrlData } = supabase.storage
          .from(SUPABASE_PHOTO_BUCKET)
          .getPublicUrl(objectPath);

        const bustedPublicUrl = appendCacheBuster(publicUrlData.publicUrl, now);
        return { url: bustedPublicUrl || publicUrlData.publicUrl, error: null };
      } catch (err) {
        return {
          url: null,
          error:
            err instanceof Error
              ? err.message
              : 'تعذر ضغط أو رفع الصورة. يُرجى المحاولة مجدداً.',
        };
      }
    },
    []
  );

  const deletePhotoFromBucket = useCallback(async (publicUrl: string): Promise<void> => {
    const objectPath = extractBucketPathFromPublicUrl(publicUrl);
    if (!objectPath) return;
    try {
      await supabase.storage.from(SUPABASE_PHOTO_BUCKET).remove([objectPath]);
    } catch {
      // Best-effort storage cleanup; DB update still succeeds cleanly
    }
  }, []);

  const seedInitialDataToCloud = useCallback(async (): Promise<CloudOperationResult> => {
    if (!(await ensureAuthenticated())) {
      return { ok: false, message: 'يجب تسجيل الدخول كمدير لرفع البيانات الأولية.' };
    }

    // Preserve any cloud photos already attached in current state
    const existingImagesById = new Map(
      landmarksRef.current.map((l) => [l.id, l.images ?? []])
    );
    const existingCoverByGov = new Map(
      Object.values(profilesRef.current).map((p) => [
        p.governorate_id,
        p.cover_image_url ?? null,
      ])
    );

    const landmarksWithExistingPhotos = IRAQ_LANDMARKS.map((l) => ({
      ...l,
      images: existingImagesById.get(l.id) ?? l.images ?? [],
    }));

    const profilesWithExistingCovers: Record<string, GovernorateProfile> = {};
    for (const [id, profile] of Object.entries(DEFAULT_GOVERNORATE_PROFILES)) {
      profilesWithExistingCovers[id] = {
        ...profile,
        cover_image_url: existingCoverByGov.get(id) ?? profile.cover_image_url ?? null,
      };
    }

    const landmarkPayloads = buildSeedLandmarkPayloads(landmarksWithExistingPhotos);
    const govPayloads = buildSeedGovernoratePayloads(profilesWithExistingCovers);

    const [landmarksRes, govsRes] = await Promise.all([
      supabase.from('landmarks').upsert(landmarkPayloads, { onConflict: 'id' }),
      supabase
        .from('governorates_content')
        .upsert(govPayloads, { onConflict: 'governorate_id' }),
    ]);

    if (landmarksRes.error || govsRes.error) {
      return {
        ok: false,
        message: formatCloudErrorAr(
          landmarksRes.error || govsRes.error,
          'تعذر نشر البيانات الأولية حالياً. يُرجى المحاولة مجدداً.'
        ),
      };
    }

    await refreshFromCloud();
    return {
      ok: true,
      message: `تم حفظ ونشر ${landmarkPayloads.length} معلماً و${govPayloads.length} محافظة بنجاح.`,
    };
  }, [refreshFromCloud]);

  return {
    landmarks,
    governorateProfiles,
    isSyncing,
    lastSyncedAt,
    refreshFromCloud,
    saveLandmark,
    deleteLandmark,
    updateLandmarkImages,
    updateGovernorateCoverImage,
    uploadPhotoToBucket,
    deletePhotoFromBucket,
    seedInitialDataToCloud,
  };
}
