/**
 * Badge — Pill-shaped status label with variant colors.
 *
 * Supports 'rose' | 'amber' | 'sage' | 'muted' variants.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStyles, type Palette, typography, spacing, radius } from '../theme';

type BadgeVariant = 'rose' | 'amber' | 'sage' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  /** Optional Lucide icon element rendered before the label. */
  icon?: React.ReactNode;
}

const makeVARIANT_COLORS = (colors: Palette): Record<BadgeVariant, { bg: string; fg: string }> => ({
  rose: { bg: colors.accentRose + '22', fg: colors.accentRose },
  amber: { bg: colors.accentAmber + '22', fg: colors.accentAmber },
  sage: { bg: colors.accentSage + '22', fg: colors.accentSage },
  muted: { bg: colors.border, fg: colors.textSecondary },
});

export function Badge({ label, variant = 'rose', icon }: BadgeProps) {
  const { colors, styles } = useThemeStyles(createStyles);
  const VARIANT_COLORS = makeVARIANT_COLORS(colors);
  const { bg, fg } = VARIANT_COLORS[variant];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {icon ?? null}
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.full,
  },
  label: {
    fontSize: typography.tag.fontSize,
    lineHeight: typography.tag.lineHeight,
    fontWeight: typography.tag.fontWeight,
    letterSpacing: typography.tag.letterSpacing,
    textTransform: 'uppercase',
  },
});

export default Badge;
