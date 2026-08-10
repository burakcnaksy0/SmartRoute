/**
 * SmartRoute Design System — v2.0
 * Light-first, premium mobile SaaS aesthetic.
 * All screens and components derive from these tokens exclusively.
 */

import { Platform } from 'react-native';

// ─── Color Tokens ──────────────────────────────────────────────────────────────
// Light theme is the only theme. "dark" key is kept for API compatibility but
// maps identically to prevent accidental dark-mode bleed.

const lightTokens = {
  // Backgrounds
  background: '#F5F6FA',          // Very light cool-gray canvas
  surface: '#FFFFFF',             // Pure white cards & panels
  surfaceElevated: '#FFFFFF',     // White with shadow
  surfaceLow: '#EEF0F7',         // Soft inset areas
  surfaceDim: '#E2E6F3',         // Dividers, skeletons
  surfaceBright: '#F9FAFF',      // Hero areas, highlighted surfaces

  // Surface containers (Material You-style)
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#EEF0F7',
  surfaceContainer: '#E5E9F4',
  surfaceContainerHigh: '#D8DDEF',
  surfaceContainerHighest: '#CBD1EA',

  // Text
  text: '#0F1523',               // Primary text — near-black with blue tint
  textSecondary: '#4A5170',      // Secondary — muted indigo-gray
  onSurface: '#0F1523',
  onSurfaceVariant: '#4A5170',

  // Inverse
  inverseSurface: '#1C2340',
  inverseOnSurface: '#EEF0F7',

  // Borders & outlines
  outline: '#7B82A6',            // Muted border
  outlineVariant: '#C5CADF',     // Very subtle divider

  // ── Primary Accent: Deep Royal Indigo ──────────────────────
  primary: '#3B35D0',            // Strong, premium indigo
  onPrimary: '#FFFFFF',
  primaryContainer: '#4F48DB',   // Slightly lighter for buttons
  onPrimaryContainer: '#D4D2FF',
  primaryFixed: '#ECEAFF',       // Very light tint for icon backgrounds
  primaryFixedDim: '#C8C4FF',
  inversePrimary: '#C8C4FF',
  surfaceTint: '#3B35D0',

  // ── Secondary Accent: Emerald Green ─────────────────────────
  secondary: '#059669',          // Vibrant emerald
  onSecondary: '#FFFFFF',
  secondaryContainer: '#D1FAE5',
  onSecondaryContainer: '#065F46',
  secondaryFixed: '#A7F3D0',
  secondaryFixedDim: '#6EE7B7',

  // ── Tertiary: Warm Amber ─────────────────────────────────────
  tertiary: '#B45309',           // Warm amber
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FEF3C7',
  onTertiaryContainer: '#78350F',
  tertiaryFixed: '#FDE68A',
  tertiaryFixedDim: '#FCD34D',

  // ── Status Colors ────────────────────────────────────────────
  error: '#C0392B',
  onError: '#FFFFFF',
  errorContainer: '#FDECEA',
  onErrorContainer: '#7F1D1D',

  success: '#059669',
  onSuccess: '#FFFFFF',
  successContainer: '#D1FAE5',

  warning: '#D97706',
  onWarning: '#FFFFFF',
  warningContainer: '#FEF3C7',

  info: '#2563EB',
  onInfo: '#FFFFFF',
  infoContainer: '#DBEAFE',

  // ── Compatibility aliases ─────────────────────────────────────
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#ECEAFF',
  surfaceLow2: '#EEF0F7',       // alias for surfaceLow
} as const;

export const Colors = {
  light: lightTokens,
  dark: lightTokens,   // Strict light-only app — no dark mode
} as const;

export type ThemeColor = keyof typeof lightTokens;

// ─── Typography Scale ──────────────────────────────────────────────────────────
// Consistent type hierarchy. Size in sp, weight as string for RN compatibility.

export const Typography = {
  display: {
    fontSize: 40,
    fontWeight: '800' as const,
    lineHeight: 46,
    letterSpacing: -1.2,
  },
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  h4: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  labelCaps: {
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 18,
    letterSpacing: 0,
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
// 4/8-based scale. Always use these — no magic numbers.

export const Spacing = {
  // Core scale
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
  '5xl': 64,

  // Semantic aliases
  gutter: 20,         // Page horizontal padding
  marginMain: 20,     // Legacy alias
  stackSm: 8,
  stackMd: 16,
  stackLg: 24,
  touchTargetMin: 44, // Minimum accessible touch target
  half: 4,            // Legacy alias
  one: 8,
  two: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// ─── Border Radius ─────────────────────────────────────────────────────────────

export const Rounded = {
  xs: 4,
  sm: 6,
  default: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
} as const;

// ─── Shadows ───────────────────────────────────────────────────────────────────
// iOS and Android consistent shadows

export const Shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#0F1523',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F1523',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0F1523',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  xl: {
    shadowColor: '#0F1523',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },
  primary: {
    shadowColor: '#3B35D0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ─── Animation Durations ───────────────────────────────────────────────────────

export const Duration = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
} as const;

// ─── Platform-Specific ────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Courier New',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// Tab bar heights
export const TabBarHeight = Platform.OS === 'ios' ? 88 : 72;
export const TabBarContentHeight = Platform.OS === 'ios' ? 60 : 56;
