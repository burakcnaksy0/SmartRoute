/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * Theme constants based on the Intelligent Mobility System Design Spec.
 */

import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111C2D',
    textSecondary: '#464554',
    background: '#F9F9FF',
    surface: '#FFFFFF',
    surfaceDim: '#CFDAF2',
    surfaceBright: '#F9F9FF',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F0F3FF',
    surfaceContainer: '#E7EEFF',
    surfaceContainerHigh: '#DEE8FF',
    surfaceContainerHighest: '#D8E3FB',
    onSurface: '#111C2D',
    onSurfaceVariant: '#464554',
    inverseSurface: '#263143',
    inverseOnSurface: '#ECF1FF',
    outline: '#777586',
    outlineVariant: '#C7C4D7',
    surfaceTint: '#5148D7',
    primary: '#2A14B4',
    onPrimary: '#FFFFFF',
    primaryContainer: '#4338CA',
    onPrimaryContainer: '#C1BEFF',
    inversePrimary: '#C3C0FF',
    secondary: '#006C49',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#6CF8BB',
    onSecondaryContainer: '#00714D',
    tertiary: '#553300',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#744800',
    onTertiaryContainer: '#FFB759',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',
    primaryFixed: '#E3DFFF',
    primaryFixedDim: '#C3C0FF',
    onPrimaryFixed: '#100069',
    onPrimaryFixedVariant: '#372ABF',
    secondaryFixed: '#6FFBBE',
    secondaryFixedDim: '#4EDEA3',
    onSecondaryFixed: '#002113',
    onSecondaryFixedVariant: '#005236',
    tertiaryFixed: '#FFDDB8',
    tertiaryFixedDim: '#FFB95F',
    onTertiaryFixed: '#2A1700',
    onTertiaryFixedVariant: '#653E00',
    // Compatibility names
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7EEFF',
    surfaceLow: '#F0F3FF',
  },
  dark: {
    // Both map to the iOS Clean White theme since it is our primary design target
    text: '#111C2D',
    textSecondary: '#464554',
    background: '#F9F9FF',
    surface: '#FFFFFF',
    surfaceDim: '#CFDAF2',
    surfaceBright: '#F9F9FF',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F0F3FF',
    surfaceContainer: '#E7EEFF',
    surfaceContainerHigh: '#DEE8FF',
    surfaceContainerHighest: '#D8E3FB',
    onSurface: '#111C2D',
    onSurfaceVariant: '#464554',
    inverseSurface: '#263143',
    inverseOnSurface: '#ECF1FF',
    outline: '#777586',
    outlineVariant: '#C7C4D7',
    surfaceTint: '#5148D7',
    primary: '#2A14B4',
    onPrimary: '#FFFFFF',
    primaryContainer: '#4338CA',
    onPrimaryContainer: '#C1BEFF',
    inversePrimary: '#C3C0FF',
    secondary: '#006C49',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#6CF8BB',
    onSecondaryContainer: '#00714D',
    tertiary: '#553300',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#744800',
    onTertiaryContainer: '#FFB759',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',
    primaryFixed: '#E3DFFF',
    primaryFixedDim: '#C3C0FF',
    onPrimaryFixed: '#100069',
    onPrimaryFixedVariant: '#372ABF',
    secondaryFixed: '#6FFBBE',
    secondaryFixedDim: '#4EDEA3',
    onSecondaryFixed: '#002113',
    onSecondaryFixedVariant: '#005236',
    tertiaryFixed: '#FFDDB8',
    tertiaryFixedDim: '#FFB95F',
    onTertiaryFixed: '#2A1700',
    onTertiaryFixedVariant: '#653E00',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7EEFF',
    surfaceLow: '#F0F3FF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

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

export const Spacing = {
  marginMain: 20,
  gutter: 16,
  stackSm: 8,
  stackMd: 16,
  stackLg: 24,
  touchTargetMin: 44,
  // Compatibility sizes
  half: 4,
  one: 8,
  two: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Rounded = {
  sm: 4,
  default: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

