import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, Clock, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, spacing, typography } from '../theme';

interface Props {
  label: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (value: Date) => void;
  maximumDate?: Date;
  disabled?: boolean;
}

/** Android uses its native dialog; iOS confirms a draft in a modal sheet. */
export function NativeDateTimeField({ label, value, mode, onChange, maximumDate, disabled }: Props) {
  const { colors, dark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(value);
  const close = () => setVisible(false);
  const commit = (date: Date) => {
    if (!Number.isFinite(date.getTime()) || (maximumDate && date > maximumDate)) return;
    onChange(date);
    close();
  };
  const Icon = mode === 'date' ? CalendarDays : Clock;
  const picker = (
    <DateTimePicker
      value={draft}
      mode={mode}
      display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'}
      maximumDate={maximumDate}
      themeVariant={dark ? 'dark' : 'light'}
      accentColor={colors.accentRose}
      onValueChange={(_, selected) => {
        if (Platform.OS === 'android') commit(selected);
        else setDraft(selected);
      }}
      onDismiss={close}
    />
  );
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled || Platform.OS === 'web'}
        onPress={() => { setDraft(value); setVisible(true); }}
        style={({ pressed }) => [styles.field, {
          backgroundColor: colors.backgroundSurface, borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        }]}
      >
        <Icon size={20} color={colors.accentRose} />
        <Text style={[typography.body, styles.value, { color: colors.textPrimary }]}>
          {mode === 'date'
            ? value.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
            : value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </Text>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>
      {Platform.OS === 'web' && <Text style={[typography.caption, { color: colors.textSecondary }]}>Choose a {mode} in the Sway mobile app.</Text>}
      {visible && Platform.OS === 'android' && picker}
      {Platform.OS === 'ios' && (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
          <View style={styles.backdrop}>
            <Pressable accessibilityLabel="Cancel selection" style={StyleSheet.absoluteFill} onPress={close} />
            <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.backgroundSurface }]}>
              <Text style={[typography.title, { color: colors.textPrimary }]}>{label}</Text>
              {picker}
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={close} style={styles.action}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => commit(draft)} style={[styles.action, { backgroundColor: colors.accentRose, borderRadius: 24 }]}>
                  <Text style={[typography.body, { color: colors.onAccent, fontWeight: '600' }]}>Done</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 16, minHeight: 56 },
  value: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  sheet: { padding: spacing.lg, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 16 },
  action: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
