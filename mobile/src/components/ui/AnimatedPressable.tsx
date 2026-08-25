import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children: React.ReactNode;
}

/**
 * Shared tactile-feedback wrapper: scales down on press with a spring
 * and springs back on release. Used for cards, chips, checkboxes, and
 * links across the app so every touch target feels consistently alive.
 */
export function AnimatedPressable({
  style,
  scaleTo = 0.96,
  children,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
    onPressOut?.(e);
  };

  return (
    <Pressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.6 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}