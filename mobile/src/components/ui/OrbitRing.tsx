import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, ViewStyle, StyleProp } from 'react-native';

interface OrbitRingProps {
  size?: number;
  thickness?: number;
  primaryColor: string;
  secondaryColor: string;
  duration?: number;
  reverseDuration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Signature decorative motif: a dual-tone orbiting ring used around logo
 * marks across Welcome, Login, and Register to reinforce the app's
 * "smart routing" identity. Purely ambient — not a loading indicator.
 */
export function OrbitRing({
  size = 100,
  thickness = 3,
  primaryColor,
  secondaryColor,
  duration = 5200,
  reverseDuration = 7600,
  style,
}: OrbitRingProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const spinReverse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const loop2 = Animated.loop(
      Animated.timing(spinReverse, {
        toValue: 1,
        duration: reverseDuration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop1.start();
    loop2.start();
    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [duration, reverseDuration]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotateReverse = spinReverse.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  const innerSize = size - thickness * 6;

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: thickness,
            borderColor: 'transparent',
            borderTopColor: primaryColor,
            borderRightColor: primaryColor,
            opacity: 0.55,
            transform: [{ rotate }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            borderWidth: thickness,
            borderColor: 'transparent',
            borderBottomColor: secondaryColor,
            borderLeftColor: secondaryColor,
            opacity: 0.45,
            transform: [{ rotate: rotateReverse }],
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
});