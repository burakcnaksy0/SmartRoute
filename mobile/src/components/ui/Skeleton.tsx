/**
 * SmartRoute Skeleton Loading Component
 * Shimmer animation for content placeholders
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Rounded } from '@/constants/theme';

const C = Colors.light;

interface SkeletonProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = Rounded.sm,
  style,
}: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

/**
 * Pre-built skeleton layouts for common screens
 */
export function CardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.cardSkeleton, style]}>
      <View style={styles.cardSkeletonHeader}>
        <Skeleton width={44} height={44} radius={Rounded.md} />
        <View style={styles.cardSkeletonText}>
          <Skeleton height={16} width="60%" />
          <Skeleton height={12} width="40%" />
        </View>
      </View>
      <Skeleton height={12} />
      <Skeleton height={12} width="80%" />
    </View>
  );
}

export function ListItemSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.listItem, style]}>
      <Skeleton width={40} height={40} radius={Rounded.full} />
      <View style={styles.listItemContent}>
        <Skeleton height={14} width="55%" />
        <Skeleton height={11} width="35%" />
      </View>
    </View>
  );
}

export function JourneyCardSkeleton() {
  return (
    <View style={styles.journeySkeleton}>
      <Skeleton height={22} width="50%" />
      <Skeleton height={14} width="70%" />
      <View style={styles.journeySkeletonMetrics}>
        <Skeleton height={18} width="28%" />
        <Skeleton height={18} width="28%" />
        <Skeleton height={18} width="28%" />
      </View>
      <Skeleton height={48} radius={Rounded.xl} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: C.surfaceDim,
  },
  cardSkeleton: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: 16,
    gap: 10,
  },
  cardSkeletonHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  cardSkeletonText: {
    flex: 1,
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  listItemContent: {
    flex: 1,
    gap: 6,
  },
  journeySkeleton: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: 16,
    gap: 10,
  },
  journeySkeletonMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
});
