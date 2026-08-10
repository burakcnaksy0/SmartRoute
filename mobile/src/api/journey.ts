import api from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JourneyStopRequest {
  placeName: string;
  lat: number;
  lng: number;
  visitDurationMinutes?: number;
  timeWindowStart?: string; // ISO 8601
  timeWindowEnd?: string;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  stopType?: 'errand' | 'meeting' | 'poi' | 'parking' | 'pickup';
}

export interface JourneyRequest {
  startLat: number;
  startLng: number;
  startAddressText?: string;
  plannedDepartureTime?: string;
  deadlineTime?: string;
  stops: JourneyStopRequest[];
}

export interface NlpParseResult {
  startLat?: number;
  startLng?: number;
  startAddressText?: string;
  plannedDepartureTime?: string;
  deadlineTime?: string;
  stops: NlpParsedStop[];
}

export interface NlpParsedStop {
  placeName?: string;
  lat?: number;
  lng?: number;
  visitDurationMinutes?: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  priority?: string;
  stopType?: string;
}

export interface JourneyStop {
  id: string;
  placeName: string;
  lat: number;
  lng: number;
  visitDurationMinutes: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  priority: string;
  stopType: string;
  sequenceOrder: number;
  optimizedOrder?: number;
}

export interface PlanLeg {
  id: string;
  legOrder: number;
  distanceMeters: number;
  durationSeconds: number;
  polylineEncoded: string;
  tollCost: number;
}

export interface JourneyPlan {
  id: string;
  planLabel: string;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  totalTollCost: number;
  totalFuelCostEstimate: number;
  estimatedEnergyCost?: number;
  trafficRiskScore: number;
  overallScore: number;
  isSelected: boolean;
  explanationText?: string;
  requiresChargingStop?: boolean;
  chargingStopCount?: number;
  legs: PlanLeg[];
}

export interface Journey {
  id: string;
  status: string;
  startLat: number;
  startLng: number;
  startAddressText?: string;
  plannedDepartureTime?: string;
  deadlineTime?: string;
  stops: JourneyStop[];
  plans: JourneyPlan[];
  createdAt: string;
}

export interface DepartureSuggestion {
  departureTime: string;
  arrivalConfidence: number;
  estimatedDurationSeconds: number;
}

// ─── Replan Types ─────────────────────────────────────────────────────────────

export interface ReplanRequest {
  currentLat: number;
  currentLng: number;
  completedStopIds: string[];
}

export interface ReplanResponse {
  replanSuggested: boolean;
  message: string;
  proposedPlan?: JourneyPlan;
}

export interface JourneyStatistics {
  totalTrips: number;
  totalDistanceKm: number;
  totalSavingsEur: number;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const journeyApi = {
  getJourneys: async (): Promise<Journey[]> => {
    const response = await api.get<Journey[]>('/journeys');
    return response.data;
  },

  getStatistics: async (): Promise<JourneyStatistics> => {
    const response = await api.get<JourneyStatistics>('/journeys/statistics');
    return response.data;
  },

  parseNlp: async (text: string): Promise<NlpParseResult> => {
    const response = await api.post<NlpParseResult>('/journeys/parse-nlp', { text });
    return response.data;
  },

  createDraft: async (request: JourneyRequest): Promise<Journey> => {
    const response = await api.post<Journey>('/journeys', request);
    return response.data;
  },

  getJourney: async (id: string): Promise<Journey> => {
    const response = await api.get<Journey>(`/journeys/${id}`);
    return response.data;
  },

  optimize: async (
    id: string,
    params: {
      returnToStart: boolean;
      stops?: JourneyStopRequest[];
      startLocation?: { lat: number; lng: number };
      preferences?: { profileType: string; avoidTolls: boolean; avoidHighways: boolean };
      vehicleType?: string;
    }
  ): Promise<Journey> => {
    const response = await api.post<Journey>(`/journeys/${id}/optimize`, params);
    return response.data;
  },

  getPlans: async (id: string): Promise<JourneyPlan[]> => {
    const response = await api.get<JourneyPlan[]>(`/journeys/${id}/plans`);
    return response.data;
  },

  selectPlan: async (journeyId: string, planId: string): Promise<JourneyPlan> => {
    const response = await api.post<JourneyPlan>(`/journeys/${journeyId}/plans/${planId}/select`);
    return response.data;
  },

  getDepartureSuggestions: async (
    journeyId: string,
    targetArrivalTime: string
  ): Promise<DepartureSuggestion[]> => {
    const response = await api.post<DepartureSuggestion[]>(
      `/journeys/${journeyId}/departure-suggestions`,
      { targetArrivalTime }
    );
    return response.data;
  },

  replan: async (
    id: string,
    request: ReplanRequest,
    confirm: boolean = false
  ): Promise<ReplanResponse> => {
    const response = await api.post<ReplanResponse>(
      `/journeys/${id}/replan?confirm=${confirm}`,
      request
    );
    return response.data;
  },
};

export default journeyApi;
