/**
 * MetricPill — Small status indicator for energy, bandwidth, and conflict radar.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStyles, type Palette, typography, spacing, radius } from '../theme';

interface MetricPillProps {
  label: string;
  value: string;
  /** Accent dot color (e.g. green/amber/red for conflict radar). */
  dotColor?: string;
}

export function MetricPill({ label, value, dotColor }: MetricPillProps) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <View style={styles.container}>
      {dotColor ? (
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      ) : null}
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.backgroundSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: typography.caption.fontSize,
    color: colors.textMuted,
    fontWeight: '500',
  },
  value: {
    fontSize: typography.caption.fontSize,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default MetricPill;
