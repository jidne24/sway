/**
 * Button — Pill-shaped pressable with instant scale + opacity feedback.
 */
import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useThemeStyles, type Palette, typography, spacing, radius } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  variant = 'primary',
  style,
  ...rest
}: ButtonProps) {
  const { styles } = useThemeStyles(createStyles);
  const { styles: variantStyles } = useThemeStyles(createVariantStyles);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && styles.pressed,
        style,
      ]}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      {...rest}
    >
      <Text
        style={[
          styles.label,
          variant === 'ghost' && styles.ghostLabel,
          variant === 'secondary' && styles.secondaryLabel,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  base: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.onAccent,
  },
  ghostLabel: {
    color: colors.accentRose,
  },
  secondaryLabel: {
    color: colors.textPrimary,
  },
});

const createVariantStyles = (colors: Palette) => StyleSheet.create({
  primary: {
    backgroundColor: colors.accentRose,
  },
  secondary: {
    backgroundColor: colors.backgroundSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
});

export default Button;
