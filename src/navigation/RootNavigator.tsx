/**
 * RootNavigator — top-level stack navigator.
 *
 * Gates the app on onboarding: until a role is chosen and persisted in
 * useCycleStore, Onboarding is the root screen. Pairing and Paywall are
 * registered unconditionally so a presented modal survives the
 * Onboarding → Main switch happening underneath it.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppNavigator } from './AppNavigator';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { PairingScreen } from '../screens/PairingScreen';
import { PartnerAccessScreen } from '../screens/PartnerAccessScreen';
import { useTheme } from '../theme';
import { useCycleStore } from '../store/useCycleStore';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const userRole = useCycleStore((s) => s.userRole);
  const { colors } = useTheme();
  const coupleId = useCycleStore(s => s.coupleId);
  const verified = useCycleStore(s => s.partnerAccessVerified);
  const revoked = useCycleStore(s => s.partnerAccessRevoked);
  const blocked = userRole === 'partner' && (!coupleId || !verified);

  return (
    <Stack.Navigator
      key={userRole === 'partner' && revoked ? 'access-revoked' : 'app'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundPrimary },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      {userRole == null ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : blocked ? (
        <Stack.Screen name="PartnerAccess" component={PartnerAccessScreen} options={{ animation: 'fade' }} />
      ) : (
        <Stack.Screen name="Main" component={AppNavigator} />
      )}
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Pairing"
        component={PairingScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

export default RootNavigator;
