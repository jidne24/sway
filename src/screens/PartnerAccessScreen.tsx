import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { HeartHandshake, ShieldCheck } from 'lucide-react-native';
import { Screen, Header } from '../components';
import { PressableScale } from '../components/PressableScale';
import { useTheme, typography, elevation } from '../theme';
import { useCycleStore } from '../store/useCycleStore';
import type { RootStackParamList } from '../navigation/types';

/** Never render cached biological data before current-session membership is verified. */
export function PartnerAccessScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const coupleId = useCycleStore(s => s.coupleId);
  const revoked = useCycleStore(s => s.partnerAccessRevoked);
  return (
    <Screen includeBottom>
      <Header partnerConnected={false} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, elevation.card, { backgroundColor: colors.backgroundSurface, borderColor: colors.border }]}>
          <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}><HeartHandshake size={40} color={colors.accentRose} strokeWidth={1.5} /></View>
          <Text style={[typography.title, styles.center, { color: colors.textPrimary, marginTop: 32 }]}>{coupleId ? 'Checking your connection' : revoked ? 'Her space is private again' : 'Care starts with a connection'}</Text>
          <Text style={[typography.body, styles.center, { color: colors.textSecondary, marginTop: 12 }]}>{coupleId
            ? 'We need to confirm your access before showing her daily brief. If you’re offline, reconnect and try again.'
            : revoked ? 'Partner access has ended. Her cycle information has been cleared from this app. Only she can invite you back.'
              : 'Enter a code she chooses to share with you. Her cycle information stays hers to control.'}</Text>
          {coupleId && <ActivityIndicator color={colors.accentRose} style={{ marginTop: 24 }} />}
          <PressableScale style={[styles.button, { backgroundColor: colors.accentRose }]} onPress={() => {
            if (coupleId) useCycleStore.getState().requestSync();
            else navigation.navigate('Pairing', { context: 'settings', role: 'partner' });
          }}><Text style={[typography.body, { color: colors.onAccent, fontWeight: '600' }]}>{coupleId ? 'Try again' : 'Enter an invitation code'}</Text></PressableScale>
          <View style={styles.trust}><ShieldCheck size={16} color={colors.accentSage} /><Text style={[typography.caption, { color: colors.textSecondary }]}>Consent comes first. Always.</Text></View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 28, padding: 28, alignItems: 'center' },
  icon: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  button: { alignSelf: 'stretch', minHeight: 56, padding: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  trust: { marginTop: 28, gap: 8, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
});
