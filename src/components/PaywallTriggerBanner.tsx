import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { ChevronRight, Heart, ShieldCheck } from 'lucide-react-native';
import { useThemeStyles, type Palette, typography } from '../theme';
import { useCycleStore } from '../store/useCycleStore';
import { PressableScale } from './PressableScale';
import type { RootStackParamList } from '../navigation/types';

export function PaywallTriggerBanner() {
  const { colors, styles } = useThemeStyles(createStyles);
  const premium = useCycleStore(s => s.isPremium);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  if (premium) return <View style={styles.active}><ShieldCheck size={15} color={colors.accentSage} /><Text style={styles.activeText}>Couple’s Pass active</Text></View>;
  return <PressableScale onPress={() => navigation.navigate('Paywall')} style={styles.banner}>
    <View style={styles.icon}><Heart size={20} color={colors.accentRose} /></View>
    <View style={styles.copy}><Text style={styles.title}>A little more understanding.</Text><Text style={styles.subtitle}>Explore Couple’s Pass</Text></View>
    <ChevronRight size={18} color={colors.textSecondary} />
  </PressableScale>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  banner: { marginTop: 24, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, backgroundColor: c.backgroundSurface, borderWidth: 1, borderColor: c.border, borderRadius: 20 },
  icon: { width: 40, height: 40, borderRadius: 14, backgroundColor: c.accentSoft, justifyContent: 'center', alignItems: 'center' },
  copy: { flex: 1, gap: 2 }, title: { ...typography.body, color: c.textPrimary, fontWeight: '600', fontSize: 15 },
  subtitle: { ...typography.caption, color: c.textSecondary },
  active: { marginTop: 24, gap: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  activeText: { ...typography.caption, color: c.accentSage },
});
export default PaywallTriggerBanner;
