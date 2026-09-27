/**
 * User-related type definitions for Sway.
 */

/** Roles within a paired couple. */
export type UserRole = 'her' | 'partner';

/** Minimal user profile. */
export interface UserProfile {
  id: string;
  displayName: string;
  role: UserRole;
  /** The partner code used for pairing. */
  pairCode: string | null;
  /** The paired partner's user ID, if linked. */
  partnerId: string | null;
  createdAt: string;
}

/** Authentication state for the current session. */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  accessToken: string | null;
}
