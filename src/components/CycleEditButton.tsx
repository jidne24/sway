import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarPlus, Check, X } from 'lucide-react-native';
import { useTheme, typography, elevation } from '../theme';
import { useCycleStore } from '../store/useCycleStore';
import { parseDateKey, toDateKey } from '../utils/cycleDates';
import { NativeDateTimeField } from './NativeDateTimeField';
import { PressableScale } from './PressableScale';

function CycleEditSheet({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const start = useCycleStore(s => s.lastPeriodStartDate);
  const [date, setDate] = useState(() => parseDateKey(start) ?? new Date());
  const [saving, setSaving] = useState(false);
  const today = new Date();
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const synced = await useCycleStore.getState().setCycleData(toDateKey(date));
      if (!synced) {
        Alert.alert('Saved on your device', 'Your predictions are updated. We will retry partner sync when you reconnect.');
      }
      onClose();
    } finally { setSaving(false); }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => { if (!saving) onClose(); }}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close cycle editor" disabled={saving} style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View entering={SlideInDown.duration(320)} style={[styles.sheet, elevation.floating, { backgroundColor: colors.backgroundSurface }]}>
          <SafeAreaView edges={['bottom']}>
            <ScrollView bounces={false} contentContainerStyle={styles.sheetContent}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <View style={styles.heading}>
                <Text style={[typography.title, { color: colors.textPrimary, flex: 1 }]}>Your cycle. Your say.</Text>
                <PressableScale accessibilityLabel="Close cycle editor" disabled={saving} onPress={onClose} style={styles.close}><X size={22} color={colors.textSecondary} /></PressableScale>
              </View>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8, marginBottom: 24 }]}>Bodies don’t follow a perfect schedule. Log when your period actually started.</Text>
              <PressableScale onPress={() => setDate(today)} disabled={saving} style={[styles.today, { backgroundColor: colors.accentSoft }]}>
                <CalendarPlus size={20} color={colors.accentRose} />
                <Text style={[typography.body, { color: colors.accentRose, flex: 1, fontWeight: '600' }]}>My period started today</Text>
                {toDateKey(date) === toDateKey(today) && <Check size={18} color={colors.accentRose} />}
              </PressableScale>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 24, marginBottom: 12 }]}>Or choose the start date</Text>
              {Platform.OS === 'ios' ? (
                <DateTimePicker value={date} mode="date" display="inline" maximumDate={today} themeVariant="light" accentColor={colors.accentRose} onValueChange={(_, value) => setDate(value)} disabled={saving} />
              ) : (
                <NativeDateTimeField label="Period start date" mode="date" value={date} maximumDate={today} onChange={setDate} disabled={saving} />
              )}
              <Text style={[typography.caption, { color: colors.textSecondary, marginVertical: 20 }]}>This sets a new day one and updates all predictions. Your average cycle and period lengths stay the same.</Text>
              <PressableScale onPress={() => { void save(); }} disabled={saving} style={[styles.save, { backgroundColor: colors.accentRose }]}>
                {saving ? <ActivityIndicator color={colors.onAccent} /> : <Text style={[typography.body, { color: colors.onAccent, fontWeight: '600' }]}>Save period start</Text>}
              </PressableScale>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function CycleEditButton({ label = 'Edit cycle' }: { label?: string }) {
  const { colors } = useTheme();
  const role = useCycleStore(s => s.userRole);
  const [open, setOpen] = useState(false);
  if (role !== 'her') return null;
  return <>
    <PressableScale onPress={() => setOpen(true)} style={[styles.edit, { backgroundColor: colors.accentSoft, borderColor: colors.accentRose + '20' }]}>
      <CalendarPlus size={18} color={colors.accentRose} />
      <Text style={[typography.body, { color: colors.accentRose, fontWeight: '600' }]}>{label}</Text>
    </PressableScale>
    {open && <CycleEditSheet onClose={() => setOpen(false)} />}
  </>;
}

const styles = StyleSheet.create({
  edit: { borderWidth: 1, borderRadius: 16, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#152B4366' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '94%', overflow: 'hidden' },
  sheetContent: { paddingHorizontal: 24, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  today: { borderRadius: 16, padding: 16, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  save: { minHeight: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});
