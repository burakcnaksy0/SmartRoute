/**
 * SmartRoute Badge Component
 * For labels, status indicators, counts, and tags
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Rounded, Typography } from '@/constants/theme';

const C = Colors.light;

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

const badgeColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary:   { bg: C.primaryFixed,    text: C.primary },
  secondary: { bg: C.secondaryContainer, text: C.onSecondaryContainer },
  success:   { bg: C.secondaryContainer, text: C.secondary },
  warning:   { bg: C.tertiaryContainer,  text: C.tertiary },
  error:     { bg: C.errorContainer,  text: C.error },
  neutral:   { bg: C.surfaceContainer, text: C.textSecondary },
  info:      { bg: C.infoContainer,   text: C.info },
};

export function Badge({ label, variant = 'neutral', style, size = 'md' }: BadgeProps) {
  const colors = badgeColors[variant];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        size === 'sm' && styles.badgeSm,
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: colors.text },
          size === 'sm' && styles.badgeTextSm,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Section Header — used between list groups
 */
interface SectionHeaderProps {
  title: string;
  trailing?: React.ReactNode;
  style?: ViewStyle;
}

export function SectionHeader({ title, trailing, style }: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Rounded.full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  badgeTextSm: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.outline,
  },
});
