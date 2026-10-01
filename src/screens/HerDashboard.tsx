import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Zap, CloudRain, Droplets, Brain, Sun, Activity, Frown, Waves, Heart, Cookie, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Screen, Card, Header, SOSModal, PaywallTriggerBanner, CycleRing } from '../components';
import { useThemeStyles, type Palette, typography, spacing } from '../theme';
import { useCycleStore } from '../store/useCycleStore';
import { generateEmpathyBrief } from '../utils/cycleCalculator';
import { SYMPTOM_ROWS } from '../utils/symptoms';
import { useToday } from '../hooks/useToday';
import { CycleEditButton } from '../components/CycleEditButton';
import { HerDailyInsights } from '../components/HerDailyInsights';

const ICONS = { cramps: Zap, fatigue: CloudRain, bloating: Droplets, brainfog: Brain, glowing: Sun,
  headache: Activity, mood: Frown, nausea: Waves, tenderness: Heart };

export function HerDashboard() {
  const { colors, styles } = useThemeStyles(createStyles);
  const today = useToday();
  const { lastPeriodStartDate, cycleLength, periodLength, loggedSymptomsToday, toggleDailySymptom,
    activeSOS, partnerConnected } = useCycleStore();
  const [sosVisible, setSOSVisible] = useState(false);
  const brief = useMemo(
    () => generateEmpathyBrief(lastPeriodStartDate, cycleLength, periodLength, today, 'her'),
    [lastPeriodStartDate, cycleLength, periodLength, today],
  );
  return (
    <Screen>
      <Header partnerConnected={partnerConnected} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.title}>Today’s rhythm</Text>
          <CycleRing currentDay={brief.cycleDay} cycleLength={cycleLength} periodLength={periodLength} phaseTitle={brief.phaseTitle} />
          <Text style={styles.countdown}>Next period estimated in {brief.daysUntilNextPeriod} {brief.daysUntilNextPeriod === 1 ? 'day' : 'days'}</Text>
        </Card>
        <Card style={styles.card}>
          <Text style={styles.insightTitle}>Today’s hormone insights</Text>
          <Text style={styles.insightBody}>{brief.hormoneSummary}</Text>
          <Text style={styles.estimate}>A general phase estimate, not a measurement of your hormones.</Text>
          <HerDailyInsights brief={brief} />
        </Card>
        <CycleEditButton label="Log period or edit cycle" />
        <Text style={styles.sectionTitle}>How are you feeling?</Text>
        <View style={styles.symptomGrid}>
          {SYMPTOM_ROWS.map((row, index) => (
            <View key={index} style={styles.symptomRow}>
              {row.map(s => {
                const active = loggedSymptomsToday.includes(s.id);
                const Icon = ICONS[s.id];
                return (
                  <Pressable key={s.id} accessibilityRole="checkbox" accessibilityLabel={s.label}
                    accessibilityState={{ checked: active }}
                    onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); toggleDailySymptom(s.id); }}
                    style={({ pressed }) => [styles.symptomTile, active && styles.symptomActive, pressed && styles.pressed]}>
                    <Icon size={20} color={active ? colors.accentRose : colors.textSecondary} strokeWidth={1.7} />
                    <Text style={[styles.symptomLabel, active && { color: colors.accentRose }]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.sosButton, pressed && styles.pressed]} onPress={() => setSOSVisible(true)}>
          <Cookie size={18} color={colors.onAccent} />
          <Text style={styles.sosButtonText}>Send craving SOS to partner</Text>
        </Pressable>
        {activeSOS && (
          <View style={styles.sosStatus}>
            <CheckCircle2 size={14} color={colors.accentSage} />
            <Text style={styles.sosStatusText}>Active SOS sent at {new Date(activeSOS.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {partnerConnected ? 'shared with your partner.' : 'saved on this device.'}</Text>
          </View>
        )}
        <PaywallTriggerBanner />
      </ScrollView>
      <SOSModal visible={sosVisible} onClose={() => setSOSVisible(false)} />
    </Screen>
  );
}
const createStyles = (c: Palette) => StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: spacing.xl },
  card: { width: '100%', marginBottom: 20 },
  title: { ...typography.title, color: c.textPrimary },
  countdown: { ...typography.caption, color: c.textSecondary, textAlign: 'center' },
  insightTitle: { ...typography.body, fontWeight: '600', color: c.textPrimary, marginBottom: 10 },
  insightBody: { ...typography.body, color: c.textSecondary },
  estimate: { ...typography.caption, fontSize: 11, color: c.textMuted, marginTop: 10 },
  sectionTitle: { ...typography.body, fontWeight: '600', color: c.textSecondary, marginBottom: 12, marginTop: 8 },
  symptomGrid: { gap: 8, marginBottom: 24 },
  symptomRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  symptomTile: { flex: 1, minWidth: 0, minHeight: 80, alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingHorizontal: 4, paddingVertical: 14, borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.backgroundSurface },
  symptomActive: { borderColor: c.accentRose, backgroundColor: c.accentSoft },
  symptomLabel: { ...typography.caption, fontSize: 12, lineHeight: 17, fontWeight: '500', color: c.textSecondary, textAlign: 'center' },
  pressed: { opacity: .76 },
  sosButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56,
    borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12, backgroundColor: c.accentRose,
    shadowColor: c.accentRose, shadowOffset: { width: 0, height: 4 }, shadowOpacity: .14, shadowRadius: 10, elevation: 3 },
  sosButtonText: { ...typography.body, fontSize: 14, fontWeight: '600', color: c.onAccent, flexShrink: 1 },
  sosStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, marginBottom: 16, borderRadius: 14, backgroundColor: c.phaseFollicular },
  sosStatusText: { ...typography.caption, color: c.accentSage, flex: 1 },
});
export default HerDashboard;
