import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded, Typography, Shadow } from '@/constants/theme';
import { useSavedLocationStore } from '@/store/savedLocationStore';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = Colors.light;

interface FavoritesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number, address: string, placeName: string, asType: 'start' | 'stop' | 'destination') => void;
}

export default function FavoritesModal({ visible, onClose, onSelect }: FavoritesModalProps) {
  const { locations, isLoading, deleteLocation, fetchLocations } = useSavedLocationStore();

  React.useEffect(() => {
    if (visible) {
      fetchLocations();
    }
  }, [visible]);

  const handleSelect = (loc: any) => {
    Alert.alert(
      'Nereye Ekleyelim?',
      `${loc.label} konumunu nereye eklemek istersiniz?`,
      [
        { text: 'Başlangıç Olarak', onPress: () => { onSelect(loc.lat, loc.lng, loc.address, loc.label, 'start'); onClose(); } },
        { text: 'Durak Olarak', onPress: () => { onSelect(loc.lat, loc.lng, loc.address, loc.label, 'stop'); onClose(); } },
        { text: 'Hedef Olarak', onPress: () => { onSelect(loc.lat, loc.lng, loc.address, loc.label, 'destination'); onClose(); } },
        { text: 'İptal', style: 'cancel' }
      ]
    );
  };

  const handleDelete = (id: string, label: string) => {
    Alert.alert('Emin misiniz?', `${label} favorilerden silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteLocation(id) }
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Favorileriniz</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialIcons name="close" size={24} color={C.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {isLoading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: Spacing.xl }} />
          ) : locations.length === 0 ? (
            <Text style={styles.emptyText}>Henüz kaydedilmiş bir konumunuz bulunmuyor.</Text>
          ) : (
            locations.map((loc, idx) => (
              <TouchableOpacity key={idx} style={styles.card} onPress={() => handleSelect(loc)}>
                <View style={styles.iconBg}>
                  <MaterialIcons name={loc.category === 'favorite' ? 'favorite' : 'bookmark'} size={24} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{loc.label}</Text>
                  <Text style={styles.address}>{loc.address}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(loc.id!, loc.label)} hitSlop={{top: 10, bottom:10, left:10, right:10}}>
                  <MaterialIcons name="delete-outline" size={24} color={C.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.gutter, borderBottomWidth: 1, borderBottomColor: C.outlineVariant },
  title: { ...Typography.h3, color: C.text },
  closeBtn: { padding: Spacing.xs },
  scroll: { padding: Spacing.gutter, gap: Spacing.md },
  emptyText: { textAlign: 'center', color: C.textSecondary, marginTop: Spacing.xl },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, padding: Spacing.md, borderRadius: Rounded.xl, gap: Spacing.md, borderWidth: 1, borderColor: C.outlineVariant, ...Shadow.sm },
  iconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  label: { ...Typography.bodyMedium, fontWeight: '600', color: C.text },
  address: { ...Typography.caption, color: C.textSecondary, marginTop: 2 }
});
