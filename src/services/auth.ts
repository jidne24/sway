import { isSupabaseConfigured, supabase } from './supabase';

let signingIn: Promise<string> | null = null;

/** Anonymous Supabase sessions provide an authenticated identity without a login UI. */
export async function getAuthenticatedUserId(): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('Online pairing is not configured.');
  if (!signingIn) {
    signingIn = (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (session) return session.user.id;
      const result = await supabase.auth.signInAnonymously();
      if (result.error || !result.data.user) throw result.error ?? new Error('Anonymous sign-in is unavailable.');
      return result.data.user.id;
    })().finally(() => { signingIn = null; });
  }
  return signingIn;
}
