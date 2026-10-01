/**
 * Supabase `couples` table mapping for Sway.
 *
 * Mirrors supabase/schema.sql — keep both in sync.
 */
import type { SOSAlertType } from './cycle';

/** A full row from the `couples` table. */
export interface CoupleRow {
  id: string;
  pairing_code: string;
  her_uuid: string | null;
  partner_uuid: string | null;
  /** ISO date string (yyyy-mm-dd). */
  cycle_start_date: string | null;
  cycle_length: number | null;
  period_length: number | null;
  share_calendar_with_partner: boolean;
  /** jsonb array of symptom IDs. */
  symptoms: string[] | null;
  sos_active: boolean | null;
  sos_type: SOSAlertType | null;
  sos_message: string | null;
}

/** Fields the app is allowed to push to the shared row. */
export type CoupleUpdate = Partial<
  Pick<
    CoupleRow,
    | 'partner_uuid'
    | 'cycle_start_date'
    | 'cycle_length'
    | 'period_length'
    | 'share_calendar_with_partner'
    | 'symptoms'
    | 'sos_active'
    | 'sos_type'
    | 'sos_message'
  >
>;
