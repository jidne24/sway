import { getAuthenticatedUserId } from './auth';
import { isSupabaseConfigured, supabase } from './supabase';

/** Never fall back to a local-only unlink when a real server pair exists. */
export async function revokePartnerAccess(coupleId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    await getAuthenticatedUserId();
    const { data, error } = await supabase.rpc('revoke_partner_access', { target_couple: coupleId });
    return !error && data === true;
  } catch { return false; }
}

/** Only the currently authenticated partner can leave; her biological data is untouched. */
export async function leaveCouple(coupleId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    await getAuthenticatedUserId();
    const { data, error } = await supabase.rpc('leave_couple', { target_couple: coupleId });
    return !error && data === true;
  } catch { return false; }
}

export async function acknowledgeSOS(coupleId: string | null): Promise<void> {
  if (!coupleId || !isSupabaseConfigured) return;
  try {
    await getAuthenticatedUserId();
    const { error } = await supabase.rpc('acknowledge_sos', { target_couple: coupleId });
    if (error) console.warn('[Sway] SOS acknowledgement could not sync.');
  } catch { console.warn('[Sway] SOS acknowledgement could not sync.'); }
}
