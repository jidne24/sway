/**
 * In-App Purchase type definitions for Sway.
 */

/** Available subscription tiers. */
export type SubscriptionTier = 'free' | 'premium';

/** Entitlement identifiers used with RevenueCat. */
export type EntitlementId = 'sway_premium';

/** Current subscription state. */
export interface SubscriptionState {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt: string | null;
}

/** A purchasable offering surfaced on the paywall. */
export interface PaywallOffering {
  identifier: string;
  title: string;
  description: string;
  priceString: string;
  /** Duration in months. */
  periodMonths: number;
}
