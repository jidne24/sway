import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import type { RealPurchases } from './revenuecatNative';
import { useCycleStore } from '../store/useCycleStore';
import { matchesAdvertisedPrice } from '../utils/subscriptionPricing';

export interface SwayPackage {
  identifier: string;
  priceString: string;
  price: number;
  currencyCode: string;
  perMonth: string | null;
  period: 'monthly' | 'annual';
  nativePackage: PurchasesPackage;
}
export interface SwayOfferings { annual: SwayPackage | null; monthly: SwayPackage | null }
export type PurchaseOutcome = 'purchased' | 'cancelled' | 'unavailable' | 'failed' | 'price_mismatch';
let sdk: RealPurchases | null = null;
let initialization: Promise<boolean> | null = null;

function applyEntitlement(info: CustomerInfo): boolean {
  const active = info.entitlements.active.sway_premium?.isActive === true;
  useCycleStore.getState().setPremium(active);
  return active;
}

/** Real SDK only. Missing keys / Expo Go / web never simulate a transaction. */
export function initializePurchases(fallbackKey?: string): Promise<boolean> {
  if (initialization) return initialization;
  initialization = (async () => {
    const platformKey = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
    const apiKey = platformKey?.trim() || fallbackKey?.trim() || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
    if (!apiKey || !['ios', 'android'].includes(Platform.OS)
      || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      useCycleStore.getState().setPremium(false);
      return false;
    }
    try {
      const { loadRealPurchases } = await import('./revenuecatNative');
      const purchases = await loadRealPurchases();
      if (!await purchases.isConfigured()) purchases.configure({ apiKey });
      sdk = purchases;
      purchases.addCustomerInfoUpdateListener(applyEntitlement);
      applyEntitlement(await purchases.getCustomerInfo());
      return true;
    } catch {
      console.warn('[Sway IAP] Store connection unavailable; purchases remain disabled.');
      return false;
    }
  })().then(ready => {
    // Failed configuration can be retried; never create duplicate listeners.
    if (!ready && !sdk) initialization = null;
    return ready;
  });
  return initialization;
}

async function getSDK(): Promise<RealPurchases | null> {
  if (!sdk) await initializePurchases();
  return sdk;
}

function mapPackage(pkg: PurchasesPackage | null, period: SwayPackage['period']): SwayPackage | null {
  if (!pkg) return null;
  return { identifier: pkg.identifier, priceString: pkg.product.priceString,
    price: pkg.product.price, currencyCode: pkg.product.currencyCode,
    perMonth: pkg.product.pricePerMonthString, period, nativePackage: pkg };
}

export async function getOfferings(): Promise<SwayOfferings> {
  const purchases = await getSDK();
  if (!purchases) throw new Error('Purchases are not configured on this build.');
  const offerings = await purchases.getOfferings();
  return { annual: mapPackage(offerings.current?.annual ?? null, 'annual'),
    monthly: mapPackage(offerings.current?.monthly ?? null, 'monthly') };
}

export async function purchasePackage(pkg: SwayPackage): Promise<PurchaseOutcome> {
  const purchases = await getSDK();
  if (!purchases) return 'unavailable';
  try {
    if (!matchesAdvertisedPrice(pkg)) return 'price_mismatch';
    // Re-read the current offering and buy its real native package, never a
    // caller-supplied product or a stale package with different pricing.
    const offerings = await purchases.getOfferings();
    const live = offerings.current?.[pkg.period];
    const current = mapPackage(live ?? null, pkg.period);
    if (!current || current.identifier !== pkg.identifier || !matchesAdvertisedPrice(current)
      || current.nativePackage.product.subscriptionPeriod !== (pkg.period === 'annual' ? 'P1Y' : 'P1M')) return 'price_mismatch';
    const result = await purchases.purchasePackage(current.nativePackage);
    return applyEntitlement(result.customerInfo) ? 'purchased' : 'failed';
  } catch (error) {
    return error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled
      ? 'cancelled' : 'failed';
  }
}

export async function restorePurchases(): Promise<boolean> {
  const purchases = await getSDK();
  if (!purchases) throw new Error('Purchases are unavailable on this build.');
  return applyEntitlement(await purchases.restorePurchases());
}

export async function checkPremiumStatus(): Promise<boolean> {
  const purchases = await getSDK();
  if (!purchases) return false;
  return applyEntitlement(await purchases.getCustomerInfo());
}
