import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Check, ChevronRight, Heart, LockKeyhole, Radar, ShieldCheck, X } from 'lucide-react-native';
import { Screen } from '../components';
import { PressableScale } from '../components/PressableScale';
import { SwayLogo } from '../components/SwayLogo';
import { useThemeStyles, type Palette, typography, elevation } from '../theme';
import { getOfferings, purchasePackage, restorePurchases, type SwayOfferings } from '../services/revenuecat';
import { useCycleStore } from '../store/useCycleStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PASS_PRICING, ANNUAL_SAVINGS_PERCENT, matchesAdvertisedPrice } from '../utils/subscriptionPricing';

const FEATURES = [
  ['Daily Do’s & Don’ts', 'Gentle, phase-based suggestions for her everyday rhythm.'],
  ['Unlock Conflict Radar', 'Find a gentler moment for important conversations.'],
  ['Deep Empathy Insights', 'Understand her estimated rhythm, beyond the basics.'],
];
const legalLinks = [
  { title: 'Terms', url: process.env.EXPO_PUBLIC_TERMS_URL },
  { title: 'Privacy', url: process.env.EXPO_PUBLIC_PRIVACY_URL },
].filter((link): link is { title: string; url: string } => !!link.url && /^https:\/\//.test(link.url));

export function PaywallScreen() {
  const { colors, styles } = useThemeStyles(createStyles);
  const navigation = useNavigation();
  const premium = useCycleStore(s => s.isPremium);
  const [offerings, setOfferings] = useState<SwayOfferings | null>(null);
  const [selected, setSelected] = useState<'annual' | 'monthly'>('annual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);

  const receive = useCallback((live: SwayOfferings) => {
    if (!mounted.current) return;
    setOfferings(live);
    if (!live.annual && live.monthly) setSelected('monthly');
    setError(!live.annual && !live.monthly);
    setLoading(false);
  }, []);
  const failed = useCallback(() => {
    if (!mounted.current) return;
    setOfferings(null);
    setError(true);
    setLoading(false);
  }, []);

  const load = useCallback(() => getOfferings().then(receive, failed), [receive, failed]);
  useEffect(() => {
    mounted.current = true;
    void getOfferings().then(receive, failed);
    return () => { mounted.current = false; };
  }, [receive, failed]);

  const plan = offerings?.[selected];
  const validPrice = matchesAdvertisedPrice(plan);

  const purchase = async () => {
    if (!plan || busy) return;
    setBusy(true);
    try {
      const result = await purchasePackage(plan);
      if (result === 'purchased') navigation.goBack();
      else if (result === 'price_mismatch') { Alert.alert('Store pricing changed', 'Checkout was stopped because the store price does not match this offer. Please refresh or try again later.'); void load(); }
      else if (result !== 'cancelled') Alert.alert('Purchase not confirmed', 'Please try again. If you were charged, restore purchases before buying again.');
    } finally { setBusy(false); }
  };
  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (await restorePurchases()) { Alert.alert('Welcome back', 'Your Couple’s Pass is active.'); navigation.goBack(); }
      else Alert.alert('No active pass found', 'Check that you’re using the store account that purchased your subscription.');
    } catch { Alert.alert('Restore unavailable', 'Check your connection and store account, then try again. Purchases must be configured on this build.'); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <View style={styles.topbar}>
        <View style={styles.brand}><SwayLogo size={28} /><Text style={styles.brandText}>Sway</Text></View>
        <PressableScale onPress={() => navigation.goBack()} disabled={busy} accessibilityLabel="Close membership screen" style={styles.close}><X size={22} color={colors.textSecondary} /></PressableScale>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroOrbit}>
            <View style={styles.heroInner}><Heart size={56} color={colors.accentRose} strokeWidth={1.3} fill={colors.accentSoft} /></View>
            <View style={[styles.floatingIcon, styles.radarIcon]}><Radar size={22} color={colors.accentSage} /></View>
            <View style={[styles.floatingIcon, styles.shieldIcon]}><ShieldCheck size={22} color={colors.accentRose} /></View>
            <View style={styles.spark} />
          </View>
          <Text style={styles.eyebrow}>COUPLE’S PASS</Text>
          <Text style={styles.headline}>Closer, one thoughtful{ '\n' }moment at a time.</Text>
          <Text style={styles.subtitle}>Turn understanding into everyday care.</Text>
        </View>
        <View style={styles.features}>
          <Text style={styles.featureTitle}>Premium benefits</Text>
          {FEATURES.map(([title, description]) => (
            <View key={title} style={styles.featureRow}>
              <View style={styles.check}><Check size={16} color={colors.accentSage} strokeWidth={2.6} /></View>
              <View style={styles.featureCopy}><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureDescription}>{description}</Text></View>
            </View>
          ))}
        </View>
        {premium ? (
          <View style={styles.activeCard}><ShieldCheck size={24} color={colors.accentSage} /><Text style={styles.featureTitle}>Your Couple’s Pass is active</Text></View>
        ) : null}
        <View style={styles.plans} accessibilityRole="radiogroup">
          {(['monthly', 'annual'] as const).map(key => {
            const advertised = PASS_PRICING[key];
            const chosen = selected === key;
            return <PressableScale key={key} accessibilityRole="radio" accessibilityLabel={`${advertised.title}, ${advertised.priceString} per ${advertised.interval}${key === 'annual' ? ', save 33 percent' : ''}`} accessibilityState={{ checked: chosen }} disabled={busy || premium} onPress={() => setSelected(key)} style={[styles.plan, chosen && styles.planSelected]}>
              <View style={[styles.radio, chosen && styles.radioSelected]}>{chosen && <View style={styles.radioDot} />}</View>
              <View style={styles.planCopy}>
                <View style={styles.planTitleRow}><Text style={styles.planTitle}>{advertised.title}</Text>{key === 'annual' && <View style={styles.saving}><Text style={styles.savingText}>Save {ANNUAL_SAVINGS_PERCENT}%</Text></View>}</View>
                <Text style={styles.featureDescription}>{key === 'annual' ? 'Billed once a year' : 'Billed every month'}</Text>
              </View>
              <View style={styles.priceWrap}><Text style={styles.price}>{advertised.priceString}</Text><Text style={styles.pricePeriod}>/ {advertised.interval}</Text></View>
            </PressableScale>;
          })}
        </View>
        {!premium && (loading ? (
          <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel="Loading store prices"><ActivityIndicator color={colors.accentRose} /><Text style={styles.featureDescription}>Getting your store’s prices…</Text></View>
        ) : error || !validPrice ? (
          <View style={styles.unavailable}>
            <Text style={styles.featureTitle}>Membership is unavailable right now</Text>
            <Text style={styles.featureDescription}>{error ? 'Your free features are still here. Connect to the store to continue.' : 'Checkout is paused: your store offering does not match these USD prices. You will not be charged.'}</Text>
            <PressableScale onPress={() => { setLoading(true); setError(false); void load(); }} style={styles.retry}><Text style={styles.retryText}>Retry store connection</Text><ChevronRight size={16} color={colors.accentRose} /></PressableScale>
          </View>
        ) : null)}
        <Text style={styles.disclaimer}>Cycle-based insights are estimates, not medical advice. Listening to her always comes first.</Text>
        <Text style={styles.billing}>Prices shown in USD. Auto-renews unless cancelled. Manage or cancel in your store settings. The store confirms your price and billing terms before payment.</Text>
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        {premium ? <PressableScale onPress={() => { void Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions').catch(() => Alert.alert('Could not open the store', 'Manage your subscription in your device’s store settings.')); }} style={styles.cta}><Text style={styles.ctaText}>Manage subscription</Text></PressableScale>
          : <PressableScale accessibilityLabel="Continue with Couple’s Pass" disabled={!plan || !validPrice || loading || error || busy} onPress={() => { void purchase(); }} style={styles.cta}>
            {busy ? <ActivityIndicator color={colors.onAccent} /> : <><Text style={styles.ctaText}>Continue with Couple’s Pass</Text><ChevronRight size={18} color={colors.onAccent} /></>}
          </PressableScale>}
        <View style={styles.secure}><LockKeyhole size={12} color={colors.textMuted} /><Text style={styles.secureText}>Secure checkout · {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}</Text></View>
        <View style={styles.legal}>
          <PressableScale disabled={busy} onPress={() => { void restore(); }} style={styles.legalButton}><Text style={styles.legalText}>Restore purchases</Text></PressableScale>
          {legalLinks.map(link => <PressableScale key={link.title} onPress={() => { void Linking.openURL(link.url).catch(() => Alert.alert('Could not open link', 'Please try again.')); }} style={styles.legalButton}><Text style={styles.legalText}>{link.title}</Text></PressableScale>)}
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  topbar: { paddingHorizontal: 24, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { ...typography.title, color: c.textPrimary, fontSize: 21, letterSpacing: -.5 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: c.backgroundSurface, borderRadius: 22, borderWidth: 1, borderColor: c.border },
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  scroll: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 24 },
  heroOrbit: { width: 160, height: 160, borderRadius: 80, borderColor: c.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  heroInner: { width: 112, height: 112, borderRadius: 40, backgroundColor: c.backgroundSurface, ...elevation.floating, alignItems: 'center', justifyContent: 'center' },
  floatingIcon: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.backgroundSurface, ...elevation.card, position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  radarIcon: { left: -8, top: 22 }, shieldIcon: { right: -8, bottom: 18 },
  spark: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.phaseMenstrual, position: 'absolute', top: 2, right: 36 },
  eyebrow: { ...typography.tag, color: c.accentRose, letterSpacing: 1.6 },
  headline: { ...typography.display, fontSize: 30, lineHeight: 36, letterSpacing: -1, textAlign: 'center', color: c.textPrimary, marginTop: 12, fontWeight: '600' },
  subtitle: { ...typography.body, color: c.textSecondary, textAlign: 'center', marginTop: 12 },
  features: { gap: 20, marginTop: 32, marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  check: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.phaseFollicular, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  featureCopy: { flex: 1, gap: 3 },
  featureTitle: { ...typography.body, color: c.textPrimary, fontWeight: '600' },
  featureDescription: { ...typography.caption, color: c.textSecondary },
  plans: { gap: 12 },
  plan: { ...elevation.card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, backgroundColor: c.backgroundSurface, borderWidth: 1, borderColor: c.border, borderRadius: 20 },
  planSelected: { borderColor: c.accentRose, backgroundColor: c.accentSoft },
  radio: { width: 20, height: 20, borderWidth: 1.5, borderColor: c.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: c.accentRose },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accentRose },
  planCopy: { flex: 1, gap: 4 },
  planTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  planTitle: { ...typography.body, color: c.textPrimary, fontWeight: '600' },
  saving: { backgroundColor: c.phaseFollicular, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  savingText: { ...typography.caption, color: c.accentSage, fontSize: 11, fontWeight: '600' },
  priceWrap: { alignItems: 'flex-end', maxWidth: '40%' },
  price: { ...typography.body, color: c.textPrimary, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pricePeriod: { ...typography.caption, color: c.textSecondary },
  loading: { padding: 32, alignItems: 'center', gap: 12 },
  unavailable: { marginTop: 16, padding: 20, backgroundColor: c.backgroundSurface, borderWidth: 1, borderColor: c.border, borderRadius: 20, gap: 12 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  retryText: { ...typography.caption, color: c.accentRose, fontWeight: '600' },
  activeCard: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.phaseFollicular, padding: 20, borderRadius: 20 },
  disclaimer: { ...typography.caption, color: c.textSecondary, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 20 },
  footer: { flexShrink: 0, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, backgroundColor: c.backgroundSurface, borderTopWidth: 1, borderColor: c.border, shadowColor: '#172232', shadowOffset: { width: 0, height: -4 }, shadowOpacity: .06, shadowRadius: 12, elevation: 8 },
  cta: { backgroundColor: c.accentRose, borderRadius: 18, minHeight: 56, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  ctaText: { ...typography.body, color: c.onAccent, fontWeight: '600', flexShrink: 1 },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  secureText: { ...typography.caption, color: c.textSecondary, fontSize: 11 },
  billing: { ...typography.caption, fontSize: 10, lineHeight: 14, textAlign: 'center', color: c.textSecondary, marginTop: 8 },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  legalButton: { minHeight: 44, justifyContent: 'center' },
  legalText: { ...typography.caption, color: c.textSecondary, fontSize: 12 },
});
export default PaywallScreen;
