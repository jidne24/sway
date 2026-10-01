import React from 'react';
import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { CalendarDays, Heart, Settings, Activity } from 'lucide-react-native';
import { HerDashboard } from '../screens/HerDashboard';
import { PartnerDashboard } from '../screens/PartnerDashboard';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme, typography } from '../theme';
import { CalendarScreen } from '../screens/CalendarScreen';
import { useCycleStore } from '../store/useCycleStore';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const AnimatedButton = Animated.createAnimatedComponent(PlatformPressable);

function TabButton({ style, onPressIn, onPressOut, ...props }: BottomTabBarButtonProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <AnimatedButton {...props} style={[style, animated]}
    onPressIn={event => { scale.set(withSpring(.88, { damping: 16, stiffness: 360, reduceMotion: ReduceMotion.System })); onPressIn?.(event); }}
    onPressOut={event => { scale.set(withSpring(1, { damping: 10, stiffness: 300, reduceMotion: ReduceMotion.System })); onPressOut?.(event); }} />;
}

export function AppNavigator() {
  const role = useCycleStore(s => s.userRole);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      animation: reducedMotion ? 'none' : 'fade',
      transitionSpec: { animation: 'timing', config: { duration: 180 } },
      tabBarButton: props => <TabButton {...props} />,
      tabBarHideOnKeyboard: true,
      tabBarStyle: {
        backgroundColor: colors.backgroundSurface, borderTopColor: colors.border,
        borderTopWidth: 1, height: 64 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8),
        shadowColor: '#152B43', shadowOpacity: .03, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 0,
      },
      tabBarActiveTintColor: colors.accentRose, tabBarInactiveTintColor: colors.textMuted,
      tabBarLabelStyle: { fontFamily: typography.caption.fontFamily, fontSize: 11, fontWeight: '600', marginTop: 4 },
    }}>
      {role === 'her' ? <Tab.Screen name="Tracker" component={HerDashboard} options={{
        tabBarLabel: 'Today', tabBarIcon: ({ color }) => <Activity size={22} color={color} strokeWidth={1.8} />,
      }} /> : <Tab.Screen name="Brief" component={PartnerDashboard} options={{
        tabBarLabel: 'Daily brief', tabBarIcon: ({ color }) => <Heart size={22} color={color} strokeWidth={1.8} />,
      }} />}
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{
        tabBarLabel: 'Calendar', tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} strokeWidth={1.8} />,
      }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{
        tabBarLabel: 'Settings', tabBarIcon: ({ color }) => <Settings size={22} color={color} strokeWidth={1.8} />,
      }} />
    </Tab.Navigator>
  );
}
export default AppNavigator;
