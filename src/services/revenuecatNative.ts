/**
 * RevenueCat native bridge — the ONLY file in the app that references the
 * `react-native-purchases` package.
 *
 * This module is loaded exclusively via dynamic import() from
 * `src/services/revenuecat.ts`, and only when NOT running inside Expo Go
 * (where the native module does not exist). Metro includes it in the bundle
 * but never evaluates it at startup, so the reference below can never crash
 * Expo Go.
 */

/**
 * Type of the real Purchases SDK default export. Type-only — erased at
 * compile time, never resolved at runtime.
 */
export type RealPurchases = typeof import('react-native-purchases').default;

/**
 * Resolve the real RevenueCat SDK. Kept behind a dynamic import() so the
 * native module is only ever evaluated on demand, inside a real build.
 */
export async function loadRealPurchases(): Promise<RealPurchases> {
  const mod = await import('react-native-purchases');
  return mod.default;
}
