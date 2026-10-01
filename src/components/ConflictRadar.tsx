import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ChevronRight, LockKeyhole, Radar } from 'lucide-react-native';
import { useThemeStyles, type Palette, typography } from '../theme';
import { PressableScale } from './PressableScale';
import type { ConflictRadarLevel } from '../types/cycle';

function Segment({ filled, color, index }: { filled: boolean; color: string; index: number }) {
  const { colors } = useThemeStyles(createStyles);
  const opacity = useSharedValue(0);
  useEffect(() => { opacity.value = withDelay(index * 55, withTiming(1, { duration: 240, reduceMotion: ReduceMotion.System })); }, [index, opacity]);
  const animation = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ flex: 1, height: 7, borderRadius: 4, backgroundColor: filled ? color : colors.border }, animation]} />;
}

export function ConflictRadar({ level, locked, onPress }: { level: ConflictRadarLevel; locked: boolean; onPress?: () => void }) {
  const { colors: c, styles } = useThemeStyles(createStyles);
  const meta = {
    green: { label: 'Make room to connect', filled: 2, color: c.accentSage, insight: 'An invitation to check in. Ask how she feels before starting an important conversation.' },
    yellow: { label: 'Lead with gentleness', filled: 3, color: c.accentAmber, insight: 'A little extra patience may help. Listen first, and ask what would feel supportive today.' },
    red: { label: 'Leave a little space', filled: 5, color: c.accentRose, insight: 'Keep expectations gentle. Offer comfort and let her tell you what she needs.' },
  }[level];
  if (locked) return (
    <View style={styles.locked}>
      <View style={styles.header}><View style={styles.titleRow}><Radar size={17} color={c.accentRose} /><Text style={styles.title}>Conflict Radar</Text></View><View style={styles.pass}><LockKeyhole size={10} color={c.accentRose} /><Text style={styles.passText}>PASS</Text></View></View>
      <View style={styles.preview} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {[c.phaseFollicular, c.phaseFollicular, c.phaseOvulatory, c.phaseOvulatory, c.phaseMenstrual].map((color, i) => <View key={i} style={[styles.previewSegment, { backgroundColor: color }]} />)}
      </View>
      <Text style={styles.lockedHeadline}>A little context.{ '\n' }A more thoughtful conversation.</Text>
      <Text style={styles.description}>Explore gentle timing cues and practical ways to show up for her. Her words always matter more than a prediction.</Text>
      <PressableScale onPress={onPress} style={styles.cta}><Text style={styles.ctaText}>Explore Couple’s Pass</Text><ChevronRight size={16} color={c.accentRose} /></PressableScale>
    </View>
  );
  return (
    <View style={styles.unlocked}>
      <View style={styles.titleRow}><Radar size={17} color={meta.color} /><Text style={styles.title}>Conflict Radar</Text></View>
      <Text style={[styles.status, { color: meta.color }]}>{meta.label}</Text>
      <View style={styles.preview} key={level}>{Array.from({ length: 5 }, (_, i) => <Segment key={i} index={i} color={meta.color} filled={i < meta.filled} />)}</View>
      <Text style={styles.description}>{meta.insight}</Text>
      <Text style={styles.note}>A cycle-based estimate, not a measure of her mood.</Text>
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  locked: { marginTop: 24, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.backgroundPrimary },
  unlocked: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderColor: c.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  title: { ...typography.body, color: c.textPrimary, fontWeight: '600', fontSize: 15 },
  pass: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, backgroundColor: c.accentSoft, paddingHorizontal: 7, paddingVertical: 4 },
  passText: { ...typography.tag, color: c.accentRose, fontSize: 9 },
  preview: { flexDirection: 'row', gap: 5, marginTop: 18, marginBottom: 18 },
  previewSegment: { flex: 1, height: 7, borderRadius: 4 },
  lockedHeadline: { ...typography.title, color: c.textPrimary, fontSize: 19, lineHeight: 26, letterSpacing: -.3, marginBottom: 8 },
  description: { ...typography.caption, color: c.textSecondary, lineHeight: 20 },
  cta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 48, marginTop: 16, paddingHorizontal: 14, backgroundColor: c.backgroundSurface, borderWidth: 1, borderColor: c.border, borderRadius: 12 },
  ctaText: { ...typography.caption, color: c.accentRose, fontWeight: '600', flexShrink: 1 },
  status: { ...typography.body, fontWeight: '600', marginTop: 16 },
  note: { ...typography.caption, color: c.textSecondary, fontSize: 11, marginTop: 12 },
});
export default ConflictRadar;
