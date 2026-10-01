/**
 * PartnerDashboard — Empathy-first view for the partner.
 *
 * Premium SOS banner with slide-in animation, visual Conflict Radar gauge,
 * toggleable micro-mission task card, instant haptic feedback.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Check,
  Cookie,
  Flame,
  Heart,
  UtensilsCrossed,
  MessageCircle,
  LockKeyhole,
  type LucideIcon,
} from 'lucide-react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { RootStackParamList } from '../navigation/types';
import {
  Screen,
  Card,
  Badge,
  Header,
  MetricPill,
  ConflictRadar,
  MissionTaskCard,
} from '../components';
import { useThemeStyles, type Palette, typography, spacing } from '../theme';
import { useCycleStore } from '../store/useCycleStore';
import { useToday } from '../hooks/useToday';
import { generateEmpathyBrief } from '../utils/cycleCalculator';
import type { SOSAlertType } from '../types/cycle';
import { PartnerAccessScreen } from './PartnerAccessScreen';
import { PressableScale } from '../components/PressableScale';

// ─── SOS type metadata ───────────────────────────────────────────────────────

const SOS_TYPE_META: Record<SOSAlertType, { label: string; Icon: LucideIcon }> = {
  chocolate: { label: 'Chocolate & Snacks', Icon: Cookie },
  heating_pad: { label: 'Heating Pad & Tea', Icon: Flame },
  quiet_hug: { label: 'Quiet Hug', Icon: Heart },
  comfort_meal: { label: 'Comfort Meal', Icon: UtensilsCrossed },
  custom: { label: 'Custom Request', Icon: MessageCircle },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function PartnerDashboard() {
  const { colors, styles } = useThemeStyles(createStyles);
  const today = useToday();
  const {
    lastPeriodStartDate,
    cycleLength,
    periodLength,
    activeSOS,
    dismissSOS,
    partnerConnected,
    isPremium,
    coupleId,
    partnerAccessVerified,
  } = useCycleStore();

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [missionDone, setMissionDone] = useState(false);

  const brief = useMemo(
    () => generateEmpathyBrief(lastPeriodStartDate, cycleLength, periodLength, today),
    [lastPeriodStartDate, cycleLength, periodLength, today],
  );

  const handleDismissSOS = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dismissSOS();
  };

  const sosMeta = activeSOS ? SOS_TYPE_META[activeSOS.type] : null;
  if (!coupleId || !partnerAccessVerified) return <PartnerAccessScreen />;

  return (
    <Screen>
      <Header partnerConnected={partnerConnected} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.display, { color: colors.textPrimary, fontSize: 28, marginBottom: 24 }]}>Your daily brief</Text>
        {/* ── Active SOS Banner (slides in on realtime arrival) ── */}
        {activeSOS && sosMeta ? (
          <Animated.View
            key={activeSOS.id}
            entering={FadeInDown.springify().damping(16)}
          >
            <View style={styles.sosBanner}>
              <View style={styles.sosTopRow}>
                <View style={styles.sosIconChip}>
                  <sosMeta.Icon size={18} color={colors.accentRose} />
                </View>
                <View style={styles.sosTextWrap}>
                  <Text style={styles.sosKicker}>COMFORT REQUEST</Text>
                  <Text style={styles.sosTitle}>{sosMeta.label}</Text>
                  {activeSOS.message ? (
                    <Text style={styles.sosMessage}>
                      &quot;{activeSOS.message}&quot;
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                onPress={handleDismissSOS}
                style={({ pressed }) => [
                  styles.sosDismissBtn,
                  pressed && styles.sosDismissBtnPressed,
                ]}
              >
                <Check
                  size={14}
                  color={colors.onAccent}
                  strokeWidth={3}
                />
                <Text style={styles.sosDismissText}>Mark delivered</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        {/* ── Empathy Brief Card ───────────────────────────────── */}
        <Card style={styles.briefCard}>
          <Text style={styles.cardLabel}>TODAY’S ESTIMATED RHYTHM</Text>
          <Badge label={brief.phaseTitle} variant="rose" />

          {/* Energy bar */}
          <View style={styles.energyRow}>
            <Text style={styles.energyLabel}>Energy</Text>
            <View style={styles.energyTrack}>
              <View
                style={[
                  styles.energyFill,
                  { width: `${brief.energyLevel}%` },
                ]}
              />
            </View>
            <Text style={styles.energyValue}>{brief.energyLevel}%</Text>
          </View>

          {/* Metric pills */}
          <View style={styles.pillRow}>
            <MetricPill label="Social" value={brief.socialBandwidth} />
            <MetricPill
              label="Her cycle day"
              value={`${brief.cycleDay} / ${cycleLength}`}
            />
          </View>

          {/* Conflict radar gauge */}
          <ConflictRadar
            level={brief.conflictRadar}
            locked={!isPremium}
            onPress={() => navigation.navigate('Paywall')}
          />
        </Card>

        {/* ── Micro-Mission Task Card ──────────────────────────── */}
        <MissionTaskCard
          mission={brief.microMission}
          done={missionDone}
          onToggle={() => setMissionDone((d) => !d)}
        />

        {/* ── Do's & Don'ts ────────────────────────────────────── */}
        {isPremium ? <>
        <Card style={styles.doDontCard}>
          <Text style={styles.cardLabel}>DEEP EMPATHY INSIGHTS</Text>

          <View style={styles.listSection}>
            {brief.doList.map((item, i) => (
              <View key={`do-${i}`} style={styles.listRow}>
                <CheckCircle2
                  size={16}
                  color={colors.accentSage}
                  style={styles.listIcon}
                />
                <Text style={styles.listItemDo}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.listSection}>
            {brief.dontList.map((item, i) => (
              <View key={`dont-${i}`} style={styles.listRow}>
                <XCircle
                  size={16}
                  color={colors.accentAmber}
                  style={styles.listIcon}
                />
                <Text style={styles.listItemDont}>{item}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ── Partner Tip ──────────────────────────────────────── */}
        <Card style={styles.tipCard}>
          <View style={styles.tipRow}>
            <AlertTriangle size={16} color={colors.accentAmber} />
            <Text style={styles.tipTitle}>Partner Tip</Text>
          </View>
          <Text style={styles.tipBody}>{brief.partnerTip}</Text>
        </Card>
        </> : <Card style={styles.doDontCard}>
          <View style={styles.tipRow}><LockKeyhole size={17} color={colors.accentRose} /><Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>Go a little deeper</Text></View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 12 }]}>Unlock phase-by-phase ways to listen, support, and connect with Couple’s Pass.</Text>
          <PressableScale onPress={() => navigation.navigate('Paywall')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[typography.caption, { color: colors.accentRose, fontWeight: '600' }]}>Explore empathy insights →</Text></PressableScale>
        </Card>}
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (colors: Palette) => StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: spacing.xl,
  },

  // SOS banner — premium elevated alert card
  sosBanner: {
    backgroundColor: colors.accentRose + '12',
    borderWidth: 1,
    borderColor: colors.accentRose + '45',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    width: '100%',
    shadowColor: colors.accentRose,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  sosTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  sosIconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentRose + '22',
    borderWidth: 1,
    borderColor: colors.accentRose + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTextWrap: {
    flex: 1,
  },
  sosKicker: {
    fontSize: typography.tag.fontSize,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.accentRose,
    marginBottom: 2,
  },
  sosTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sosMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  sosDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentRose,
    borderRadius: 999,
    paddingVertical: spacing.xs + 4,
    paddingHorizontal: spacing.md,
  },
  sosDismissBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  sosDismissText: {
    ...typography.caption,
    color: colors.onAccent,
    fontWeight: '700',
  },

  // Card labels
  cardLabel: {
    fontSize: typography.tag.fontSize,
    lineHeight: typography.tag.lineHeight,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  // Brief card
  briefCard: {
    marginBottom: spacing.md,
    width: '100%',
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  energyLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
    minWidth: 48,
  },
  energyTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  energyFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentRose,
  },
  energyValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },

  // Do / don't card
  doDontCard: {
    marginBottom: spacing.md,
    width: '100%',
  },
  listSection: {
    gap: spacing.sm + 2,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  listIcon: {
    marginTop: 3,
  },
  listItemDo: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  listItemDont: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  // Tip card
  tipCard: {
    marginBottom: spacing.sm,
    width: '100%',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  tipTitle: {
    ...typography.caption,
    color: colors.accentAmber,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tipBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default PartnerDashboard;
