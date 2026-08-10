/**
 * SmartRoute Screen Header Component
 * Reusable navigation header with back button, title, and optional right action
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useRouter } from 'expo-router';

const C = Colors.light;

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  rightComponent?: React.ReactNode;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
  style?: ViewStyle;
  transparent?: boolean;
}

export function ScreenHeader({
  title,
  onBack,
  showBack = true,
  rightComponent,
  rightIcon,
  onRightPress,
  style,
  transparent = false,
}: ScreenHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.header,
        transparent ? styles.transparent : styles.solid,
        style,
      ]}
    >
      {showBack ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <MaterialIcons name="chevron-left" size={26} color={C.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightArea}>
        {rightComponent}
        {rightIcon && !rightComponent && (
          <TouchableOpacity
            style={styles.rightButton}
            onPress={onRightPress}
            accessibilityRole="button"
          >
            <MaterialIcons name={rightIcon} size={22} color={C.text} />
          </TouchableOpacity>
        )}
        {!rightIcon && !rightComponent && <View style={styles.rightButton} />}
      </View>
    </View>
  );
}

/**
 * Tab Header — used on main tab screens (no back button, larger title style)
 */
interface TabHeaderProps {
  title: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
  style?: ViewStyle;
}

export function TabHeader({ title, subtitle, rightComponent, style }: TabHeaderProps) {
  return (
    <View style={[styles.tabHeader, style]}>
      <View style={styles.tabHeaderContent}>
        <Text style={styles.tabTitle}>{title}</Text>
        {subtitle && <Text style={styles.tabSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent && (
        <View style={styles.tabHeaderRight}>
          {rightComponent}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  solid: {
    backgroundColor: C.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  title: {
    ...Typography.h4,
    color: C.text,
    flex: 1,
    textAlign: 'center',
  },
  rightArea: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  rightButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tab header
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
  },
  tabHeaderContent: {
    flex: 1,
    gap: 2,
  },
  tabTitle: {
    ...Typography.h1,
    color: C.text,
  },
  tabSubtitle: {
    ...Typography.bodySmall,
    color: C.textSecondary,
  },
  tabHeaderRight: {
    alignItems: 'flex-end',
  },
});
