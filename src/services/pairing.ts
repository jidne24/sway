/**
 * Pairing service — Supabase-backed couple linking.
 *
 * Her device generates a 6-character code (INSERT into `couples` with
 * `her_uuid` = the authenticated anonymous user). The partner joins through
 * an atomic authenticated RPC. Both sides then share
 * one row, synced via Realtime.
 *
 * Every function degrades gracefully when Supabase env vars are missing:
 * returns a failure result instead of throwing, so the offline demo keeps
 * working.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import { getAuthenticatedUserId } from './auth';
import { useCycleStore } from '../store/useCycleStore';
import { getRandomBytesAsync } from 'expo-crypto';

// ─── Code generation ─────────────────────────────────────────────────────────

/** Unambiguous alphabet (no 0/O, 1/I) for spoken/typed codes. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export async function randomPairCode(length = 6): Promise<string> {
  const bytes = await getRandomBytesAsync(length);
  // 32 symbols divide 256 exactly, so modulo does not introduce bias.
  return Array.from(bytes, byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

// ─── Generate (her device) ───────────────────────────────────────────────────

export interface GeneratedPair {
  code: string;
  coupleId: string;
}

/**
 * Insert a new `couples` row owned by this device.
 * Returns null when Supabase is unconfigured or the insert fails.
 */
export async function generatePairCode(): Promise<GeneratedPair | null> {
  if (!isSupabaseConfigured) {
    console.log('[Sway Pairing] Supabase not configured — offline demo mode.');
    return null;
  }

  const { lastPeriodStartDate, cycleLength, periodLength, shareCalendarWithPartner } =
    useCycleStore.getState();

  try {
    const deviceId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from('couples')
      .insert({
        pairing_code: await randomPairCode(),
        her_uuid: deviceId,
        cycle_start_date: lastPeriodStartDate,
        cycle_length: cycleLength,
        period_length: periodLength,
        share_calendar_with_partner: shareCalendarWithPartner,
        symptoms: [],
      })
      .select('id, pairing_code')
      .single();

    if (error || !data) {
      console.warn('[Sway Pairing] Failed to create couple row:', error?.message);
      return null;
    }
    return { code: data.pairing_code as string, coupleId: data.id as string };
  } catch (err) {
    console.warn('[Sway Pairing] Generate error:', err);
    return null;
  }
}

// ─── Join (partner device) ───────────────────────────────────────────────────

export type JoinOutcome =
  | { status: 'joined'; coupleId: string }
  | { status: 'not_found' | 'own_code' | 'unavailable' };

/**
 * Look up a couple by pairing code and claim the `partner_uuid` slot.
 * Idempotent: re-joining from the same device returns `joined` again.
 */
export async function joinWithPairCode(rawCode: string): Promise<JoinOutcome> {
  if (!isSupabaseConfigured) {
    return { status: 'unavailable' };
  }

  const code = rawCode.trim().toUpperCase();

  try {
    await getAuthenticatedUserId();
    const { data, error } = await supabase.rpc('join_couple', { pairing_code_input: code });
    if (error || !data) return { status: 'unavailable' };
    if (data.status === 'joined' && typeof data.coupleId === 'string') return { status: 'joined', coupleId: data.coupleId };
    return { status: data.status === 'own_code' ? 'own_code' : 'not_found' };
  } catch (err) {
    console.warn('[Sway Pairing] Join error:', err);
    return { status: 'unavailable' };
  }
}
