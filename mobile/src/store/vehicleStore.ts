import { create } from 'zustand';
import vehicleApi, {
  Vehicle,
  VehicleRequest,
  TripExpense,
  TripExpenseRequest,
} from '../api/vehicle';

interface VehicleState {
  vehicles: Vehicle[];
  defaultVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;

  // Current journey's expense
  currentExpense: TripExpense | null;
  isExpenseLoading: boolean;
  expenseError: string | null;

  // SoC (State of Charge) input before journey start
  currentSocPercent: number; // 0–100, user-input slider value

  // Actions
  fetchVehicles: () => Promise<void>;
  createVehicle: (request: VehicleRequest) => Promise<Vehicle | null>;
  updateVehicle: (id: string, request: VehicleRequest) => Promise<Vehicle | null>;
  deleteVehicle: (id: string) => Promise<boolean>;

  fetchExpense: (journeyId: string) => Promise<void>;
  recordExpense: (journeyId: string, request: TripExpenseRequest) => Promise<TripExpense | null>;
  updateExpense: (journeyId: string, request: TripExpenseRequest) => Promise<TripExpense | null>;

  setSocPercent: (soc: number) => void;
  clearError: () => void;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  defaultVehicle: null,
  isLoading: false,
  error: null,

  currentExpense: null,
  isExpenseLoading: false,
  expenseError: null,

  currentSocPercent: 100,

  fetchVehicles: async () => {
    set({ isLoading: true, error: null });
    try {
      const vehicles = await vehicleApi.list();
      const defaultVehicle = vehicles.find(v => v.isDefault) ?? null;
      set({ vehicles, defaultVehicle, isLoading: false });
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Araçlar yüklenemedi.';
      set({ error: msg, isLoading: false });
    }
  },

  createVehicle: async (request: VehicleRequest) => {
    set({ isLoading: true, error: null });
    try {
      const vehicle = await vehicleApi.create(request);
      const updated = [...get().vehicles, vehicle];
      const defaultVehicle = updated.find(v => v.isDefault) ?? null;
      set({ vehicles: updated, defaultVehicle, isLoading: false });
      return vehicle;
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Araç oluşturulamadı.';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  updateVehicle: async (id: string, request: VehicleRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await vehicleApi.update(id, request);
      const vehicles = get().vehicles.map(v => (v.id === id ? updated : v));
      // If the updated one is now default, unset others in local state
      const withSingleDefault = request.isDefault
        ? vehicles.map(v => ({ ...v, isDefault: v.id === id }))
        : vehicles;
      const defaultVehicle = withSingleDefault.find(v => v.isDefault) ?? null;
      set({ vehicles: withSingleDefault, defaultVehicle, isLoading: false });
      return updated;
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Araç güncellenemedi.';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  deleteVehicle: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await vehicleApi.delete(id);
      const vehicles = get().vehicles.filter(v => v.id !== id);
      const defaultVehicle = vehicles.find(v => v.isDefault) ?? null;
      set({ vehicles, defaultVehicle, isLoading: false });
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Araç silinemedi.';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  fetchExpense: async (journeyId: string) => {
    set({ isExpenseLoading: true, expenseError: null });
    try {
      const expense = await vehicleApi.getExpense(journeyId);
      set({ currentExpense: expense, isExpenseLoading: false });
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Gider bilgisi yüklenemedi.';
      set({ expenseError: msg, isExpenseLoading: false });
    }
  },

  recordExpense: async (journeyId: string, request: TripExpenseRequest) => {
    set({ isExpenseLoading: true, expenseError: null });
    try {
      const expense = await vehicleApi.recordExpense(journeyId, request);
      set({ currentExpense: expense, isExpenseLoading: false });
      return expense;
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Gider kaydedilemedi.';
      set({ expenseError: msg, isExpenseLoading: false });
      return null;
    }
  },

  updateExpense: async (journeyId: string, request: TripExpenseRequest) => {
    set({ isExpenseLoading: true, expenseError: null });
    try {
      const expense = await vehicleApi.updateExpense(journeyId, request);
      set({ currentExpense: expense, isExpenseLoading: false });
      return expense;
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Gider güncellenemedi.';
      set({ expenseError: msg, isExpenseLoading: false });
      return null;
    }
  },

  setSocPercent: (soc: number) => set({ currentSocPercent: Math.max(0, Math.min(100, soc)) }),

  clearError: () => set({ error: null, expenseError: null }),
}));
