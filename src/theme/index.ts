/**
 * Sway Design System
 * Premium, empathetic cycle-sync app for couples.
 *
 * Defines the core visual tokens: colors, typography, spacing, and radii.
 */

// ─── Colors ──────────────────────────────────────────────────────────────────

export const colors = {
  /** Deep, warm luxury obsidian */
  backgroundPrimary: '#0F0E17',
  /** Elevated dark card surface */
  backgroundSurface: '#1A1926',

  /** Warm blush rose — "Her" accent */
  accentRose: '#F28B82',
  /** Harmony / Warning amber */
  accentAmber: '#FBC02D',
  /** Calm / Recovery sage */
  accentSage: '#81C784',

  /** Primary text (near-white) */
  textPrimary: '#FFFFFE',
  /** Secondary text */
  textSecondary: '#A7A9BE',
  /** Muted / disabled text */
  textMuted: '#5F6175',

  /** Border and divider lines */
  border: '#2E2D3D',
} as const;

export type ColorToken = keyof typeof colors;

// ─── Typography ──────────────────────────────────────────────────────────────

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
  },
  tag: {
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
  card: 12,
  /** Pills and buttons */
  pill: 24,
  /** Full circle / avatar */
  full: 999,
} as const;

export type RadiusToken = keyof typeof radius;

// ─── Aggregated Theme ────────────────────────────────────────────────────────

export const theme = {
  colors,
  typography,
  spacing,
  radius,
} as const;

export type Theme = typeof theme;

export default theme;
