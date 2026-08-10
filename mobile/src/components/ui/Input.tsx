/**
 * SmartRoute TextInput Component
 * Features: label, focus animation, error/success states
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TextInputProps,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Rounded, Spacing, Typography } from '@/constants/theme';

const C = Colors.light;

interface InputProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconRight?: keyof typeof MaterialIcons.glyphMap;
  onIconRightPress?: () => void;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  hint,
  icon,
  iconRight,
  onIconRightPress,
  containerStyle,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
    props.onFocus?.(null as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    props.onBlur?.(null as any);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? C.error : C.outlineVariant,
      error ? C.error : C.primary,
    ],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View
        style={[
          styles.inputWrapper,
          { borderColor },
          isFocused && styles.inputWrapperFocused,
        ]}
      >
        {icon && (
          <MaterialIcons
            name={icon}
            size={18}
            color={isFocused ? C.primary : C.outline}
            style={styles.iconLeft}
          />
        )}
        <RNTextInput
          style={[styles.input, icon && styles.inputWithIcon]}
          placeholderTextColor={C.outline}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {iconRight && (
          <TouchableOpacity onPress={onIconRightPress} style={styles.iconRightBtn}>
            <MaterialIcons
              name={iconRight}
              size={18}
              color={C.outline}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <View style={styles.errorRow}>
          <MaterialIcons name="error-outline" size={12} color={C.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {hint && !error && (
        <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    ...Typography.label,
    color: C.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderRadius: Rounded.lg,
    paddingHorizontal: Spacing.base,
    minHeight: 50,
  },
  inputWrapperFocused: {
    backgroundColor: C.surfaceContainerLowest,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: C.text,
    paddingVertical: 12,
    fontWeight: '400',
  },
  inputWithIcon: {
    marginLeft: 8,
  },
  iconLeft: {
    flexShrink: 0,
  },
  iconRightBtn: {
    padding: 4,
    flexShrink: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    ...Typography.caption,
    color: C.error,
  },
  hint: {
    ...Typography.caption,
    color: C.outline,
  },
});
