import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { getPhaseLengths, normalizeCycleLengths } from '../utils/cycleCalculator';
import { cycleRingGeometry } from '../utils/cycleRingGeometry';
import { useThemeStyles, type Palette, typography } from '../theme';

interface CycleRingProps {
  currentDay: number;
  cycleLength: number;
  periodLength: number;
  phaseTitle: string;
}

export function CycleRing({ currentDay, cycleLength, periodLength, phaseTitle }: CycleRingProps) {
  const { colors, styles } = useThemeStyles(createStyles);
  const normalized = normalizeCycleLengths(cycleLength, periodLength);
  const g = cycleRingGeometry(currentDay, normalized.cycleLength);
  const lengths = getPhaseLengths(normalized.cycleLength, normalized.periodLength);
  const phases = [
    { days: lengths.menstrual, color: colors.phaseMenstrual },
    { days: lengths.follicular, color: colors.phaseFollicular },
    { days: lengths.ovulatory, color: colors.phaseOvulatory },
    { days: lengths.luteal, color: colors.phaseLuteal },
  ];
  let offset = 0;
  return (
    <View style={styles.container} accessibilityLabel={`Cycle day ${g.day}. ${phaseTitle}. Estimated phase.`}>
      <View style={styles.viewport}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${g.size} ${g.size}`} preserveAspectRatio="xMidYMid meet">
          <G rotation={-90} origin={`${g.center}, ${g.center}`}>
            <Circle cx={g.center} cy={g.center} r={g.radius} stroke={colors.border} strokeWidth={g.strokeWidth} fill="none" />
            {phases.map(phase => {
              const start = offset;
              const arc = phase.days / g.length * g.circumference;
              offset += arc;
              return <Circle key={phase.color} cx={g.center} cy={g.center} r={g.radius}
                stroke={phase.color} strokeWidth={g.strokeWidth}
                strokeDasharray={`${arc} ${g.circumference - arc}`} strokeDashoffset={-start}
                strokeLinecap="butt" fill="none" />;
            })}
          </G>
          <Circle cx={g.cx} cy={g.cy} r={g.markerRadius} fill={colors.backgroundSurface}
            stroke={colors.textPrimary} strokeWidth={g.markerStroke} />
          <Circle cx={g.cx} cy={g.cy} r={3} fill={colors.textPrimary} />
        </Svg>
        <View style={styles.centerContent} pointerEvents="none">
          <Text style={styles.dayText} maxFontSizeMultiplier={1.4}>Day {g.day}</Text>
          <Text style={styles.phaseText} maxFontSizeMultiplier={1.4}>{phaseTitle.split(' / ')[0]}</Text>
          <Text style={styles.estimate} maxFontSizeMultiplier={1.4}>Estimated phase</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 24 },
  viewport: { width: '100%', maxWidth: 220, aspectRatio: 1 },
  centerContent: { position: 'absolute', top: 0, bottom: 0, left: 34, right: 34, alignItems: 'center', justifyContent: 'center' },
  dayText: { ...typography.display, fontSize: 32, color: colors.textPrimary, textAlign: 'center' },
  phaseText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  estimate: { ...typography.caption, color: colors.textMuted, fontSize: 10, marginTop: 6, textAlign: 'center' },
});
