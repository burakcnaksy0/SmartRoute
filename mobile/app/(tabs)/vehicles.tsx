import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded, Shadow, Typography, TabBarHeight } from '@/constants/theme';
import { EmptyState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/Badge';
import { useVehicleStore } from '@/store/vehicleStore';
import { Vehicle } from '@/api/vehicle';

const C = Colors.light;

const fuelTypeOptions = [
  { value: 'gasoline', label: 'Benzin', icon: 'local-gas-station' },
  { value: 'diesel', label: 'Dizel', icon: 'local-gas-station' },
  { value: 'lpg', label: 'LPG', icon: 'local-gas-station' },
  { value: 'hybrid', label: 'Hibrit', icon: 'ev-station' },
  { value: 'plugin_hybrid', label: 'PHEV (Kablolu Hibrit)', icon: 'ev-station' },
  { value: 'electric', label: 'Elektrikli', icon: 'electric-car' },
];

export default function VehiclesScreen() {
  const {
    vehicles,
    isLoading,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  } = useVehicleStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Form states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [nickname, setNickname] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [fuelType, setFuelType] = useState('gasoline');
  const [usableRangeKm, setUsableRangeKm] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchVehicles();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const openAddModal = () => {
    setEditingVehicle(null);
    setNickname('');
    setBrand('');
    setModel('');
    setModelYear(new Date().getFullYear().toString());
    setFuelType('gasoline');
    setUsableRangeKm('400');
    setIsDefault(vehicles.length === 0);
    setFormError('');
    setModalVisible(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setNickname(vehicle.nickname);
    setBrand(vehicle.brand);
    setModel(vehicle.model);
    setModelYear(vehicle.modelYear.toString());
    setFuelType(vehicle.fuelType);
    setUsableRangeKm(vehicle.usableRangeKm?.toString() || '400');
    setIsDefault(vehicle.isDefault);
    setFormError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!nickname.trim() || !brand.trim() || !model.trim() || !modelYear.trim() || !usableRangeKm.trim()) {
      setFormError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    const yearNum = parseInt(modelYear);
    const rangeNum = parseFloat(usableRangeKm);

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 2) {
      setFormError('Lütfen geçerli bir model yılı girin.');
      return;
    }

    if (isNaN(rangeNum) || rangeNum <= 0) {
      setFormError('Lütfen geçerli bir menzil girin.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    const payload = {
      nickname: nickname.trim(),
      brand: brand.trim(),
      model: model.trim(),
      modelYear: yearNum,
      fuelType,
      usableRangeKm: rangeNum,
      isDefault,
      // Default estimation metrics based on fuel type
      fuelConsumptionLPer100km: fuelType === 'electric' ? undefined : 7.0,
      energyConsumptionKwhPer100km: fuelType === 'electric' || fuelType === 'plugin_hybrid' ? 18.0 : undefined,
    };

    try {
      let result;
      if (editingVehicle) {
        result = await updateVehicle(editingVehicle.id, payload);
      } else {
        result = await createVehicle(payload);
      }

      if (result) {
        setModalVisible(false);
      } else {
        setFormError('Sunucu hatası. Araç kaydedilemedi.');
      }
    } catch (e: any) {
      setFormError(e.message || 'Bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingVehicle) return;

    Alert.alert(
      'Aracı Sil',
      'Bu aracı silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            const success = await deleteVehicle(editingVehicle.id);
            setIsSaving(false);
            if (success) {
              setModalVisible(false);
            } else {
              Alert.alert('Hata', 'Araç silinemedi.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Araçlar</Text>
          <Text style={styles.headerSub}>Garajınızı ve filonuzu yönetin</Text>
        </View>
        <Button
          label="Ekle"
          variant="secondary"
          size="sm"
          icon="add"
          onPress={openAddModal}
        />
      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {isLoading && vehicles.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon="directions-car"
            title="Garajınız Boş"
            description="Seyahatlerinizin maliyet ve tüketim hesaplamaları için ilk aracınızı ekleyin."
            actionLabel="Araç Ekle"
            onAction={openAddModal}
            style={{ flex: 1 }}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <SectionHeader title="Araçlarınız" />

            {vehicles.map((vehicle, idx) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} index={idx} onEdit={openEditModal} />
            ))}

            {/* Add vehicle CTA */}
            <TouchableOpacity style={styles.addCard} activeOpacity={0.7} onPress={openAddModal}>
              <View style={styles.addCardInner}>
                <MaterialIcons name="add-circle-outline" size={28} color={C.outline} />
                <Text style={styles.addCardText}>Yeni Araç Ekle</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        )}
      </Animated.View>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={24} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingVehicle ? 'Aracı Düzenle' : 'Yeni Araç Ekle'}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {formError ? (
                <View style={styles.formErrorBox}>
                  <MaterialIcons name="error" size={18} color={C.error} />
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Takma Ad *</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: Benim Arabam, Şirket Arabası"
                placeholderTextColor={C.outline}
                value={nickname}
                onChangeText={setNickname}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Text style={styles.fieldLabel}>Marka *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: Tesla, BMW"
                    placeholderTextColor={C.outline}
                    value={brand}
                    onChangeText={setBrand}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Model *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: Model Y, X5"
                    placeholderTextColor={C.outline}
                    value={model}
                    onChangeText={setModel}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Text style={styles.fieldLabel}>Model Yılı *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 2024"
                    placeholderTextColor={C.outline}
                    keyboardType="number-pad"
                    value={modelYear}
                    onChangeText={setModelYear}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Menzil (km) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 450"
                    placeholderTextColor={C.outline}
                    keyboardType="number-pad"
                    value={usableRangeKm}
                    onChangeText={setUsableRangeKm}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Yakıt Türü</Text>
              <View style={styles.fuelOptionsGrid}>
                {fuelTypeOptions.map((opt) => {
                  const isSelected = fuelType === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.fuelOptionCard,
                        isSelected && styles.fuelOptionCardSelected,
                      ]}
                      onPress={() => setFuelType(opt.value)}
                    >
                      <MaterialIcons
                        name={opt.icon as any}
                        size={20}
                        color={isSelected ? C.primary : C.textSecondary}
                      />
                      <Text style={[styles.fuelOptionLabel, isSelected && styles.fuelOptionLabelSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, marginRight: Spacing.md }}>
                  <Text style={styles.switchLabel}>Varsayılan Araç Olarak Ayarla</Text>
                  <Text style={styles.switchSub}>
                    Seyahat rotalamalarında varsayılan araç tüketim profili kullanılacaktır.
                  </Text>
                </View>
                <Switch
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: C.surfaceContainerHigh, true: C.primary }}
                  thumbColor={Platform.OS === 'android' ? C.surface : undefined}
                />
              </View>

              <View style={styles.modalActions}>
                <Button
                  label={isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={isSaving}
                  onPress={handleSave}
                  style={{ marginBottom: Spacing.sm }}
                />

                {editingVehicle && (
                  <Button
                    label="Aracı Sil"
                    variant="outline"
                    size="md"
                    fullWidth
                    disabled={isSaving}
                    onPress={handleDelete}
                    labelStyle={{ color: C.error }}
                    style={{ borderColor: C.error }}
                  />
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function VehicleCard({
  vehicle,
  index,
  onEdit,
}: {
  vehicle: Vehicle;
  index: number;
  onEdit: (vehicle: Vehicle) => void;
}) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const isEV = vehicle.fuelType === 'electric' || vehicle.fuelType === 'plugin_hybrid';
  const rangeColor = isEV ? C.secondary : C.tertiary;
  const rangeIcon: keyof typeof MaterialIcons.glyphMap = isEV
    ? 'battery-charging-full'
    : 'local-gas-station';

  const getFuelTypeLabel = (type: string) => {
    const found = fuelTypeOptions.find(o => o.value === type);
    return found ? found.label : type;
  };

  const getVehicleIconName = (type: string): keyof typeof MaterialIcons.glyphMap => {
    if (type === 'electric') return 'electric-car';
    return 'directions-car';
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        marginBottom: Spacing.md,
      }}
    >
      <TouchableOpacity
        style={styles.vehicleCard}
        activeOpacity={0.85}
        onPress={() => onEdit(vehicle)}
        accessibilityRole="button"
      >
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: Spacing.sm }}>
            <View style={styles.nameRow}>
              <Text style={styles.vehicleName} numberOfLines={1}>{vehicle.nickname}</Text>
              {vehicle.isDefault && <Badge label="VARSAYILAN" variant="primary" size="sm" />}
            </View>
            <Text style={styles.vehicleSub} numberOfLines={1}>
              {vehicle.brand} {vehicle.model} ({vehicle.modelYear})
            </Text>
          </View>
          <View style={[styles.vehicleIcon, { backgroundColor: isEV ? C.secondaryContainer : C.surfaceContainerHigh }]}>
            <MaterialIcons
              name={getVehicleIconName(vehicle.fuelType)}
              size={24}
              color={isEV ? C.onSecondaryContainer : C.textSecondary}
            />
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Tip</Text>
            <Text style={styles.statValue}>
              {getFuelTypeLabel(vehicle.fuelType)}
            </Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Verimlilik</Text>
            <Text style={styles.statValue}>
              {isEV
                ? `${vehicle.energyConsumptionKwhPer100km || 18} kWh/100km`
                : `${vehicle.fuelConsumptionLPer100km || 7.0} L/100km`}
            </Text>
          </View>
        </View>

        {/* Range bar */}
        <View style={styles.rangeRow}>
          <View style={styles.rangeLeft}>
            <MaterialIcons name={rangeIcon} size={16} color={rangeColor} />
            <Text style={[styles.rangeText, { color: rangeColor }]}>
              Tahmini Menzil: {vehicle.usableRangeKm || 400} km
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => onEdit(vehicle)}
            accessibilityRole="button"
            accessibilityLabel="Aracı düzenle"
          >
            <MaterialIcons name="edit" size={16} color={C.outline} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8FF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
  },
  headerTitle: {
    ...Typography.h1,
    color: C.onSurface,
  },
  headerSub: {
    ...Typography.bodyMedium,
    color: C.onSurfaceVariant,
    marginTop: 4,
  },
  scroll: {
    paddingHorizontal: Spacing.gutter,
    paddingBottom: TabBarHeight + Spacing['2xl'],
  },
  vehicleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  vehicleName: {
    ...Typography.h3,
    color: C.onSurface,
  },
  vehicleSub: {
    ...Typography.bodySmall,
    color: C.onSurfaceVariant,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 53, 208, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(238, 240, 247, 0.6)',
    borderRadius: Rounded.xl,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    gap: 3,
  },
  statLabel: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
  },
  statValue: {
    ...Typography.bodyMedium,
    color: C.onSurface,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: C.outlineVariant,
    marginHorizontal: Spacing.md,
    opacity: 0.5,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rangeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: C.primary,
  },
  editBtn: {
    padding: Spacing.xs,
  },
  addCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Rounded['2xl'],
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  addCardInner: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  addCardText: {
    ...Typography.bodyMedium,
    color: C.primary,
    fontWeight: '600',
  },
  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FAF8FF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  modalCloseBtn: {
    padding: Spacing.xs,
  },
  modalTitle: {
    ...Typography.h3,
    color: C.onSurface,
  },
  modalScroll: {
    padding: Spacing.gutter,
    gap: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorContainer,
    borderRadius: Rounded.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  formErrorText: {
    ...Typography.bodySmall,
    color: C.error,
    flex: 1,
  },
  fieldLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    marginBottom: 4,
  },
  input: {
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderRadius: Rounded.xl,
    paddingHorizontal: Spacing.md,
    color: C.onSurface,
    fontSize: 15,
    ...Shadow.sm,
  },
  row: {
    flexDirection: 'row',
  },
  fuelOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  fuelOptionCard: {
    width: '47.5%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderRadius: Rounded.xl,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  fuelOptionCardSelected: {
    borderColor: C.primary,
    backgroundColor: 'rgba(59, 53, 208, 0.1)',
  },
  fuelOptionLabel: {
    ...Typography.bodySmall,
    color: C.onSurface,
    fontWeight: '600',
  },
  fuelOptionLabelSelected: {
    color: C.primary,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: Spacing.sm,
    borderRadius: Rounded.lg,
  },
  switchLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: C.onSurface,
  },
  switchSub: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  modalActions: {
    marginTop: Spacing.xl,
  },
});
