/**
 * PairingScreen — partner linking, doubling as an onboarding step.
 *
 * Her device generates a 6-character code (inserts a `couples` row); the
 * partner enters it to join (claims `partner_uuid`). In onboarding context,
 * the chosen role is persisted when the flow completes and the user lands
 * on their dashboard. Never simulates a connection when Supabase is absent.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { X, CheckCircle2, Clock } from 'lucide-react-native';
import { Screen, Card } from '../components';
import { useThemeStyles, type Palette, typography, spacing, radius } from '../theme';
import { useCycleStore } from '../store/useCycleStore';
import {
  generatePairCode,
  joinWithPairCode,
} from '../services/pairing';
import { isSupabaseConfigured } from '../services/supabase';
import type { RootStackParamList } from '../navigation/types';
import { DisconnectPartnerButton } from '../components/DisconnectPartnerButton';

export function PairingScreen() {
  const { colors, styles } = useThemeStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Pairing'>>();
  const context = route.params?.context ?? 'settings';
  const pendingRole = route.params?.role;

  const {
    userRole,
    pairCode,
    partnerConnected,
    setPairCode,
    setCoupleId,
    connectPartner,
    setUserRole,
  } = useCycleStore();

  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);

  // ─── Flow control ──────────────────────────────────────────────────────

  /** Persist the onboarding role (if any) and leave the modal. */
  const finish = () => {
    if (pendingRole) setUserRole(pendingRole);
    navigation.goBack();
  };

  // ─── Generate (her device) ─────────────────────────────────────────────

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const result = await generatePairCode();
      if (result) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        setPairCode(result.code);
        setCoupleId(result.coupleId);
        return;
      }
      Alert.alert(
        'Invitation could not be created',
        isSupabaseConfigured ? 'Check your connection and try again. Online pairing requires anonymous sign-in and the latest Supabase schema.' : 'Online pairing is not configured on this build. Your cycle stays on this device.',
      );
    } finally {
      setBusy(false);
    }
  };

  // ─── Join (partner device) ─────────────────────────────────────────────

  const handleJoin = async () => {
    if (useCycleStore.getState().partnerConnected) return;
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      Alert.alert(
        'Invalid Code',
        'Enter the 6-character code from your partner.',
      );
      return;
    }
    setBusy(true);
    try {
      const outcome = await joinWithPairCode(code);
      switch (outcome.status) {
        case 'joined':
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          setPairCode(code);
          setCoupleId(outcome.coupleId);
          connectPartner();
          finish();
          break;
        case 'own_code':
          Alert.alert(
            "That's your own code",
            'Share it with your partner and let them enter it on their device.',
          );
          break;
        case 'not_found':
          Alert.alert(
            'Code Not Found',
            'Double-check the code and try again.',
          );
          break;
        case 'unavailable':
          Alert.alert(
            'Pairing Unavailable',
            'Check your connection and try again. Online pairing requires anonymous sign-in and the latest Supabase schema.',
          );
          break;
      }
    } finally {
      setBusy(false);
    }
  };

  // ─── Cards ─────────────────────────────────────────────────────────────

  const shareCard = (
    <Card style={styles.card}>
      <Text style={styles.cardLabel}>SHARE YOUR CODE</Text>
      {pairCode ? (
        <View style={styles.pairCodeRow}>
          <Text style={styles.pairCodeText}>{pairCode}</Text>
          <View style={styles.statusRow}>
            {partnerConnected ? (
              <>
                <CheckCircle2 size={14} color={colors.accentSage} />
                <Text style={[styles.pairStatus, styles.statusConnected]}>
                  Connected
                </Text>
              </>
            ) : (
              <>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={styles.pairStatus}>Waiting for partner</Text>
              </>
            )}
          </View>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.generateBtn,
            pressed && styles.btnPressed,
            busy && styles.btnBusy,
          ]}
          onPress={handleGenerate}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <Text style={styles.generateBtnText}>Generate Pair Code</Text>
          )}
        </Pressable>
      )}

    </Card>
  );

  const joinCard = (
    <Card style={styles.card}>
      {partnerConnected ? <DisconnectPartnerButton /> : <>
      <Text style={styles.cardLabel}>JOIN YOUR PARTNER</Text>
      <Text style={styles.inputLabel}>Enter their 6-character code</Text>
      <TextInput
        style={styles.codeInput}
        value={joinCode}
        onChangeText={setJoinCode}
        placeholder="e.g. K7M2PQ"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
      />
      <Pressable
        style={({ pressed }) => [
          styles.joinBtn,
          pressed && styles.btnPressed,
          (busy || joinCode.trim().length !== 6) && styles.btnBusy,
        ]}
        onPress={handleJoin}
        disabled={busy || joinCode.trim().length !== 6}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.onAccent} />
        ) : (
          <Text style={styles.joinBtnText}>Link Our Apps</Text>
        )}
      </Pressable>
      </>}
    </Card>
  );

  // ─── Render ────────────────────────────────────────────────────────────

  const title =
    context === 'onboarding'
      ? pendingRole === 'her'
        ? 'Link your partner'
        : 'Join your partner'
      : 'Pair with your Partner';

  const subtitle =
    context === 'onboarding'
      ? pendingRole === 'her'
        ? 'Generate a code and share it with your partner so their app stays in sync with your cycle.'
        : 'Enter the code shown on your partner’s device to link your apps.'
      : 'One of you generates a code, the other enters it. Your apps stay in sync from that moment on.';

  return (
    <Screen includeBottom>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Close button ─────────────────────────────────────── */}
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && styles.closeBtnPressed,
          ]}
        >
          <X size={22} color={colors.textSecondary} />
        </Pressable>

        <Text style={styles.pageTitle}>{title}</Text>
        <Text style={styles.pageSubtitle}>{subtitle}</Text>

        {!isSupabaseConfigured ? (
          <Text style={styles.offlineNote}>
            Online pairing is unavailable on this build. Your data stays on this device.
          </Text>
        ) : null}

        {/* Role-relevant card first */}
        {(pendingRole ?? userRole) === 'partner' ? joinCard : shareCard}

        {/* Onboarding exit */}
        {context === 'onboarding' ? (
          <Pressable
            style={({ pressed }) => [
              styles.continueBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={finish}
          >
            <Text style={styles.continueBtnText}>
              {pairCode || partnerConnected
                ? 'Continue to Dashboard'
                : 'Skip for now'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (colors: Palette) => StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md + 4,
    paddingBottom: spacing.xl,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  closeBtnPressed: {
    opacity: 0.6,
  },
  pageTitle: {
    ...typography.display,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  offlineNote: {
    ...typography.caption,
    color: colors.accentAmber,
    marginBottom: spacing.md,
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

  // Shared pressed / busy states
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  btnBusy: {
    opacity: 0.5,
  },

  // Pair code display
  pairCodeRow: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  pairCodeText: {
    ...typography.display,
    color: colors.accentRose,
    letterSpacing: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pairStatus: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusConnected: {
    color: colors.accentSage,
    fontWeight: '600',
  },
  generateBtn: {
    backgroundColor: colors.accentRose,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 6,
    alignItems: 'center',
  },
  generateBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.onAccent,
  },
  connectBtn: {
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.accentSage,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  connectBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accentSage,
  },

  // Join form
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  codeInput: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 4,
    color: colors.textPrimary,
    fontSize: typography.title.fontSize,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  joinBtn: {
    backgroundColor: colors.accentSage,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 6,
    alignItems: 'center',
  },
  joinBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.onAccent,
  },

  // Onboarding continue
  continueBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 6,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  continueBtnText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default PairingScreen;
