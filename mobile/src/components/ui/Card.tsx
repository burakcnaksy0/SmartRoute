/**
 * SmartRoute Card Component
 * Variants: surface, elevated, tinted
 * Used for consistent card containers throughout the app
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  Text,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Rounded, Shadow, Spacing, Typography } from '@/constants/theme';

const C = Colors.light;

type CardVariant = 'surface' | 'elevated' | 'tinted' | 'outlined';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: CardVariant;
  style?: ViewStyle;
  padding?: number;
  radius?: number;
  disabled?: boolean;
}

const variantStyles: Record<CardVariant, ViewStyle> = {
  surface: {
    backgroundColor: C.surface,
    ...Shadow.sm,
  },
  elevated: {
    backgroundColor: C.surface,
    ...Shadow.md,
  },
  tinted: {
    backgroundColor: C.primaryFixed,
  },
  outlined: {
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.outlineVariant,
  },
};

export function Card({
  children,
  onPress,
  variant = 'surface',
  style,
  padding = Spacing.base,
  radius = Rounded.xl,
  disabled = false,
}: CardProps) {
  const containerStyle: ViewStyle[] = [
    styles.base,
    variantStyles[variant],
    { padding, borderRadius: radius },
    style ?? {},
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.82}
        style={containerStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

/**
 * Action Card — horizontal layout for navigation rows
 */
interface ActionCardProps {
  title: string;
  description?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  onPress?: () => void;
  primary?: boolean;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export function ActionCard({
  title,
  description,
  icon,
  iconColor,
  iconBg,
  onPress,
  primary = false,
  rightElement,
  style,
}: ActionCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, { toValue: 0.98, duration: 80, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  };

  const bg = primary ? C.primary : C.surface;
  const titleColor = primary ? '#FFFFFF' : C.text;
  const descColor = primary ? 'rgba(255,255,255,0.75)' : C.textSecondary;
  const resolvedIconBg = iconBg ?? (primary ? 'rgba(255,255,255,0.18)' : C.primaryFixed);
  const resolvedIconColor = iconColor ?? (primary ? '#FFFFFF' : C.primary);
  const arrowColor = primary ? 'rgba(255,255,255,0.8)' : C.outline;

  const cardStyle: ViewStyle[] = [
    styles.actionCard,
    { backgroundColor: bg },
    primary ? Shadow.primary : Shadow.sm,
    style ?? {},
  ];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[styles.iconBg, { backgroundColor: resolvedIconBg }]}>
          <MaterialIcons name={icon} size={22} color={resolvedIconColor} />
        </View>
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, { color: titleColor }]}>{title}</Text>
          {description && (
            <Text style={[styles.actionDesc, { color: descColor }]} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>
        {rightElement ?? (
          <MaterialIcons name="chevron-right" size={20} color={arrowColor} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    padding: Spacing.base,
    borderRadius: Rounded.xl,
    overflow: 'hidden',
  },
  iconBg: {
    width: 46,
    height: 46,
    borderRadius: Rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionContent: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    ...Typography.h4,
  },
  actionDesc: {
    ...Typography.bodySmall,
    lineHeight: 18,
  },
});
