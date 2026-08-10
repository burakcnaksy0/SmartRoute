/**
 * SmartRoute Button Component
 * Variants: primary, secondary, ghost, danger, outline
 * States: default, loading, disabled
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Rounded, Shadow, Spacing, Typography } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress?: () => void;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconRight?: keyof typeof MaterialIcons.glyphMap;
  fullWidth?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

const C = Colors.light;

const variantStyles: Record<ButtonVariant, { container: ViewStyle; label: TextStyle; shadow?: ViewStyle }> = {
  primary: {
    container: { backgroundColor: C.primary, ...Shadow.primary },
    label: { color: C.onPrimary },
  },
  secondary: {
    container: { backgroundColor: C.surfaceContainer },
    label: { color: C.text },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    label: { color: C.primary },
  },
  danger: {
    container: { backgroundColor: C.error, ...Shadow.md },
    label: { color: C.onError },
  },
  outline: {
    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.outlineVariant },
    label: { color: C.text },
  },
};

const sizeStyles: Record<ButtonSize, { height: number; paddingH: number; radius: number; fontSize: number }> = {
  sm: { height: 40, paddingH: 16, radius: Rounded.md, fontSize: 14 },
  md: { height: 52, paddingH: 20, radius: Rounded.lg, fontSize: 16 },
  lg: { height: 58, paddingH: 24, radius: Rounded.xl, fontSize: 16 },
};

export function Button({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  style,
  labelStyle,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];

  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const iconColor = vStyle.label.color as string;
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[
          styles.base,
          vStyle.container,
          {
            height: sStyle.height,
            paddingHorizontal: sStyle.paddingH,
            borderRadius: sStyle.radius,
          },
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={iconColor} size="small" />
        ) : (
          <>
            {icon && (
              <MaterialIcons name={icon} size={iconSize} color={iconColor} style={styles.iconLeft} />
            )}
            <Text
              style={[
                styles.label,
                vStyle.label,
                { fontSize: sStyle.fontSize },
                isDisabled && styles.disabledLabel,
                labelStyle,
              ]}
            >
              {label}
            </Text>
            {iconRight && (
              <MaterialIcons name={iconRight} size={iconSize} color={iconColor} style={styles.iconRight} />
            )}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  disabled: {
    opacity: 0.45,
  },
  disabledLabel: {},
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
});
