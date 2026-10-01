/**
 * OnboardingScreen — role selection gate.
 *
 * Shown until a role is chosen (persisted in useCycleStore). Selection leads
 * into the Pairing step, which completes onboarding and routes to the
 * role's dashboard.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Droplets, HeartHandshake, ChevronRight } from 'lucide-react-native';
import { Screen } from '../components';
import { useThemeStyles, type Palette, typography, spacing, radius } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import type { UserRole } from '../types/user';
import { useCycleStore } from "../store/useCycleStore";
import { NativeDateTimeField } from '../components/NativeDateTimeField';
import { isValidCycleData, toDateKey } from '../utils/cycleDates';

// ─── Role card ───────────────────────────────────────────────────────────────

interface RoleCardProps {
  icon: React.ReactNode;
  iconBackground: string;
  title: string;
  subtitle: string;
  delay: number;
  onPress: () => void;
}

function RoleCard({
  icon,
  iconBackground,
  title,
  subtitle,
  delay,
  onPress,
}: RoleCardProps) {
  const { colors, styles } = useThemeStyles(createStyles);
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify().damping(18)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.roleCard,
          pressed && styles.roleCardPressed,
        ]}
      >
        <View style={[styles.iconChip, { backgroundColor: iconBackground }]}>
          {icon}
        </View>
        <View style={styles.roleTextWrap}>
          <Text style={styles.roleTitle}>{title}</Text>
          <Text style={styles.roleSubtitle}>{subtitle}</Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function OnboardingScreen() {
  const { colors, styles } = useThemeStyles(createStyles);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { setCycleData } = useCycleStore();

  const [step, setStep] = useState<'role' | 'cycle_setup'>('role');
  const [editStart, setEditStart] = useState(() => new Date());
  const [editCycleLen, setEditCycleLen] = useState('28');

  const chooseRole = (role: UserRole) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (role === 'her') {
      setStep('cycle_setup');
    } else {
      navigation.navigate('Pairing', { context: 'onboarding', role });
    }
  };

  const finishCycleSetup = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cl = Number(editCycleLen);
    if (!isValidCycleData(toDateKey(editStart), cl, 5)) {
      Alert.alert('Check your cycle details', 'Choose a past or current period start date and a cycle length between 20 and 45 days.');
      return;
    }
    setCycleData(toDateKey(editStart), cl, 5);
    navigation.navigate('Pairing', { context: 'onboarding', role: 'her' });
  };

  return (
    <Screen includeBottom>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {step === 'role' ? (
          <>
            <Animated.View
              entering={FadeInUp.springify().damping(18)}
              style={styles.hero}
            >
              <Text style={styles.brand}>Sway</Text>
              <Text style={styles.tagline}>Cycle-synced empathy for two.</Text>
              <Text style={styles.description}>
                One of you tracks the cycle. The other gets a daily empathy brief —
                so you move through every phase in sync.
              </Text>
            </Animated.View>

            <View style={styles.cards}>
              <RoleCard
                delay={120}
                icon={<Droplets size={22} color={colors.accentRose} />}
                iconBackground={colors.accentRose + '1F'}
                title="I&apos;m tracking my cycle"
                subtitle="Log symptoms and phases — and send a craving SOS when you need care."
                onPress={() => chooseRole('her')}
              />
              <RoleCard
                delay={240}
                icon={<HeartHandshake size={22} color={colors.accentSage} />}
                iconBackground={colors.accentSage + '1F'}
                title="I&apos;m supporting my partner"
                subtitle="Get empathy briefs, a conflict radar, and daily care missions."
                onPress={() => chooseRole('partner')}
              />
            </View>

            <Text style={styles.footer}>
              You&apos;ll link your devices in the next step.
            </Text>
          </>
        ) : (
          <Animated.View entering={FadeInUp.springify().damping(18)}>
            <Text style={styles.brand}>Your rhythm</Text>
            <Text style={styles.description}>
              Start with two details to estimate your cycle. Your body sets the rhythm; these predictions are a guide.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Last Period Start Date</Text>
              <NativeDateTimeField
                label="Last period start date"
                mode="date"
                value={editStart}
                onChange={setEditStart}
                maximumDate={new Date()}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Average Cycle Length (Days)</Text>
              <TextInput
                style={styles.input}
                value={editCycleLen}
                onChangeText={setEditCycleLen}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.continueBtn,
                pressed && styles.continueBtnPressed,
              ]}
              onPress={finishCycleSetup}
            >
              <Text style={styles.continueBtnText}>Continue to Pairing</Text>
              <ChevronRight size={20} color={colors.onAccent} />
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md + 4,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  brand: {
    ...typography.display,
    fontSize: 40,
    lineHeight: 48,
    color: colors.accentRose,
    letterSpacing: 1.5,
  },
  tagline: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    maxWidth: 340,
  },
  cards: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card + 4,
    padding: spacing.md + 4,
  },
  roleCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  iconChip: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTextWrap: {
    flex: 1,
  },
  roleTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  roleSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 3,
  },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  formGroup: {
    marginTop: spacing.lg,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.backgroundSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.xl,
  },
  continueBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  continueBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.onAccent,
  },
});

export default OnboardingScreen;
