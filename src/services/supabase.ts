/**
 * Supabase client configuration for Sway.
 *
 * Credentials come from EXPO_PUBLIC_* env vars. If they are missing OR
 * malformed, the app falls back to offline demo mode
 * (isSupabaseConfigured = false) with a placeholder client, so a bad .env
 * can never crash the app at startup.
 */
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ENV_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ENV_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Loose sanity check on the project URL. createClient() throws at module
 * evaluation time for a malformed URL — and this module is imported at app
 * startup, so we validate before ever calling it.
 */
function looksLikeSupabaseUrl(url: string): boolean {
  return /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(url);
}

/**
 * True only when real, well-formed credentials are provided via env vars.
 * When false, pairing/sync silently no-op and the app runs in offline demo mode.
 */
export const isSupabaseConfigured = Boolean(
  ENV_URL && ENV_ANON_KEY && looksLikeSupabaseUrl(ENV_URL),
);

if ((ENV_URL || ENV_ANON_KEY) && !isSupabaseConfigured) {
  console.warn(
    '[Sway] Supabase env vars are missing or malformed — running in ' +
      'offline demo mode. Expected format: https://<project>.supabase.co',
  );
}

const SUPABASE_URL =
  isSupabaseConfigured && ENV_URL
    ? ENV_URL
    : 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY =
  isSupabaseConfigured && ENV_ANON_KEY ? ENV_ANON_KEY : 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
