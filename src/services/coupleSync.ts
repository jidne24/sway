/**
 * Couple sync — pushes local store changes to the shared `couples` row.
 *
 * Called fire-and-forget from useCycleStore actions. No-ops when the device
 * isn't paired or Supabase isn't configured, so the offline demo never breaks.
 *
 * Remote changes flow the other way via `useSupabaseSync` →
 * `applyRemoteCouple`, which never pushes back (no update loops).
 */
import { supabase, isSupabaseConfigured } from './supabase';
import type { CoupleUpdate } from '../types/couple';
import { getAuthenticatedUserId } from './auth';

export async function pushCoupleUpdate(
  coupleId: string | null,
  fields: CoupleUpdate,
): Promise<boolean> {
  if (!coupleId || !isSupabaseConfigured) return true;

  try {
    await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from('couples')
      .update(fields)
      .eq('id', coupleId)
      .select('id')
      .maybeSingle();
    if (error) {
      console.warn('[Sway Sync] Update failed:', error.message);
    }
    return !error && Boolean(data);
  } catch (err) {
    console.warn('[Sway Sync] Update error:', err);
    return false;
  }
}
