import React, { useCallback } from 'react';
import { View, Text, StyleSheet, PanResponder, GestureResponderEvent } from 'react-native';

interface SocSliderProps {
  value: number; // 0–100
  onChange: (value: number) => void;
  label?: string;
}

/**
 * SocSlider — UX Spec §6.14
 * Allows the user to set their current State of Charge (SoC) before a journey.
 * Renders a colour-coded track (green → amber → red) that shifts as the value decreases.
 */
const SocSlider: React.FC<SocSliderProps> = ({ value, onChange, label }) => {
  const TRACK_WIDTH = 280;
  const THUMB_SIZE = 28;

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  const trackColor = value >= 60 ? '#34D399' : value >= 30 ? '#FBBF24' : '#F87171';

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_: GestureResponderEvent, gestureState) => {
      // gestureState.moveX is the absolute x on screen; dx from start instead
      const rawPercent = ((gestureState.moveX - THUMB_SIZE / 2) / TRACK_WIDTH) * 100;
      onChange(clamp(rawPercent));
    },
    onPanResponderGrant: (_: GestureResponderEvent, gestureState) => {
      const rawPercent = ((gestureState.x0 - THUMB_SIZE / 2) / TRACK_WIDTH) * 100;
      onChange(clamp(rawPercent));
    },
  });

  const thumbLeft = (value / 100) * (TRACK_WIDTH - THUMB_SIZE);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label ?? '🔋 Mevcut Batarya Seviyesi'}</Text>
        <Text style={[styles.valueText, { color: trackColor }]}>{value}%</Text>
      </View>

      <View style={styles.trackContainer} {...panResponder.panHandlers}>
        {/* Background track */}
        <View style={styles.trackBackground} />
        {/* Filled portion */}
        <View
          style={[
            styles.trackFill,
            { width: thumbLeft + THUMB_SIZE / 2, backgroundColor: trackColor },
          ]}
        />
        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            { left: thumbLeft, borderColor: trackColor },
          ]}
        >
          <View style={[styles.thumbDot, { backgroundColor: trackColor }]} />
        </View>
      </View>

      {/* Labels */}
      <View style={styles.labelRow}>
        <Text style={styles.minLabel}>0%</Text>
        <Text style={styles.midLabel}>50%</Text>
        <Text style={styles.maxLabel}>100%</Text>
      </View>

      {/* Warning */}
      {value < 20 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Düşük batarya — yolculuk sırasında şarj molası gerekebilir.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '700',
  },
  trackContainer: {
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    width: 280,
    alignSelf: 'center',
  },
  trackBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  minLabel: { fontSize: 11, color: '#9CA3AF' },
  midLabel: { fontSize: 11, color: '#9CA3AF' },
  maxLabel: { fontSize: 11, color: '#9CA3AF' },
  warningBox: {
    marginTop: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
});

export default SocSlider;
