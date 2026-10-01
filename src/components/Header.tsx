/**
 * Header — Top bar with Sway wordmark, partner connection dot, and date.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { SwayLogo } from './SwayLogo';
import { useToday } from '../hooks/useToday';
import { parseDateKey } from '../utils/cycleDates';
import { useThemeStyles, type Palette, typography, spacing } from '../theme';

interface HeaderProps {
  /** Whether a partner is currently connected. */
  partnerConnected?: boolean;
}

export function Header({ partnerConnected = false }: HeaderProps) {
  const { colors, styles } = useThemeStyles(createStyles);
  const today = format(parseDateKey(useToday()) ?? new Date(), 'EEE, MMM d');

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <SwayLogo size={34} />
        <Text style={styles.brand}>Sway</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.date}>{today}</Text>
        <View style={styles.connectionRow}>
          <View style={[styles.statusDot, { backgroundColor: partnerConnected ? colors.accentSage : colors.textMuted }]} />
          <Text style={styles.connection}>{partnerConnected ? 'Connected' : 'Your space'}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    ...typography.title,
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: -0.6,
    fontSize: 25,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  right: { alignItems: 'flex-end', gap: 2 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  connection: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
});

export default Header;
