import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';
import { Unlink } from 'lucide-react-native';
import { useCycleStore } from '../store/useCycleStore';
import { useThemeStyles, typography, type Palette } from '../theme';
import { PressableScale } from './PressableScale';

export function DisconnectPartnerButton() {
  const { colors, styles } = useThemeStyles(createStyles);
  const leave = useCycleStore(s => s.leavePartner);
  const [busy, setBusy] = useState(false);
  const confirm = () => Alert.alert('Disconnect your apps?', 'You will no longer have access to her shared information. Her cycle data stays with her. Reconnecting requires a new invitation.', [
    { text: 'Stay connected', style: 'cancel' },
    { text: 'Disconnect', style: 'destructive', onPress: () => {
      setBusy(true);
      void leave().then(success => {
        if (!success) Alert.alert('Still connected', 'We could not confirm disconnection. Check your connection and the latest Supabase migration, then try again.');
      }).finally(() => setBusy(false));
    } },
  ]);
  return <PressableScale accessibilityLabel="Disconnect / Unlink partner" disabled={busy} onPress={confirm} style={styles.button}>
    {busy ? <ActivityIndicator color={colors.textPrimary} /> : <><Unlink size={18} color={colors.textPrimary} /><Text style={styles.label}>Disconnect / Unlink</Text></>}
  </PressableScale>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, padding: 14, borderRadius: 14, backgroundColor: c.backgroundPrimary, borderWidth: 1, borderColor: c.border },
  label: { ...typography.body, color: c.textPrimary, fontWeight: '600' },
});
