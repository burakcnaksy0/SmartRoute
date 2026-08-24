import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Animated, Dimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Rounded, Shadow } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = Colors.light;
const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

interface JourneySideMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  onOpenFavorites: () => void;
}

export default function JourneySideMenu({ visible, onClose, onNavigate, onOpenFavorites }: JourneySideMenuProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // We need to render the modal slightly longer than `visible` to allow exit animations.
  const [renderModal, setRenderModal] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setRenderModal(true);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => setRenderModal(false));
    }
  }, [visible]);

  if (!renderModal) return null;

  return (
    <Modal visible={renderModal} transparent={true} animationType="none" onRequestClose={onClose} statusBarTranslucent={true}>
      <View style={styles.overlayContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>
        
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 0), paddingBottom: insets.bottom }]}>
            
            <View style={styles.header}>
              <View style={styles.logoBox}>
                <MaterialIcons name="route" size={28} color={C.primary} />
                <Text style={styles.logoText}>SmartRoute</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.menuItems}>
              <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); setTimeout(() => onNavigate('/(tabs)/journey/nlp-input'), 600); }}>
                <View style={[styles.iconBg, { backgroundColor: C.primaryFixed }]}>
                  <MaterialIcons name="auto-awesome" size={22} color={C.primary} />
                </View>
                <View style={styles.menuTexts}>
                  <Text style={styles.menuTitle}>AI Asistan</Text>
                  <Text style={styles.menuSub}>Yapay zeka ile rota planla</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={C.outline} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); setTimeout(() => onOpenFavorites(), 600); }}>
                <View style={[styles.iconBg, { backgroundColor: C.errorContainer }]}>
                  <MaterialIcons name="favorite" size={22} color={C.error} />
                </View>
                <View style={styles.menuTexts}>
                  <Text style={styles.menuTitle}>Favoriler</Text>
                  <Text style={styles.menuSub}>Kaydedilmiş konumlar</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={C.outline} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); setTimeout(() => onNavigate('/(tabs)/journey/preferences'), 600); }}>
                <View style={[styles.iconBg, { backgroundColor: C.secondaryContainer }]}>
                  <MaterialIcons name="tune" size={22} color={C.secondary} />
                </View>
                <View style={styles.menuTexts}>
                  <Text style={styles.menuTitle}>Rota Tercihleri</Text>
                  <Text style={styles.menuSub}>Otoyol, feribot, vb. ayarlar</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={C.outline} />
              </TouchableOpacity>
            </View>
            
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawer: { width: DRAWER_WIDTH, height: '100%', backgroundColor: C.surface, ...Shadow.xl, borderTopRightRadius: Rounded.xl, borderBottomRightRadius: Rounded.xl },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, paddingTop: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.outlineVariant },
  logoBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logoText: { ...Typography.h3, color: C.text, fontWeight: '700' },
  closeBtn: { padding: Spacing.xs },
  menuItems: { padding: Spacing.md, gap: Spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, padding: Spacing.md, borderRadius: Rounded.lg, gap: Spacing.md, borderWidth: 1, borderColor: C.outlineVariant },
  iconBg: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  menuTexts: { flex: 1 },
  menuTitle: { ...Typography.bodyMedium, fontWeight: '600', color: C.text },
  menuSub: { ...Typography.caption, color: C.textSecondary, marginTop: 2 }
});
