/**
 * Sway — Root Application Entrypoint
 *
 * GestureHandlerRootView → SafeAreaProvider → role-themed NavigationContainer
 *   → RootNavigator
 *
 * Native splash hands off to custom Lottie while services initialize.
 * The dashboard fades in after hydration, RevenueCat and the first sync,
 * with a 4s service watchdog so an offline device is never stuck loading.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Appearance, AppState, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initializePurchases, checkPremiumStatus } from './src/services/revenuecat';
import { useSupabaseSync } from './src/hooks/useSupabaseSync';
import { useTheme } from './src/theme';
import { LaunchTransition } from './src/components/LaunchTransition';
import { useStoreHydrated } from './src/hooks/useStoreHydrated';
import { openEmpathyBrief, useEmpathyNotifications } from './src/hooks/useEmpathyNotifications';
import { navigationRef } from './src/navigation/navigationRef';

// Hold the native splash until the Lottie host lays out. Must run before render.
void SplashScreen.preventAutoHideAsync().catch(error => console.warn('[Sway Launch] Splash hold failed:', error));
SplashScreen.setOptions({ duration: 350, fade: true });

/** Maximum service wait before leaving Lottie (hydration is still required). */
const SPLASH_WATCHDOG_MS = 4000;

export default function App() {
  const { colors, dark } = useTheme();
  const hydrated = useStoreHydrated();
  const navigationTheme = useMemo(() => ({
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.accentRose, background: colors.backgroundPrimary,
      card: colors.backgroundSurface, text: colors.textPrimary,
      border: colors.border, notification: colors.accentAmber,
    },
  }), [colors, dark]);
  const [rcReady, setRcReady] = useState(false);
  const [watchdogFired, setWatchdogFired] = useState(false);
  const [startupComplete, setStartupComplete] = useState(false);
  const { ready: syncReady } = useSupabaseSync();

  useEffect(() => {
    if (hydrated) {
      Appearance.setColorScheme(dark ? 'dark' : 'light');
      void SystemUI.setBackgroundColorAsync(colors.backgroundPrimary).catch(error => console.warn('[Sway Theme] Native background update failed:', error));
    }
    return () => Appearance.setColorScheme('unspecified');
  }, [colors.backgroundPrimary, dark, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let mounted = true;
    (async () => {
      try {
        await initializePurchases(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY);
      } catch (error) {
        console.warn('[Sway Launch] Purchases initialization failed:', error);
      } finally { if (mounted) setRcReady(true); }
    })();
    return () => {
      mounted = false;
    };
  }, [hydrated]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void checkPremiumStatus().catch(() => {});
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    const watchdog = setTimeout(
      () => setWatchdogFired(true),
      SPLASH_WATCHDOG_MS,
    );
    return () => clearTimeout(watchdog);
  }, []);

  useEffect(() => {
    if (hydrated && ((rcReady && syncReady) || watchdogFired)) setStartupComplete(true);
  }, [hydrated, rcReady, syncReady, watchdogFired]);
  const appReady = startupComplete;
  useEmpathyNotifications(appReady);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={dark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.backgroundPrimary}
        />
        <LaunchTransition ready={appReady}>
          {appReady && <NavigationContainer ref={navigationRef} theme={navigationTheme} onReady={openEmpathyBrief}>
            <RootNavigator />
          </NavigationContainer>}
        </LaunchTransition>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
