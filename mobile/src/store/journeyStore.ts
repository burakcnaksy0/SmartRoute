import { create } from 'zustand';
import journeyApi, {
  Journey,
  JourneyRequest,
  JourneyStopRequest,
  NlpParseResult,
  DepartureSuggestion,
  JourneyPlan,
} from '../api/journey';

interface JourneyState {
  // Active journey
  currentJourney: Journey | null;
  isLoading: boolean;
  error: string | null;

  // Draft stops for manual creation/editing
  draftStops: JourneyStopRequest[];
  infeasibleConflictingStops: string[] | null;

  // NLP flow
  nlpParsedResult: NlpParseResult | null;
  isNlpParsing: boolean;
  nlpError: string | null;

  // Departure optimizer flow
  departureSuggestions: DepartureSuggestion[] | null;
  isLoadingSuggestions: boolean;
  suggestionsError: string | null;

  // Actions
  parseNlp: (text: string) => Promise<boolean>;
  clearNlpResult: () => void;
  createJourney: (request: JourneyRequest) => Promise<Journey | null>;
  optimizeJourney: (id: string, params: any) => Promise<boolean>;
  fetchDepartureSuggestions: (journeyId: string, targetArrivalTime: string) => Promise<boolean>;
  
  // Draft stop actions
  addDraftStop: (stop: JourneyStopRequest) => void;
  updateDraftStop: (index: number, stop: Partial<JourneyStopRequest>) => void;
  deleteDraftStop: (index: number) => void;
  reorderDraftStops: (newStops: JourneyStopRequest[]) => void;
  clearDraftStops: () => void;
  
  // Live journey reordering action (manual override)
  reorderStops: (stopIds: string[]) => void;

  // Active/Replan States
  completedStopIds: string[];
  replanSuggested: boolean;
  replanMessage: string | null;
  proposedPlan: JourneyPlan | null;
  isReplanLoading: boolean;

  // Active/Replan Actions
  startJourney: () => void;
  markStopAsCompleted: (stopId: string) => void;
  triggerReplan: (lat: number, lng: number) => Promise<boolean>;
  confirmReplan: (lat: number, lng: number) => Promise<boolean>;
  cancelReplan: () => void;
  
  clearError: () => void;
  reset: () => void;
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  currentJourney: null,
  isLoading: false,
  error: null,
  draftStops: [],
  infeasibleConflictingStops: null,

  nlpParsedResult: null,
  isNlpParsing: false,
  nlpError: null,

  departureSuggestions: null,
  isLoadingSuggestions: false,
  suggestionsError: null,

  parseNlp: async (text: string) => {
    set({ isNlpParsing: true, nlpError: null, nlpParsedResult: null });
    try {
      const result = await journeyApi.parseNlp(text);
      set({ nlpParsedResult: result, isNlpParsing: false });
      return true;
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        'Doğal dil işleme başarısız oldu. Lütfen tekrar deneyin veya manuel form kullanın.';
      set({ nlpError: msg, isNlpParsing: false });
      return false;
    }
  },

  clearNlpResult: () => {
    set({ nlpParsedResult: null, nlpError: null });
  },

