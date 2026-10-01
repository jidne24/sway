/**
 * User domain types for Sway.
 */

/** The two roles within a Sway couple. */
export type UserRole = 'her' | 'partner';

/** Minimal user profile. */
export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  partnerId?: string;
  /** 6-character pairing code (e.g. "SWAY-88"). */
  pairCode?: string;
  isPremium: boolean;
}
