import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import type { MarkedDates } from 'react-native-calendars/src/types';
import { useTheme, typography, spacing } from '../theme';
import { useCycleStore } from '../store/useCycleStore';
import { useToday } from '../hooks/useToday';
import { predictMonth } from '../utils/calendarPrediction';
import { parseDateKey } from '../utils/cycleDates';
import type { CyclePhase } from '../types/cycle';

const labels: Record<CyclePhase, string> = {
  menstrual: 'Menstrual', follicular: 'Follicular', ovulatory: 'Ovulatory', luteal: 'Luteal',
};

/** Read-only predictions for both roles. Cycle edits live exclusively in Her settings. */
export function CycleCalendar() {
  const theme = useTheme();
  const { colors } = theme;
  const start = useCycleStore(s => s.lastPeriodStartDate);
  const role = useCycleStore(s => s.userRole);
  const cycle = useCycleStore(s => s.cycleLength);
  const period = useCycleStore(s => s.periodLength);
  const today = useToday();
  const [month, setMonth] = useState(today.slice(0, 7) + '-01');
  const [selected, setSelected] = useState(today);
  const predictions = useMemo(() => predictMonth(month, start, cycle, period), [month, start, cycle, period]);
  const phaseColors = useMemo(() => ({
    menstrual: colors.phaseMenstrual, follicular: colors.phaseFollicular,
    ovulatory: colors.phaseOvulatory, luteal: colors.phaseLuteal,
  }), [colors]);
  const markedDates = useMemo(() => {
    const marks: MarkedDates = {};
    for (const [day, prediction] of Object.entries(predictions)) {
      marks[day] = {
        customStyles: {
          container: {
            backgroundColor: phaseColors[prediction.phase], borderRadius: 12,
            borderWidth: selected === day ? 2 : day === today ? 1 : 0,
            borderColor: selected === day ? colors.accentRose : colors.textPrimary,
          },
          text: { color: '#332C30', fontWeight: day === today ? '700' : '500' },
        },
      };
    }
    return marks;
  }, [predictions, phaseColors, selected, today, colors]);
  const detail = predictions[selected];
  return (
    <View style={styles.container}>
      <Calendar
        key={colors.accentRose}
        initialDate={month}
        markingType="custom"
        markedDates={markedDates}
        onMonthChange={(date: DateData) => {
          const next = date.dateString.slice(0, 7) + '-01';
          setMonth(next);
          setSelected(next);
        }}
        onDayPress={(day: DateData) => setSelected(day.dateString)}
        enableSwipeMonths
        theme={{
          calendarBackground: colors.backgroundSurface, backgroundColor: colors.backgroundSurface,
          monthTextColor: colors.textPrimary, textSectionTitleColor: colors.textSecondary,
          dayTextColor: colors.textPrimary, textDisabledColor: colors.textMuted,
          todayTextColor: colors.accentRose, arrowColor: colors.accentRose,
          textMonthFontWeight: '600', textDayHeaderFontWeight: '500',
        }}
        style={[styles.calendar, { borderColor: colors.border }]}
      />
      <View style={styles.legend}>
        {(Object.keys(labels) as CyclePhase[]).map(phase => (
          <View key={phase} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: phaseColors[phase] }]} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{labels[phase]}</Text>
          </View>
        ))}
      </View>
      {detail && (
        <View accessibilityLiveRegion="polite" style={[styles.detail, { backgroundColor: colors.backgroundSurface, borderColor: colors.border }]}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {parseDateKey(selected)?.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
          <Text style={[typography.title, { color: colors.textPrimary, marginTop: 4 }]}>
            {labels[detail.phase]} · {role === 'partner' ? 'Her cycle day' : 'Day'} {detail.cycleDay}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 8 }]}>
            {role === 'partner'
              ? `She ${selected === today ? 'is estimated to be' : selected > today ? 'is expected to be' : 'was estimated to be'} in her ${labels[detail.phase].toLowerCase()} phase. Based on her latest cycle details.`
              : 'Estimated from your latest cycle details.'}
          </Text>
        </View>
      )}
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        Phases are estimates and can shift each cycle. This calendar does not confirm ovulation and is not a method of contraception.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  calendar: { borderRadius: 24, borderWidth: 1, padding: 8, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  detail: { padding: spacing.lg, borderRadius: 20, borderWidth: 1 },
});