  createJourney: async (request: JourneyRequest) => {
    set({ isLoading: true, error: null, infeasibleConflictingStops: null });
    try {
      const journey = await journeyApi.createDraft(request);
      set({ currentJourney: journey, isLoading: false });
      return journey;
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.message || 'Yolculuk oluşturulamadı.';
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  optimizeJourney: async (id: string, params: any) => {
    set({ isLoading: true, error: null, infeasibleConflictingStops: null });
    try {
      const journey = await journeyApi.optimize(id, params);
      set({ currentJourney: journey, isLoading: false });
      return true;
    } catch (e: any) {
      const responseData = e?.response?.data;
      const msg = responseData?.error || e?.message || 'Optimizasyon başarısız oldu.';
      
      // If it is an infeasible plan error with conflicting stops, capture them
      if (responseData?.errorCode === 'INFEASIBLE_PLAN' && responseData?.conflictingStops) {
        set({
          error: msg,
          infeasibleConflictingStops: responseData.conflictingStops,
          isLoading: false,
        });
      } else {
        set({ error: msg, isLoading: false });
      }
      return false;
    }
  },

  fetchDepartureSuggestions: async (journeyId: string, targetArrivalTime: string) => {
    set({ isLoadingSuggestions: true, suggestionsError: null, departureSuggestions: null });
    try {
      const suggestions = await journeyApi.getDepartureSuggestions(journeyId, targetArrivalTime);
      set({ departureSuggestions: suggestions, isLoadingSuggestions: false });
      return true;
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.message || 'Çıkış önerileri yüklenemedi.';
      set({ suggestionsError: msg, isLoadingSuggestions: false });
      return false;
    }
  },

  // Draft stops management
  addDraftStop: (stop: JourneyStopRequest) => {
    set(state => ({
      draftStops: [...state.draftStops, stop]
    }));
  },

  updateDraftStop: (index: number, updatedFields: Partial<JourneyStopRequest>) => {
    set(state => {
      const updated = [...state.draftStops];
      if (index >= 0 && index < updated.length) {
        updated[index] = { ...updated[index], ...updatedFields };
      }
      return { draftStops: updated };
    });
  },

  deleteDraftStop: (index: number) => {
    set(state => ({
      draftStops: state.draftStops.filter((_, i) => i !== index)
    }));
  },

  reorderDraftStops: (newStops: JourneyStopRequest[]) => {
    set({ draftStops: newStops });
  },

  clearDraftStops: () => {
    set({ draftStops: [] });
  },

  // Reorder final optimized journey stops (manual override on the client)
  reorderStops: (stopIds: string[]) => {
    const journey = get().currentJourney;
    if (!journey) return;
    const updatedStops = journey.stops.map(stop => {
      const newIndex = stopIds.indexOf(stop.id);
      return {
        ...stop,
        optimizedOrder: newIndex >= 0 ? newIndex + 1 : stop.optimizedOrder,
      };
    });
    set({
      currentJourney: {
        ...journey,
        stops: updatedStops,
      },
    });
  },

  // Active/Replan States
  completedStopIds: [],
  replanSuggested: false,
  replanMessage: null,
  proposedPlan: null,
  isReplanLoading: false,

  startJourney: () => {
    const journey = get().currentJourney;
    if (journey) {
      set({
        currentJourney: { ...journey, status: 'active' },
        completedStopIds: [],
        replanSuggested: false,
        replanMessage: null,
        proposedPlan: null,
      });
    }
  },

  markStopAsCompleted: (stopId: string) => {
    const journey = get().currentJourney;
    if (!journey) return;
    const completed = [...get().completedStopIds, stopId];
    const allCompleted = journey.stops.every(s => completed.includes(s.id));
    set({
      completedStopIds: completed,
      currentJourney: {
        ...journey,
        status: allCompleted ? 'completed' : 'active',
      },
    });
  },

  triggerReplan: async (lat: number, lng: number) => {
    const journey = get().currentJourney;
    if (!journey) return false;
    set({ isReplanLoading: true, error: null });
    try {
      const request = {
        currentLat: lat,
        currentLng: lng,
        completedStopIds: get().completedStopIds,
      };
      const response = await journeyApi.replan(journey.id, request, false);
      set({
        replanSuggested: response.replanSuggested,
        replanMessage: response.message,
        proposedPlan: response.proposedPlan || null,
        isReplanLoading: false,
      });
      return response.replanSuggested;
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Yeniden planlama başarısız oldu.';
      set({ error: msg, isReplanLoading: false });
      return false;
    }
  },

  confirmReplan: async (lat: number, lng: number) => {
    const journey = get().currentJourney;
    if (!journey) return false;
    set({ isReplanLoading: true, error: null });
    try {
      const request = {
        currentLat: lat,
        currentLng: lng,
        completedStopIds: get().completedStopIds,
      };
      await journeyApi.replan(journey.id, request, true);
      const updatedJourney = await journeyApi.getJourney(journey.id);
      set({
        currentJourney: updatedJourney,
        replanSuggested: false,
        replanMessage: null,
        proposedPlan: null,
        isReplanLoading: false,
      });
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Yeniden planlama onaylanamadı.';
      set({ error: msg, isReplanLoading: false });
      return false;
    }
  },

  cancelReplan: () => {
    set({
      replanSuggested: false,
      replanMessage: null,
      proposedPlan: null,
    });
  },

  clearError: () => set({ error: null, nlpError: null, suggestionsError: null, infeasibleConflictingStops: null }),

  reset: () =>
    set({
      currentJourney: null,
      isLoading: false,
      error: null,
      draftStops: [],
      infeasibleConflictingStops: null,
      nlpParsedResult: null,
      isNlpParsing: false,
      nlpError: null,
      departureSuggestions: null,
      isLoadingSuggestions: false,
      suggestionsError: null,
      completedStopIds: [],
      replanSuggested: false,
      replanMessage: null,
      proposedPlan: null,
      isReplanLoading: false,
    }),
}));
