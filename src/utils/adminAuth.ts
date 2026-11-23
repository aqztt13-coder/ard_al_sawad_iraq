import type { Session, User } from '@supabase/supabase-js';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

/** Maximum raw client upload file size before compression (8 MB). */
export const MAX_RAW_UPLOAD_BYTES = 8 * 1024 * 1024;
/** Maximum compressed payload uploaded to Supabase Storage (5 MB, matches bucket policy). */
export const MAX_STORAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface JwtClaimsPayload {
  app_metadata?: {
    role?: unknown;
    roles?: unknown;
  };
  user_metadata?: Record<string, unknown>;
  app_role?: unknown;
  is_admin?: unknown;
  role?: unknown;
  exp?: unknown;
}

/**
 * Decodes the payload segment of a JWT string without performing cryptographic
 * verification (cryptographic signature verification is enforced by Supabase Auth
 * and Postgres RLS on every request). Returns null for malformed tokens.
 */
export function decodeJwtClaims(accessToken: string | undefined | null): JwtClaimsPayload | null {
  if (!accessToken || typeof accessToken !== 'string') return null;
  const parts = accessToken.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    let jsonText: string;
    if (typeof globalThis.atob === 'function') {
      const binary = globalThis.atob(padded);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      jsonText = new TextDecoder().decode(bytes);
    } else if (typeof Buffer !== 'undefined') {
      jsonText = Buffer.from(padded, 'base64').toString('utf-8');
    } else {
      return null;
    }

    const parsed = JSON.parse(jsonText);
    return parsed && typeof parsed === 'object' ? (parsed as JwtClaimsPayload) : null;
  } catch {
    return null;
  }
}

function hasAdminClaimInObject(appMetadata: unknown): boolean {
  if (!appMetadata || typeof appMetadata !== 'object') return false;
  const meta = appMetadata as Record<string, unknown>;

  if (typeof meta.role === 'string' && meta.role.trim().toLowerCase() === 'admin') {
    return true;
  }

  if (
    Array.isArray(meta.roles) &&
    meta.roles.some((r) => typeof r === 'string' && r.trim().toLowerCase() === 'admin')
  ) {
    return true;
  }

  if (meta.is_admin === true) {
    return true;
  }

  return false;
}

/**
 * Checks whether a Supabase User carries a trusted server-controlled admin role
 * inside `app_metadata`.
 *
 * SECURITY:
 *   - Explicitly NEVER trusts `user.user_metadata` (client-writable via updateUser).
 *   - Explicitly NEVER grants admin simply because a user is authenticated.
 */
export function isAuthorizedAdminUser(
  user: Pick<User, 'id' | 'app_metadata'> | null | undefined
): boolean {
  if (!user || typeof user.id !== 'string' || !user.id.trim()) {
    return false;
  }
  return hasAdminClaimInObject(user.app_metadata);
}

/**
 * Checks whether a Supabase Session belongs to an authorized administrator via
 * trusted `user.app_metadata` or server-signed JWT custom claims (`app_metadata`,
 * `app_role`, `is_admin`).
 *
 * Also checks JWT `exp` when present so expired cached tokens are rejected.
 */
export function isAuthorizedAdminSession(
  session: Pick<Session, 'access_token' | 'user' | 'expires_at'> | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!session || !session.user) return false;

  if (typeof session.expires_at === 'number' && session.expires_at <= nowSeconds) {
    return false;
  }

  const claims = decodeJwtClaims(session.access_token);
  if (claims && typeof claims.exp === 'number' && claims.exp <= nowSeconds) {
    return false;
  }

  if (isAuthorizedAdminUser(session.user)) {
    return true;
  }

  if (claims) {
    if (hasAdminClaimInObject(claims.app_metadata)) {
      return true;
    }
    if (
      typeof claims.app_role === 'string' &&
      claims.app_role.trim().toLowerCase() === 'admin'
    ) {
      return true;
    }
    if (claims.is_admin === true) {
      return true;
    }
  }

  return false;
}

export interface UploadFileMetadata {
  name: string;
  type: string;
  size: number;
}

/**
 * Validates an image file before compression and upload to the `landmark-photos` bucket.
 * Blocks non-image files, SVGs (XSS risk), oversized files, and suspicious filenames.
 */
export function validateImageUploadFile(
  file: UploadFileMetadata | null | undefined,
  maxBytes: number = MAX_RAW_UPLOAD_BYTES
): { ok: boolean; errorAr?: string } {
  if (!file) {
    return { ok: false, errorAr: 'لم يتم اختيار ملف صورة صالح.' };
  }

  const cleanName = (file.name || '').trim();
  if (!cleanName || cleanName.includes('..') || cleanName.includes('/') || cleanName.includes('\\')) {
    return { ok: false, errorAr: 'اسم الملف غير صالح.' };
  }

  const ext = cleanName.includes('.')
    ? cleanName.slice(cleanName.lastIndexOf('.') + 1).toLowerCase()
    : '';
  const mime = (file.type || '').trim().toLowerCase();

  if (!ALLOWED_IMAGE_MIME_TYPES.has(mime) || !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      errorAr: 'يُسمح فقط برفع الصور بصيغة JPEG أو PNG أو WebP.',
    };
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, errorAr: 'ملف الصورة فارغ أو تالف.' };
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      ok: false,
      errorAr: `حجم الصورة يتجاوز الحد الأقصى المسموح به (${maxMb} ميجابايت).`,
    };
  }

  return { ok: true };
}

/**
 * Validates a storage object path before attempting upload or deletion against `landmark-photos`.
 */
export function isValidPhotoStoragePath(objectPath: string): boolean {
  if (!objectPath || typeof objectPath !== 'string') return false;
  if (objectPath.includes('..') || objectPath.startsWith('/') || objectPath.includes('\\')) {
    return false;
  }
  const parts = objectPath.split('/');
  if (parts.length !== 3) return false;
  const [folder, entitySegment, fileName] = parts;
  if (folder !== 'landmarks' && folder !== 'governorates') return false;
  if (!/^[a-z0-9_-]{1,80}$/i.test(entitySegment)) return false;
  if (!/^[a-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(fileName)) return false;
  return true;
}
