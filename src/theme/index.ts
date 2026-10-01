import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useCycleStore } from '../store/useCycleStore';

/**
 * Sway Design System
 * Premium, empathetic cycle-sync app for couples.
 *
 * Defines the core visual tokens: colors, typography, spacing, and radii.
 */

// ─── Colors ──────────────────────────────────────────────────────────────────

const partnerColors = {
  /** Cool, near-white canvas shared by both roles */
  backgroundPrimary: '#F8FAFC',
  /** Crisp white elevated surface */
  backgroundSurface: '#FFFFFF',

  /** Primary role accent; indigo for Partner, rose for Her */
  accentRose: '#28557A',
  /** Harmony / Warning amber */
  accentAmber: '#9A6700',
  /** Calm / Recovery sage */
  accentSage: '#1B7154',
  accentIndigo: '#5973B7',
  onAccent: '#FFFFFF',
  accentSoft: '#EBF2F9',
  danger: '#BA3449',
  phaseMenstrual: '#F3C9D4',
  phaseFollicular: '#CDE6DC',
  phaseOvulatory: '#F8E3B8',
  phaseLuteal: '#DDD7F3',

  /** High-contrast slate text */
  textPrimary: '#1D2939',
  /** Secondary text */
  textSecondary: '#667085',
  /** Muted / disabled text */
  textMuted: '#667085',

  /** Border and divider lines */
  border: '#E9EDF2',
};

export type Palette = typeof partnerColors;

const herColors: Palette = {
  ...partnerColors,
  accentRose: '#C44367',
  accentSoft: '#FDF0F4',
};

export type ColorToken = keyof Palette;

// ─── Typography ──────────────────────────────────────────────────────────────

const fontFamily = Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' });
export const typography = {
  display: {
    fontFamily,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  body: {
    fontFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
  },
  caption: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
  },
  tag: {
    fontFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
} as const;

export type TypographyVariant = keyof typeof typography;

// ─── Spacing (4pt / 8pt grid) ────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export type SpacingToken = keyof typeof spacing;

// ─── Border Radii ────────────────────────────────────────────────────────────

export const radius = {
  /** Cards and containers */
  card: 24,
  /** Pills and buttons */
  pill: 24,
  /** Full circle / avatar */
  full: 999,
} as const;

export type RadiusToken = keyof typeof radius;

// ─── Aggregated Theme ────────────────────────────────────────────────────────

export const HerTheme = {
  dark: false,
  colors: herColors,
  typography,
  spacing,
  radius,
} as const;

export const PartnerTheme = { ...HerTheme, dark: false, colors: partnerColors };
export type Theme = typeof HerTheme | typeof PartnerTheme;

export function useTheme(): Theme {
  const role = useCycleStore((state) => state.userRole);
  return role === 'partner' ? PartnerTheme : HerTheme;
}

export function useThemeStyles<T>(factory: (palette: Palette) => T) {
  const { colors } = useTheme();
  const styles = useMemo(() => factory(colors), [colors, factory]);
  return { colors, styles };
}

// Static exports are for non-reactive consumers only. Components use the hooks.
export const colors = herColors;
export const theme = HerTheme;

export const elevation = {
  card: { shadowColor: '#152B43', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.045, shadowRadius: 14, elevation: 2 },
  floating: { shadowColor: '#152B43', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 5 },
};

export default theme;
