/**
 * SOSModal — Bottom-sheet comfort request modal.
 *
 * Large tap-friendly grid cards with Lucide icons, clean backdrop dismiss,
 * heavy haptic on send, nav-bar-aware padding.
 */
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Cookie,
  Flame,
  Heart,
  UtensilsCrossed,
  Send,
} from 'lucide-react-native';
import { useThemeStyles, type Palette, typography, spacing, radius } from '../theme';
import { useCycleStore } from '../store/useCycleStore';
import type { SOSAlertType } from '../types/cycle';

interface SOSModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PresetButton {
  type: SOSAlertType;
  label: string;
  icon: React.ReactNode;
}

const makePRESETS = (colors: Palette): PresetButton[] => ([
  {
    type: 'chocolate',
    label: 'Chocolate & Snacks',
    icon: <Cookie size={24} color={colors.accentAmber} />,
  },
  {
    type: 'heating_pad',
    label: 'Heating Pad & Tea',
    icon: <Flame size={24} color={colors.accentRose} />,
  },
  {
    type: 'quiet_hug',
    label: 'Quiet Hug',
    icon: <Heart size={24} color={colors.accentRose} />,
  },
  {
    type: 'comfort_meal',
    label: 'Order Comfort Meal',
    icon: <UtensilsCrossed size={24} color={colors.accentSage} />,
  },
]);

export function SOSModal({ visible, onClose }: SOSModalProps) {
  const { colors, styles } = useThemeStyles(createStyles);
  const PRESETS = makePRESETS(colors);
  const triggerSOS = useCycleStore((s) => s.triggerSOS);
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<SOSAlertType | null>(null);
  const [customNote, setCustomNote] = useState('');

  const handleSend = () => {
    if (!selectedType) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    triggerSOS(selectedType, customNote.trim() || undefined);
    setSelectedType(null);
    setCustomNote('');
    onClose();
  };

  const handleClose = () => {
    setSelectedType(null);
    setCustomNote('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      {/* Backdrop — tapping dismisses */}
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          {/* Sheet — stop event propagation */}
          <Pressable
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + spacing.lg },
            ]}
            onPress={() => {}}
          >
            <View style={styles.handleBar} />

            <Text style={styles.title}>Craving SOS</Text>
            <Text style={styles.subtitle}>
              Let your partner know what would help right now.
            </Text>

            {/* Preset grid — 2×2 large tap targets */}
            <View style={styles.presetGrid}>
              {PRESETS.map((p) => {
                const active = selectedType === p.type;
                return (
                  <Pressable
                    key={p.type}
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      setSelectedType(p.type);
                    }}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    style={({ pressed }) => [
                      styles.presetBtn,
                      active && styles.presetBtnActive,
                      pressed && !active && styles.presetBtnPressed,
                    ]}
                  >
                    {p.icon}
                    <Text
                      style={[
                        styles.presetLabel,
                        active && styles.presetLabelActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom note */}
            <TextInput
              style={styles.textInput}
              placeholder="Add a note (optional)…"
              placeholderTextColor={colors.textMuted}
              value={customNote}
              onChangeText={setCustomNote}
              multiline
              maxLength={200}
            />

            {/* Send button */}
            <Pressable
              onPress={handleSend}
              disabled={!selectedType}
              style={({ pressed }) => [
                styles.sendBtn,
                !selectedType && styles.sendBtnDisabled,
                pressed && selectedType && styles.sendBtnPressed,
              ]}
            >
              <Send size={16} color={colors.onAccent} />
              <Text style={styles.sendBtnText}>Send to Partner</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: spacing.sm,
    // paddingBottom applied inline from useSafeAreaInsets (nav-bar aware)
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },

  /* ── 2×2 grid with 47% width cards ── */
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: spacing.md,
  },
  presetBtn: {
    width: '47%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.sm,
    minHeight: 100,
  },
  presetBtnActive: {
    borderColor: colors.accentRose,
    backgroundColor: colors.accentRose + '15',
  },
  presetBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  presetLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  presetLabelActive: {
    color: colors.accentRose,
  },

  textInput: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm + 4,
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    minHeight: 56,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  sendBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.accentRose,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  sendBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.onAccent,
  },
});

export default SOSModal;
