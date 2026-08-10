/**
 * SmartRoute Empty State & Error State Components
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Rounded, Shadow, Spacing, Typography } from '@/constants/theme';
import { Button } from './Button';

const C = Colors.light;

interface EmptyStateProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  iconColor?: string;
  iconBg?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
  iconColor = C.primary,
  iconBg = C.primaryFixed,
}: EmptyStateProps) {
  return (
    <View style={[styles.emptyContainer, style]}>
      <View style={[styles.emptyIconBg, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon} size={36} color={iconColor} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={{ marginTop: Spacing.sm, minWidth: 180 }}
        />
      )}
    </View>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Bir şeyler yanlış gitti',
  message,
  onRetry,
  retryLabel = 'Tekrar Dene',
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.errorContainer, style]}>
      <View style={[styles.errorIconBg]}>
        <MaterialIcons name="error-outline" size={36} color={C.error} />
      </View>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorDescription}>{message}</Text>
      {onRetry && (
        <Button
          label={retryLabel}
          onPress={onRetry}
          variant="outline"
          size="md"
          style={{ marginTop: Spacing.sm, minWidth: 160 }}
        />
      )}
    </View>
  );
}

/**
 * Inline error banner — for form errors and non-blocking errors
 */
interface ErrorBannerProps {
  message: string;
  style?: ViewStyle;
}

export function ErrorBanner({ message, style }: ErrorBannerProps) {
  return (
    <View style={[styles.errorBanner, style]}>
      <MaterialIcons name="info" size={16} color={C.error} />
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

/**
 * Success banner
 */
interface SuccessBannerProps {
  message: string;
  style?: ViewStyle;
}

export function SuccessBanner({ message, style }: SuccessBannerProps) {
  return (
    <View style={[styles.successBanner, style]}>
      <MaterialIcons name="check-circle" size={16} color={C.secondary} />
      <Text style={styles.successBannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.sm,
    paddingVertical: Spacing['3xl'],
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: Rounded['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.h3,
    color: C.text,
    textAlign: 'center',
  },
  emptyDescription: {
    ...Typography.body,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.sm,
    paddingVertical: Spacing['3xl'],
  },
  errorIconBg: {
    width: 80,
    height: 80,
    borderRadius: Rounded['2xl'],
    backgroundColor: C.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  errorTitle: {
    ...Typography.h3,
    color: C.text,
    textAlign: 'center',
  },
  errorDescription: {
    ...Typography.body,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: C.errorContainer,
    borderRadius: Rounded.lg,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: C.error,
  },
  errorBannerText: {
    ...Typography.bodySmall,
    color: C.onErrorContainer,
    flex: 1,
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: C.successContainer,
    borderRadius: Rounded.lg,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: C.secondary,
  },
  successBannerText: {
    ...Typography.bodySmall,
    color: C.onSecondaryContainer,
    flex: 1,
    lineHeight: 18,
  },
});
