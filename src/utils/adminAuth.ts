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
  let candidate: unknown = appMetadata;
  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (!trimmed.startsWith('{')) return false;
    try {
      candidate = JSON.parse(trimmed);
    } catch {
      return false;
    }
  }

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return false;
  }

  const meta = candidate as Record<string, unknown>;

  if (typeof meta.role === 'string' && meta.role.trim().toLowerCase() === 'admin') {
    return true;
  }

  if (typeof meta.app_role === 'string' && meta.app_role.trim().toLowerCase() === 'admin') {
    return true;
  }

  if (
    Array.isArray(meta.roles) &&
    meta.roles.some((r) => typeof r === 'string' && r.trim().toLowerCase() === 'admin')
  ) {
    return true;
  }

  if (
    meta.is_admin === true ||
    (typeof meta.is_admin === 'string' && meta.is_admin.trim().toLowerCase() === 'true')
  ) {
    return true;
  }

  return false;
}

function normalizeUnixSeconds(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  // Normalize millisecond timestamps defensively if ever encountered
  return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
}

/**
 * Checks whether a Supabase JWT access token itself carries a trusted admin claim
 * (`app_metadata` or signed top-level `app_role`/`is_admin`) required by Postgres RLS.
 *
 * SECURITY:
 *   - Explicitly NEVER trusts `user_metadata` or default `role: "authenticated"`.
 */
