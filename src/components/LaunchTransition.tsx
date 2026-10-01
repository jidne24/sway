import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme, typography } from '../theme';
import { SwayLogo } from './SwayLogo';

/** Native splash → lightweight custom Lottie → ready navigation, without a blank frame. */
export function LaunchTransition({ children, ready }: { children: React.ReactNode; ready: boolean }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [laidOut, setLaidOut] = useState(false);
  const [finished, setFinished] = useState(false);
  const [lottieFailed, setLottieFailed] = useState(false);
  const startedAt = useRef(0);
  const opacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const contentScale = useSharedValue(reducedMotion ? 1 : .985);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value, transform: [{ scale: contentScale.value }] }));

  useEffect(() => {
    if (!ready || !laidOut) return;
    let end: ReturnType<typeof setTimeout> | undefined;
    const start = setTimeout(() => {
      const duration = reducedMotion ? 0 : 420;
      opacity.value = withTiming(0, { duration, reduceMotion: ReduceMotion.System });
      contentOpacity.value = withTiming(1, { duration, reduceMotion: ReduceMotion.System });
      contentScale.value = withTiming(1, { duration, reduceMotion: ReduceMotion.System });
      end = setTimeout(() => setFinished(true), duration);
    }, reducedMotion ? 0 : Math.max(0, 750 - (Date.now() - startedAt.current)));
    return () => { clearTimeout(start); clearTimeout(end); };
  }, [ready, laidOut, reducedMotion, opacity, contentOpacity, contentScale]);

  return (
    <View style={[styles.root, { backgroundColor: colors.backgroundPrimary }]} onLayout={() => {
      if (startedAt.current) return;
      startedAt.current = Date.now();
      void SplashScreen.hideAsync().catch(() => {}).finally(() => setLaidOut(true));
    }}>
      <Animated.View style={[styles.root, contentStyle]} pointerEvents={finished ? 'auto' : 'none'} accessibilityElementsHidden={!finished} importantForAccessibility={finished ? 'auto' : 'no-hide-descendants'}>
        {children}
      </Animated.View>
      {!finished && <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.backgroundPrimary }, overlayStyle]} accessibilityRole="progressbar" accessibilityLabel="Opening Sway">
        {reducedMotion || lottieFailed ? <View style={styles.logo}><SwayLogo size={112} /></View> : (
          <LottieView source={require('../../assets/sway-loading.json')} autoPlay loop style={styles.animation} onAnimationFailure={() => setLottieFailed(true)} />
        )}
        <Text style={[typography.display, styles.wordmark, { color: colors.textPrimary }]}>Sway</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8 }]}>A little more understanding.</Text>
      </Animated.View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { alignItems: 'center', justifyContent: 'center' },
  animation: { width: 240, height: 240 },
  logo: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontSize: 36, letterSpacing: -1, marginTop: 8 },
});
