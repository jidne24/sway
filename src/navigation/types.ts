/**
 * Navigation type definitions for Sway.
 */
import type { UserRole } from '../types/user';
import type { NavigatorScreenParams } from '@react-navigation/native';

/** Root stack param list. */
export type RootStackParamList = {
  Onboarding: undefined;
  PartnerAccess: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Paywall: undefined;
  /**
   * Pairing modal. In `onboarding` context it acts as an onboarding step:
   * the chosen `role` is persisted when the flow completes.
   */
  Pairing: { context?: 'onboarding' | 'settings'; role?: UserRole } | undefined;
};

/** Bottom tab param list. */
export type MainTabParamList = {
  // Her Tabs
  Tracker: undefined;
  
  // Partner Tabs
  Brief: undefined;
  
  // Shared
  Settings: undefined;
  Calendar: undefined;
};