export function hasJwtAdminClaim(accessToken: string | undefined | null): boolean {
  const claims = decodeJwtClaims(accessToken);
  if (!claims) return false;

  if (hasAdminClaimInObject(claims.app_metadata)) {
    return true;
  }
  if (
    typeof claims.app_role === 'string' &&
    claims.app_role.trim().toLowerCase() === 'admin'
  ) {
    return true;
  }
  if (
    claims.is_admin === true ||
    (typeof claims.is_admin === 'string' && claims.is_admin.trim().toLowerCase() === 'true')
  ) {
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
 * Checks whether a session (and optional server-verified user) carries a trusted
 * admin claim, without comparing against the browser's local clock.
 * Use this ONLY for sessions whose validity has been verified by Supabase Auth,
 * or combined with an explicit expiration check.
 */
export function hasTrustedAdminRoleInSession(
  session: Pick<Session, 'access_token' | 'user' | 'expires_at'> | null | undefined,
  verifiedUser?: Pick<User, 'id' | 'app_metadata'> | null
): boolean {
  if (!session) return false;
  if (verifiedUser && isAuthorizedAdminUser(verifiedUser)) {
    return true;
  }
  if (session.user && isAuthorizedAdminUser(session.user)) {
    return true;
  }
  if (hasJwtAdminClaim(session.access_token)) {
    return true;
  }
  return false;
}

export interface AdminSessionCheckOptions {
  /**
   * Skip comparing `expires_at` / JWT `exp` against local `Date.now()`.
   * Only set this when Supabase Auth has already verified the token server-side
   * (e.g., via `getUser()` or a fresh `signInWithPassword()` response), so client
   * clock skew cannot lock out a legitimate administrator.
   */
  ignoreClientClockExpiry?: boolean;
  verifiedUser?: Pick<User, 'id' | 'app_metadata'> | null;
}

/**
 * Checks whether a Supabase Session belongs to an authorized administrator via
 * trusted `user.app_metadata` or server-signed JWT custom claims (`app_metadata`,
 * `app_role`, `is_admin`).
 *
 * By default also checks JWT `exp` / `expires_at` against `nowSeconds` so expired
 * unverified cached tokens are rejected.
 */
export function isAuthorizedAdminSession(
  session: Pick<Session, 'access_token' | 'user' | 'expires_at'> | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  options?: AdminSessionCheckOptions
): boolean {
  if (!session || (!session.user && !options?.verifiedUser)) return false;

  if (!options?.ignoreClientClockExpiry) {
    const expiresAt = normalizeUnixSeconds(session.expires_at);
    if (expiresAt !== null && expiresAt <= nowSeconds) {
      return false;
    }

    const claims = decodeJwtClaims(session.access_token);
    const jwtExp = normalizeUnixSeconds(claims?.exp);
    if (jwtExp !== null && jwtExp <= nowSeconds) {
      return false;
    }
  }

  return hasTrustedAdminRoleInSession(session, options?.verifiedUser);
}

export interface SupabaseAuthLike {
  getSession: () => Promise<{
    data: { session: Session | null };
    error?: { message?: string; status?: number } | null;
  }>;
  getUser: (jwt?: string) => Promise<{
    data: { user: User | null };
    error: { message?: string; status?: number } | null;
  }>;
  refreshSession: () => Promise<{
    data: { session: Session | null; user: User | null };
    error: { message?: string; status?: number } | null;
  }>;
}

export interface AdminSessionVerificationResult {
  authorized: boolean;
  session: Session | null;
  user: User | null;
  reason: 'authorized' | 'no_session' | 'not_admin' | 'session_expired' | 'network_error';
}

function isLikelyNetworkAuthError(error: { message?: string; status?: number } | null | undefined): boolean {
  if (!error) return false;
  if (typeof error.status === 'number' && (error.status === 0 || error.status >= 500)) {
    return true;
  }
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('offline') ||
    msg.includes('load failed')
  );
}

/**
 * Authoritatively verifies a Supabase session for admin access:
 * 1. Validates the access token against Supabase Auth (`getUser(access_token)`),
 *    which enforces server-side JWT signature & expiration (immune to client clock skew)
 *    and fetches the latest `app_metadata` from `auth.users`.
 * 2. If `getUser` rejects a stale/expired token, attempts one `refreshSession()` and
 *    re-verifies the refreshed token.
 * 3. If `user.app_metadata` grants admin but the current JWT does not yet carry the
 *    admin claim (e.g. role granted while a session was cached), refreshes the session
 *    so Postgres RLS (`auth.jwt() -> 'app_metadata'`) also receives the updated JWT.
 * 4. Strictly enforces RBAC via `app_metadata` / signed JWT claims ONLY (never `user_metadata`).
 */
export async function verifyAuthorizedAdminSession(
  authClient: SupabaseAuthLike,
  options?: {
    candidateSession?: Session | null;
    candidateUser?: User | null;
    /**
     * True immediately after `signInWithPassword` returns a fresh server-issued session.
     * If `getUser()` hits a transient network error right after sign-in, allows falling
     * back to the fresh server-issued session's trusted `app_metadata` claims.
     */
    isFreshSignIn?: boolean;
  }
): Promise<AdminSessionVerificationResult> {
  let activeSession = options?.candidateSession ?? null;
  if (!activeSession) {
    try {
      const { data } = await authClient.getSession();
      activeSession = data.session ?? null;
    } catch {
      return { authorized: false, session: null, user: null, reason: 'network_error' };
    }
  }

  if (!activeSession || !activeSession.access_token) {
    return { authorized: false, session: null, user: null, reason: 'no_session' };
  }

  const validateAgainstServer = async (
    sessionToCheck: Session
  ): Promise<{
    serverUser: User | null;
    error: { message?: string; status?: number } | null;
  }> => {
    try {
      const { data, error } = await authClient.getUser(sessionToCheck.access_token);
      return { serverUser: data.user ?? null, error: error ?? null };
    } catch (err) {
      return {
        serverUser: null,
        error: {
          message: err instanceof Error ? err.message : 'network error',
          status: 0,
        },
      };
    }
  };

  let { serverUser, error: userError } = await validateAgainstServer(activeSession);

  // If the server rejected an expired/stale access token (non-network error), try one refresh
  if ((userError || !serverUser) && !isLikelyNetworkAuthError(userError)) {
    try {
      const { data: refreshed, error: refreshError } = await authClient.refreshSession();
      if (!refreshError && refreshed.session?.access_token) {
        activeSession = refreshed.session;
        const retry = await validateAgainstServer(activeSession);
        serverUser = retry.serverUser;
        userError = retry.error;
      }
    } catch {
      // Fall through to error handling below
    }
  }

  // Handle network/offline failure gracefully without misreporting permissions
  if (userError && isLikelyNetworkAuthError(userError)) {
    const fallbackUser = options?.candidateUser ?? activeSession.user ?? null;
    const allowed = options?.isFreshSignIn
      ? hasTrustedAdminRoleInSession(activeSession, fallbackUser)
      : isAuthorizedAdminSession(activeSession, undefined, { verifiedUser: fallbackUser });

    if (allowed) {
      const resolvedSession: Session = fallbackUser
        ? { ...activeSession, user: fallbackUser }
        : activeSession;
      return {
        authorized: true,
        session: resolvedSession,
        user: resolvedSession.user ?? null,
        reason: 'authorized',
      };
    }

    return {
      authorized: false,
      session: null,
      user: null,
      reason: options?.isFreshSignIn ? 'not_admin' : 'network_error',
    };
  }

  if (userError || !serverUser) {
    return { authorized: false, session: null, user: null, reason: 'session_expired' };
  }

  // If `auth.users.raw_app_meta_data` grants admin, ensure the active JWT also carries
  // the admin claim so Supabase Postgres RLS policies recognize the role immediately.
  if (isAuthorizedAdminUser(serverUser) && !hasJwtAdminClaim(activeSession.access_token)) {
    try {
      const { data: refreshed, error: refreshError } = await authClient.refreshSession();
      if (!refreshError && refreshed.session?.access_token) {
        activeSession = refreshed.session;
        if (refreshed.user) {
          serverUser = refreshed.user;
        }
      }
    } catch {
      // Keep verified session even if opportunistic refresh fails
    }
  }

  const resolvedSession: Session = {
    ...activeSession,
    user: serverUser,
  };

  if (!hasTrustedAdminRoleInSession(resolvedSession, serverUser)) {
    return { authorized: false, session: null, user: null, reason: 'not_admin' };
  }

  return {
    authorized: true,
    session: resolvedSession,
    user: serverUser,
    reason: 'authorized',
  };
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
