/**
 * MissionTaskCard — the partner's daily micro-mission as a satisfying,
 * toggleable task card with an animated check and haptic feedback.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { Card } from './Card';
import { Badge } from './Badge';
import { useThemeStyles, type Palette, typography, spacing, radius } from '../theme';
import type { MicroMission } from '../types/cycle';

interface MissionTaskCardProps {
  mission: MicroMission;
  done: boolean;
  onToggle: () => void;
}

export function MissionTaskCard({
  mission,
  done,
  onToggle,
}: MissionTaskCardProps) {
  const { colors, styles } = useThemeStyles(createStyles);
  const handleToggle = () => {
    void Haptics.impactAsync(
      done
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    );
    onToggle();
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.cardLabel}>TODAY&apos;S MICRO-MISSION</Text>

      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        {/* Checkbox */}
        <View style={[styles.checkbox, done && styles.checkboxDone]}>
          {done ? (
            <Animated.View entering={ZoomIn.duration(180)}>
              <Check
                size={15}
                color={colors.onAccent}
                strokeWidth={3}
              />
            </Animated.View>
          ) : null}
        </View>

        {/* Task text */}
        <View style={styles.textWrap}>
          <Text style={[styles.title, done && styles.titleDone]}>
            {mission.title}
          </Text>
          <Text style={styles.description}>{mission.description}</Text>
          <View style={styles.badgeRow}>
            <Badge
              label={mission.category.replace(/_/g, ' ')}
              variant="sage"
            />
            {done ? <Text style={styles.doneTag}>Completed</Text> : null}
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (colors: Palette) => StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    width: '100%',
  },
  cardLabel: {
    fontSize: typography.tag.fontSize,
    lineHeight: typography.tag.lineHeight,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 4,
  },
  rowPressed: {
    opacity: 0.85,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.accentSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: colors.accentSage,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  titleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  doneTag: {
    ...typography.caption,
    color: colors.accentSage,
    fontWeight: '700',
  },
});

export default MissionTaskCard;
