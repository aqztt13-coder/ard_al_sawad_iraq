import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ckurlrrxifyowuxyqpwe.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_ZSywMuBTNrSMPgF3ThNiJg_9qC7vRoZ';

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_ANON_KEY;

export const SUPABASE_PHOTO_BUCKET = 'landmark-photos';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        cache: 'no-store',
      }),
  },
});
