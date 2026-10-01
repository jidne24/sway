/**
 * SettingsScreen — App settings hub (3rd tab).
 *
 * Read-only role (locked after onboarding), partner pairing entry,
 * cycle configuration, subscription tools, and a full app reset.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Switch,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  Heart,
  Droplets,
  HeartHandshake,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  Unlink,
} from 'lucide-react-native';
import { Screen, Card, Header } from '../components';
import { useThemeStyles, type Palette, typography, spacing, radius } from '../theme';
import { useCycleStore } from '../store/useCycleStore';
import type { RootStackParamList } from '../navigation/types';
import { NativeDateTimeField } from '../components/NativeDateTimeField';
import { isValidCycleData, parseDateKey, toDateKey } from '../utils/cycleDates';
import { configureEmpathyReminder, configureCycleReminder } from '../services/empathyNotifications';
import { PressableScale } from '../components/PressableScale';
import { DisconnectPartnerButton } from '../components/DisconnectPartnerButton';

export function SettingsScreen() {
  const { colors, styles } = useThemeStyles(createStyles);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {
    userRole,
    partnerConnected,
    lastPeriodStartDate,
    cycleLength,
    periodLength,
    setCycleData,
    isPremium,
    resetToDefault,
    shareCalendarWithPartner,
    setShareCalendarWithPartner,
    empathyReminderEnabled,
    empathyReminderHour,
    empathyReminderMinute,
    setEmpathyReminder,
    cycleReminderEnabled,
    cycleReminderHour,
    cycleReminderMinute,
    setCycleReminder,
    coupleId,
    revokePartner,
  } = useCycleStore();

  const [editStart, setEditStart] = useState(() => parseDateKey(lastPeriodStartDate) ?? new Date());
  const [editCycleLen, setEditCycleLen] = useState(String(cycleLength));
  const [editPeriodLen, setEditPeriodLen] = useState(String(periodLength));
  const [sharingBusy, setSharingBusy] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [savingCycle, setSavingCycle] = useState(false);
  useEffect(() => {
    return useCycleStore.subscribe((state, previous) => {
      if (state.lastPeriodStartDate !== previous.lastPeriodStartDate || state.cycleLength !== previous.cycleLength || state.periodLength !== previous.periodLength) {
        setEditStart(parseDateKey(state.lastPeriodStartDate) ?? new Date());
        setEditCycleLen(String(state.cycleLength));
        setEditPeriodLen(String(state.periodLength));
      }
    });
  }, []);
  const reminderTime = new Date();
  const reminderEnabled = userRole === 'her' ? cycleReminderEnabled : empathyReminderEnabled;
  const saveReminder = userRole === 'her' ? setCycleReminder : setEmpathyReminder;
  const configureReminder = userRole === 'her' ? configureCycleReminder : configureEmpathyReminder;
  reminderTime.setHours(userRole === 'her' ? cycleReminderHour : empathyReminderHour, userRole === 'her' ? cycleReminderMinute : empathyReminderMinute, 0, 0);

  const handleSharing = async (share: boolean) => {
    if (sharingBusy) return;
    setSharingBusy(true);
    try {
      if (!await setShareCalendarWithPartner(share)) {
        Alert.alert('Sharing could not be updated', 'Please check your connection and try again. Your partner’s access has not changed.');
      }
    } finally { setSharingBusy(false); }
  };

  const handleReminder = async (enabled: boolean, time: Date = reminderTime) => {
    if (reminderBusy) return;
    setReminderBusy(true);
    try {
      const hour = time.getHours();
      const minute = time.getMinutes();
      const allowed = await configureReminder(enabled, hour, minute, enabled);
      if (!allowed) {
        Alert.alert('Allow notifications', 'Enable Sway notifications in your device settings to receive your daily reminder.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => { void Linking.openSettings(); } },
        ]);
        return;
      }
      if (useCycleStore.getState().userRole === userRole) saveReminder(enabled, hour, minute);
    } catch {
      Alert.alert('Reminder could not be saved', 'Please try again. On Android, check that Sway can schedule reminders in your device settings.');
    } finally { setReminderBusy(false); }
  };

  const handleSaveCycle = async () => {
    if (savingCycle) return;
    const cl = Number(editCycleLen);
    const pl = Number(editPeriodLen);
    if (!isValidCycleData(toDateKey(editStart), cl, pl)) {
      Alert.alert('Check your cycle details', 'Choose a past or current start date, a cycle length of 20–45 days, and a period length of 1–10 days.');
      return;
    }
    setSavingCycle(true);
    try {
      const synced = await setCycleData(toDateKey(editStart), cl, pl);
      Alert.alert(synced ? 'Cycle updated' : 'Saved on your device', synced ? 'Your predictions now use these details.' : 'Your predictions are updated. We will retry partner sync when you reconnect.');
    } finally { setSavingCycle(false); }
  };

  const handleRevoke = () => {
    if (revoking) return;
    Alert.alert('Revoke partner access?', 'Your partner will lose access to your shared cycle information. This invitation code will stop working. Your own cycle data stays intact.', [
      { text: 'Keep connected', style: 'cancel' },
      { text: 'Revoke access', style: 'destructive', onPress: () => {
        setRevoking(true);
        void revokePartner().then(success => {
          Alert.alert(success ? 'Partner access revoked' : 'Access has not changed', success
            ? 'Your space is private again. You can create a new invitation whenever you choose.'
            : 'We could not confirm revocation with the server. Check your connection and the latest Supabase migration, then try again.');
        }).finally(() => setRevoking(false));
      } },
    ]);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Sway?',
      'This clears data on this device and restarts onboarding. It does not revoke server access. If you are sharing your cycle, revoke partner access first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void Promise.all([configureEmpathyReminder(false, 9, 0), configureCycleReminder(false, 20, 0)]).then(resetToDefault).catch(() => {
              Alert.alert('Reset could not finish', 'We could not cancel your reminder. Please try again.');
            });
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Header partnerConnected={partnerConnected} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Settings</Text>

        {/* ── Role (locked after onboarding) ───────────────────── */}
        <Card style={styles.card}>
          <Text style={styles.cardLabel}>ROLE</Text>
          <View style={styles.roleRow}>
            <View
              style={[
                styles.roleIconWrap,
                {
                  backgroundColor:
                    (userRole === 'partner'
                      ? colors.accentSage
                      : colors.accentRose) + '20',
                },
              ]}
            >
              {userRole === 'partner' ? (
                <HeartHandshake size={18} color={colors.accentSage} />
              ) : (
                <Droplets size={18} color={colors.accentRose} />
              )}
            </View>
            <View style={styles.pairTextWrap}>
              <Text style={styles.pairTitle}>
                {userRole === 'partner'
                  ? 'Supporting my partner'
                  : 'Tracking my cycle'}
              </Text>
              <Text style={styles.pairSubtitle}>
                Your personal Sway experience
              </Text>
            </View>
          </View>
        </Card>

        {/* ── Partner Pairing ──────────────────────────────────── */}
        <Card style={styles.card}>
          <Text style={styles.cardLabel}>PARTNER</Text>
          {userRole === 'partner' && partnerConnected ? <DisconnectPartnerButton /> : (
          <Pressable
            style={({ pressed }) => [
              styles.pairRow,
              pressed && styles.btnPressed,
            ]}
            onPress={() =>
              navigation.navigate('Pairing', { context: 'settings' })
            }
          >
            <View style={styles.pairIconWrap}>
              <Heart size={18} color={colors.accentRose} />
            </View>
            <View style={styles.pairTextWrap}>
              <Text style={styles.pairTitle}>{userRole === 'partner' ? 'Enter pair code' : 'Pair with your partner'}</Text>
              <Text style={styles.pairSubtitle}>
                {partnerConnected
                  ? 'Partner connected'
                  : userRole === 'partner' ? 'Enter her invitation to link your apps' : 'Share a code to link your apps'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </Pressable>
          )}
        </Card>

        {/* ── Cycle Settings ───────────────────────────────────── */}
        {userRole === 'her' ? (
          <Card style={styles.card}>
            <Text style={styles.cardLabel}>CYCLE SETTINGS</Text>

            <Text style={styles.inputLabel}>Last period start</Text>
            <NativeDateTimeField
              label="Last period start date"
              mode="date"
              value={editStart}
              onChange={setEditStart}
              maximumDate={new Date()}
            />

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Cycle Length</Text>
                <TextInput
                  style={styles.input}
                  value={editCycleLen}
                  onChangeText={setEditCycleLen}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Period Length</Text>
                <TextInput
                  style={styles.input}
                  value={editPeriodLen}
                  onChangeText={setEditPeriodLen}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.btnPressed,
              ]}
              disabled={savingCycle}
              onPress={() => { void handleSaveCycle(); }}
            >
              <Text style={styles.saveBtnText}>{savingCycle ? 'Saving…' : 'Save cycle details'}</Text>
            </Pressable>
          </Card>
        ) : null}

        {userRole === 'her' && (
          <Card style={styles.card}>
            <Text style={styles.cardLabel}>CALENDAR PRIVACY</Text>
            <View style={styles.pairRow}>
              <View style={styles.pairTextWrap}>
                <Text style={styles.pairTitle}>Share calendar with partner</Text>
                <Text style={styles.pairSubtitle}>Let your partner explore predicted phases. You can turn this off at any time.</Text>
              </View>
              <Switch
                accessibilityLabel="Share calendar with partner"
                value={shareCalendarWithPartner}
                disabled={sharingBusy}
                onValueChange={value => { void handleSharing(value); }}
                trackColor={{ false: colors.border, true: colors.accentSage }}
                thumbColor={colors.backgroundSurface}
              />
            </View>
            <Text style={[styles.pairSubtitle, { marginTop: 12 }]}>
              {sharingBusy ? 'Updating sharing…' : shareCalendarWithPartner ? 'Your calendar is shared. Your partner can view it, but cannot edit it.' : 'Your calendar is private. Daily empathy briefs are shared separately.'}
            </Text>
          </Card>
        )}
        {userRole === 'her' && (
          <Card style={styles.card}>
            <View style={styles.sovereigntyHeader}>
              <View style={[styles.roleIconWrap, { backgroundColor: colors.phaseFollicular }]}><ShieldCheck size={22} color={colors.accentSage} /></View>
              <Text style={[typography.title, { color: colors.textPrimary, flex: 1 }]}>Your data. Your control.</Text>
            </View>
            <Text style={[styles.pairSubtitle, { marginTop: 16, marginBottom: 20 }]}>You decide who gets access. Revoking blocks your partner from reading your shared cycle data and invalidates this invitation. Your own cycle stays intact.</Text>
            {coupleId ? (
              <PressableScale accessibilityLabel="Revoke partner access" disabled={revoking} onPress={handleRevoke} style={[styles.revokeButton, { backgroundColor: '#FFF3F5', borderColor: colors.danger + '30' }]}>
                {revoking ? <ActivityIndicator color={colors.danger} /> : <><Unlink size={18} color={colors.danger} /><Text style={[typography.body, { color: colors.danger, fontWeight: '600' }]}>Revoke Partner Access</Text></>}
              </PressableScale>
            ) : <View style={styles.sovereigntyHeader}><ShieldCheck size={16} color={colors.accentSage} /><Text style={[typography.caption, { color: colors.accentSage }]}>No partner has access to your data</Text></View>}
          </Card>
        )}
        {userRole !== null && (
          <Card style={styles.card}>
            <Text style={styles.cardLabel}>{userRole === 'her' ? 'DAILY CYCLE CHECK-IN' : 'DAILY EMPATHY REMINDER'}</Text>
            <View style={styles.pairRow}>
              <View style={styles.pairTextWrap}>
                <Text style={styles.pairTitle}>{userRole === 'her' ? 'A moment for yourself' : 'Make time for care'}</Text>
                <Text style={styles.pairSubtitle}>{userRole === 'her' ? 'A gentle daily nudge to log your symptoms and check in with yourself.' : 'A gentle daily nudge to open your brief and micro-mission.'}</Text>
              </View>
              <Switch
                accessibilityLabel={userRole === 'her' ? 'Daily cycle reminder' : 'Daily empathy reminder'}
                value={reminderEnabled}
                disabled={reminderBusy || Platform.OS === 'web'}
                onValueChange={value => { void handleReminder(value); }}
                trackColor={{ false: colors.border, true: colors.accentRose }}
                thumbColor={colors.backgroundSurface}
              />
            </View>
            <Text style={styles.inputLabel}>Reminder time</Text>
            <NativeDateTimeField
              label={userRole === 'her' ? 'Cycle reminder time' : 'Empathy reminder time'}
              mode="time"
              value={reminderTime}
              disabled={reminderBusy}
              onChange={time => {
                if (reminderEnabled) void handleReminder(true, time);
                else saveReminder(false, time.getHours(), time.getMinutes());
              }}
            />
            <Text style={[styles.pairSubtitle, { marginTop: 12 }]}>
              {reminderBusy ? 'Saving reminder…' : 'Uses your local time. Cycle details stay off your lock screen.'}
            </Text>
          </Card>
        )}

        {/* ── Premium Testing ──────────────────────────────────── */}
        <Card style={styles.card}>
          <Text style={styles.cardLabel}>MEMBERSHIP</Text>
          <View style={styles.premiumRow}>
            <Text style={styles.premiumStatus}>
              Status:{' '}
              <Text
                style={{
                  color: isPremium ? colors.accentAmber : colors.textMuted,
                }}
              >
                {isPremium ? 'Couple’s Pass' : 'Free'}
              </Text>
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.unlockBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={() => navigation.navigate('Paywall')}
            >
              <Text style={styles.unlockBtnText}>{isPremium ? 'Manage pass' : 'Explore Couple’s Pass'}</Text>
            </Pressable>
          </View>
        </Card>

        {/* ── Reset ────────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [
            styles.dangerRow,
            pressed && styles.btnPressed,
          ]}
          onPress={handleReset}
        >
          <RotateCcw size={16} color={colors.accentRose} />
          <Text style={styles.dangerText}>Reset app data</Text>
        </Pressable>
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
  pageTitle: {
    ...typography.display,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
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

  // Shared pressed state
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },

  // Role + pairing rows
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  roleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  pairIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentRose + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairTextWrap: {
    flex: 1,
  },
  pairTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  pairSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Cycle settings inputs
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 4,
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputCol: {
    flex: 1,
  },
  saveBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accentSage,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 6,
    alignItems: 'center',
  },
  saveBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.onAccent,
  },

  // Premium Testing
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  premiumStatus: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  unlockBtn: {
    backgroundColor: colors.accentAmber + '20',
    borderWidth: 1,
    borderColor: colors.accentAmber,
    paddingVertical: spacing.xs + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  unlockBtnText: {
    ...typography.caption,
    color: colors.accentAmber,
    fontWeight: '700',
  },
  resetBtn: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  resetBtnText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Danger zone
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  dangerText: {
    ...typography.caption,
    color: colors.accentRose,
    fontWeight: '600',
  },
  sovereigntyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  revokeButton: { borderWidth: 1, minHeight: 56, borderRadius: 16, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 12 },
});

export default SettingsScreen;
