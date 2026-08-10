import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Rounded } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ExplainabilityBadgeProps {
  explanationText: string;
}

export default function ExplainabilityBadge({ explanationText }: ExplainabilityBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = Colors.light;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  if (!explanationText) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceContainerLow }]}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleExpand} 
        activeOpacity={0.7}
      >
        <View style={styles.titleRow}>
          <MaterialIcons name="info-outline" size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.primary }]}>Neden bu plan?</Text>
        </View>
        <MaterialIcons 
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
          size={18} 
          color={colors.primary} 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          <Text style={[styles.text, { color: colors.onSurfaceVariant }]}>
            {explanationText}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Rounded.lg,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 2,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
  },
});
