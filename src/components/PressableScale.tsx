import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type Props = Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; children: React.ReactNode };

export function PressableScale({ children, style, disabled, onPressIn, onPressOut, ...props }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const spring = { damping: 18, stiffness: 320, mass: 0.5, reduceMotion: ReduceMotion.System };
  return (
    <AnimatedPressable
      {...props}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      disabled={disabled}
      style={[style, animatedStyle, disabled && { opacity: 0.5 }]}
      onPressIn={event => { scale.set(withSpring(0.975, spring)); onPressIn?.(event); }}
      onPressOut={event => { scale.set(withSpring(1, spring)); onPressOut?.(event); }}
    >{children}</AnimatedPressable>
  );
}
