import api from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  nickname: string;
  brand: string;
  model: string;
  modelYear: number;
  fuelType: 'gasoline' | 'diesel' | 'lpg' | 'hybrid' | 'plugin_hybrid' | 'electric';
  fuelConsumptionLPer100km?: number;
  energyConsumptionKwhPer100km?: number;
  tankCapacityLiters?: number;
  batteryCapacityKwh?: number;
  usableRangeKm?: number;
  chargingConnectorType?: string;
  averageChargingSpeedKw?: number;
  emissionClass?: string;
  tollClass?: string;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
  weightKg?: number;
  isDefault: boolean;
  createdAt: string;
}

export interface VehicleRequest {
  nickname: string;
  brand: string;
  model: string;
  modelYear: number;
  fuelType: string;
  fuelConsumptionLPer100km?: number;
  energyConsumptionKwhPer100km?: number;
  tankCapacityLiters?: number;
  batteryCapacityKwh?: number;
  usableRangeKm?: number;
  chargingConnectorType?: string;
  averageChargingSpeedKw?: number;
  emissionClass?: string;
  tollClass?: string;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
  weightKg?: number;
  isDefault?: boolean;
}

export interface TripExpense {
  id: string;
  journeyId: string;
  entryMethod: 'gps_estimated' | 'odometer' | 'manual_receipt';
  odometerStartKm?: number;
  odometerEndKm?: number;
  actualFuelLiters?: number;
  actualEnergyKwh?: number;
  actualFuelCost: number;
  actualTollCost?: number;
  estimatedFuelCostAtPlanning: number;
  variancePercent?: number;
  receiptPhotoUrl?: string;
  createdAt: string;
}

export interface TripExpenseRequest {
  entryMethod?: string;
  odometerStartKm?: number;
  odometerEndKm?: number;
  actualFuelLiters?: number;
  actualEnergyKwh?: number;
  actualFuelCost?: number;
  actualTollCost?: number;
  receiptPhotoUrl?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const vehicleApi = {
  list: async (): Promise<Vehicle[]> => {
    const response = await api.get<Vehicle[]>('/vehicles');
    return response.data;
  },

  create: async (request: VehicleRequest): Promise<Vehicle> => {
    const response = await api.post<Vehicle>('/vehicles', request);
    return response.data;
  },

  update: async (vehicleId: string, request: VehicleRequest): Promise<Vehicle> => {
    const response = await api.put<Vehicle>(`/vehicles/${vehicleId}`, request);
    return response.data;
  },

  delete: async (vehicleId: string): Promise<void> => {
    await api.delete(`/vehicles/${vehicleId}`);
  },

  // Trip Expenses
  getExpense: async (journeyId: string): Promise<TripExpense> => {
    const response = await api.get<TripExpense>(`/journeys/${journeyId}/expenses`);
    return response.data;
  },

  recordExpense: async (journeyId: string, request: TripExpenseRequest): Promise<TripExpense> => {
    const response = await api.post<TripExpense>(`/journeys/${journeyId}/expenses`, request);
    return response.data;
  },

  updateExpense: async (journeyId: string, request: TripExpenseRequest): Promise<TripExpense> => {
    const response = await api.patch<TripExpense>(`/journeys/${journeyId}/expenses`, request);
    return response.data;
  },
};

export default vehicleApi;
