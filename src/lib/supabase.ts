import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

/**
 * True only when both public Supabase client environment variables are configured.
 * No live project URLs, keys, or service-role secrets are hardcoded in source code.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const SUPABASE_PHOTO_BUCKET = 'landmark-photos';

// Safe non-routable fallback used strictly when env vars are unset so module import
// never crashes offline previews or unit tests; all runtime cloud operations guard
// on `isSupabaseConfigured` before issuing any network request.
const FALLBACK_UNCONFIGURED_URL = 'https://unconfigured.invalid';
const FALLBACK_UNCONFIGURED_KEY = 'unconfigured-public-key';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? SUPABASE_URL : FALLBACK_UNCONFIGURED_URL,
  isSupabaseConfigured ? SUPABASE_ANON_KEY : FALLBACK_UNCONFIGURED_KEY,
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: 'no-store',
        }),
    },
  }
);
