/**
 * @deprecated All route planning, geocoding, and parking queries are now handled securely
 * through the Spring Boot backend via journeyApi and placesApi.
 * Direct client-side external API calls and hardcoded API keys have been removed per security guidelines.
 */
import journeyApi from './journey';
import placesApi from './places';

export const clientRoutePlanner = {
  getJourneys: journeyApi.getJourneys,
  getStatistics: journeyApi.getStatistics,
  parseNlp: journeyApi.parseNlp,
  createDraft: journeyApi.createDraft,
  getJourney: journeyApi.getJourney,
  optimize: journeyApi.optimize,
  getPlans: journeyApi.getPlans,
  selectPlan: journeyApi.selectPlan,
  getDepartureSuggestions: journeyApi.getDepartureSuggestions,
  replan: journeyApi.replan,
  searchPlaces: placesApi.search,
  reverseGeocode: placesApi.reverseGeocode,
  findNearbyParking: placesApi.getNearbyParking,
};

export default clientRoutePlanner;
