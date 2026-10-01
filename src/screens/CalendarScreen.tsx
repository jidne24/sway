import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { Screen, Header } from '../components';
import { CycleCalendar } from '../components/CycleCalendar';
import { CycleEditButton } from '../components/CycleEditButton';
import { useCycleStore } from '../store/useCycleStore';
import { useTheme, typography, spacing } from '../theme';

export function CalendarScreen() {
  const { colors } = useTheme();
  const role = useCycleStore(s => s.userRole);
  const connected = useCycleStore(s => s.partnerConnected);
  const share = useCycleStore(s => s.shareCalendarWithPartner);
  const verified = useCycleStore(s => s.calendarConsentVerified);
  const coupleId = useCycleStore(s => s.coupleId);
  const privateCalendar = role !== 'her' && !(share && verified && connected && coupleId);
  return (
    <Screen>
      <Header partnerConnected={connected} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[typography.tag, { color: colors.accentRose }]}>{role === 'her' ? 'YOUR CYCLE, YOUR CHOICE' : 'PLAN WITH CARE'}</Text>
        <Text style={[typography.display, { color: colors.textPrimary, marginTop: 8, marginBottom: 12 }]}>{role === 'her' ? 'Your cycle' : 'Her cycle'}</Text>
        {privateCalendar ? (
          <View style={[styles.private, { backgroundColor: colors.backgroundSurface, borderColor: colors.border }]}>
            <View style={[styles.lock, { backgroundColor: colors.accentRose + '18' }]}><LockKeyhole size={32} color={colors.accentRose} /></View>
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: 24 }]}>Private, by choice</Text>
            <Text style={[typography.body, styles.privateText, { color: colors.textSecondary }]}>
              Her calendar is hers to share. When she turns on calendar sharing in Settings, you can explore her predicted phases here.
            </Text>
            <View style={styles.trust}><ShieldCheck size={16} color={colors.accentSage} /><Text style={[typography.caption, { color: colors.textSecondary }]}>Sharing is always her decision</Text></View>
          </View>
        ) : (
          <>
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: 24 }]}>{role === 'her' ? 'A little space to understand your rhythm and look ahead.' : 'Shared with you. Explore her estimated rhythm, one day at a time.'}</Text>
            <CycleCalendar />
            {role === 'her' && <View style={{ marginTop: 24 }}><CycleEditButton /></View>}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 24, paddingBottom: spacing.xl },
  private: { alignItems: 'center', padding: 28, borderRadius: 28, borderWidth: 1, marginTop: 32 },
  lock: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  privateText: { textAlign: 'center', marginTop: 12 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' },
});
