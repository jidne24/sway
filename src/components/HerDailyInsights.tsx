import React, { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Check, LockKeyhole, Minus } from 'lucide-react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useCycleStore } from '../store/useCycleStore';
import { useThemeStyles, typography, type Palette } from '../theme';
import { PressableScale } from './PressableScale';
import type { RootStackParamList } from '../navigation/types';
import type { EmpathyBrief } from '../types/cycle';

export function HerDailyInsights({ brief }: { brief: EmpathyBrief }) {
  const { colors, styles } = useThemeStyles(createStyles);
  const premium = useCycleStore(s => s.isPremium);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const target = useRef<View | null>(null);
  return (
    <View style={styles.section}>
      <View style={styles.heading}><Text style={styles.title}>Today’s Do’s &amp; Don’ts</Text>{!premium && <LockKeyhole size={15} color={colors.textMuted} />}</View>
      {premium ? (
        <View style={styles.lists}>
          <Text style={styles.label}>DO’S</Text>
          {brief.doList.map(item => <View style={styles.row} key={item}><Check size={16} color={colors.accentSage} /><Text style={styles.item}>{item}</Text></View>)}
          <Text style={[styles.label, { marginTop: 8 }]}>DON’TS</Text>
          {brief.dontList.map(item => <View style={styles.row} key={item}><Minus size={16} color={colors.accentRose} /><Text style={styles.item}>{item}</Text></View>)}
          <Text style={styles.caption}>Suggestions, not rules. Your experience comes first.</Text>
        </View>
      ) : (
        <View style={styles.locked}>
          {/* Never render premium guidance beneath the blur or into accessibility. */}
          <BlurTargetView ref={target} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.preview}>
            {[80, 95, 68, 87].map((width, index) => <View key={index} style={styles.row}><View style={styles.previewDot} /><View style={[styles.previewLine, { width: `${width - 15}%` }]} /></View>)}
          </BlurTargetView>
          <BlurView blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus" intensity={65} tint="light" pointerEvents="none" style={StyleSheet.absoluteFill} />
          <View style={styles.veil} pointerEvents="none" />
          <View style={styles.unlock}>
            <Text style={styles.lockedCopy}>A little guidance for your daily rhythm.</Text>
            <PressableScale accessibilityLabel="Unlock Insights with Couple’s Pass" onPress={() => navigation.navigate('Paywall')} style={styles.button}><LockKeyhole size={15} color={colors.onAccent} /><Text style={styles.buttonText}>Unlock Insights</Text></PressableScale>
          </View>
        </View>
      )}
    </View>
  );
}
const createStyles = (c: Palette) => StyleSheet.create({
  section: { borderTopWidth: 1, borderTopColor: c.border, marginTop: 20, paddingTop: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { ...typography.body, color: c.textPrimary, fontWeight: '600', flex: 1 },
  lists: { gap: 12 },
  label: { ...typography.tag, fontSize: 10, color: c.textMuted, letterSpacing: .8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  item: { ...typography.caption, color: c.textSecondary, flex: 1 },
  caption: { ...typography.caption, color: c.textMuted, fontSize: 11, marginTop: 4 },
  locked: { borderRadius: 16, overflow: 'hidden', backgroundColor: c.backgroundPrimary },
  preview: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, gap: 16, padding: 20 },
  previewDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.accentSage + '70' },
  previewLine: { height: 10, borderRadius: 5, backgroundColor: c.textMuted + '60' },
  veil: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#FFFFFF65' },
  unlock: { minHeight: 156, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 12 },
  lockedCopy: { ...typography.caption, color: c.textSecondary, textAlign: 'center' },
  button: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: c.accentRose, borderRadius: 14 },
  buttonText: { ...typography.caption, color: c.onAccent, fontWeight: '600' },
});
