package com.smartroute.service.places;

import com.smartroute.domain.Journey;
import com.smartroute.domain.JourneyPlan;
import com.smartroute.domain.JourneyStop;
import com.smartroute.domain.PlanLeg;
import com.smartroute.domain.User;
import com.smartroute.dto.AlongRoutePoiResponse;
import com.smartroute.dto.ParkingOptionResponse;
import com.smartroute.repository.JourneyRepository;
import com.smartroute.repository.JourneyStopRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PlacesService {

    private final JourneyRepository journeyRepository;
    private final JourneyStopRepository journeyStopRepository;
    private final OsmPlacesProvider osmPlacesProvider;

    public PlacesService(JourneyRepository journeyRepository,
                         JourneyStopRepository journeyStopRepository,
                         OsmPlacesProvider osmPlacesProvider) {
        this.journeyRepository = journeyRepository;
        this.journeyStopRepository = journeyStopRepository;
        this.osmPlacesProvider = osmPlacesProvider;
    }

    public List<AlongRoutePoiResponse> getAlongRoutePoi(UUID journeyId, String category, Double maxDetourMinutes, Double maxDetourKm, User user) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new RuntimeException("Journey not found"));

        if (!journey.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized access to journey");
        }

        JourneyPlan plan = journey.getPlans().stream()
                .filter(JourneyPlan::getIsSelected)
                .findFirst()
                .orElse(null);

        if (plan == null && !journey.getPlans().isEmpty()) {
            plan = journey.getPlans().get(0);
        }

        if (plan == null) {
            return Collections.emptyList();
        }

        double detourMinutesLimit = maxDetourMinutes != null ? maxDetourMinutes : 10.0;
        double detourKmLimit = maxDetourKm != null ? maxDetourKm : 2.0;

        List<double[]> sampledPoints = new ArrayList<>();
        for (PlanLeg leg : plan.getLegs()) {
            if (leg.getPolylineEncoded() != null) {
                List<double[]> decoded = decodePolyline(leg.getPolylineEncoded());
                if (!decoded.isEmpty()) {
                    sampledPoints.add(decoded.get(0));
                    double[] lastSampled = decoded.get(0);
                    double cumulative = 0.0;
                    for (int i = 1; i < decoded.size(); i++) {
                        double[] current = decoded.get(i);
                        double[] prev = decoded.get(i - 1);
                        double dist = haversineDistance(prev[0], prev[1], current[0], current[1]);
                        cumulative += dist;
                        if (cumulative >= 2000.0) { // sample every 2 km
                            sampledPoints.add(current);
                            lastSampled = current;
                            cumulative = 0.0;
                        }
                    }
                    double[] finalPoint = decoded.get(decoded.size() - 1);
                    if (haversineDistance(lastSampled[0], lastSampled[1], finalPoint[0], finalPoint[1]) > 50) {
                        sampledPoints.add(finalPoint);
                    }
                }
            }
        }

        String type = mapCategoryToPlacesType(category);
        int radius = (int) (detourKmLimit * 1000);

        Map<String, GooglePlaceResult> uniquePois = new HashMap<>();
        for (double[] point : sampledPoints) {
            List<GooglePlaceResult> pois = osmPlacesProvider.searchNearby(point[0], point[1], radius, type);
            for (GooglePlaceResult poi : pois) {
                uniquePois.put(poi.getPlaceId(), poi);
            }
        }

        List<AlongRoutePoiResponse> responseList = new ArrayList<>();
        for (GooglePlaceResult poi : uniquePois.values()) {
            // Find closest sample point to compute detour
            double minDistance = Double.MAX_VALUE;
            for (double[] point : sampledPoints) {
                double dist = haversineDistance(point[0], point[1], poi.getLat(), poi.getLng());
                if (dist < minDistance) {
                    minDistance = dist;
                }
            }

            // Detour duration estimate using 40 km/h (11.11 m/s) speed proxy:
            // Going there and back = 2 * minDistance
            double detourDist = 2 * minDistance;
            double detourDurSeconds = detourDist / 11.11;
            double detourDurMinutes = detourDurSeconds / 60.0;

            if (detourDurMinutes <= detourMinutesLimit && (detourDist / 1000.0) <= detourKmLimit) {
                AlongRoutePoiResponse resp = new AlongRoutePoiResponse();
                resp.setPlaceId(poi.getPlaceId());
                resp.setName(poi.getName());
                resp.setAddress(poi.getVicinity());
                resp.setLat(poi.getLat());
                resp.setLng(poi.getLng());
                resp.setRating(poi.getRating());
                resp.setUserRatingsTotal(poi.getUserRatingsTotal());
                resp.setDetourDurationMinutes(detourDurMinutes);
                resp.setDetourDistanceMeters(detourDist);
                responseList.add(resp);
            }
        }

        // Sort by detour duration ascending and limit to 10 results
        return responseList.stream()
                .sorted(Comparator.comparingDouble(AlongRoutePoiResponse::getDetourDurationMinutes))
                .limit(10)
                .collect(Collectors.toList());
    }

    public List<ParkingOptionResponse> getParkingOptions(UUID stopId, User user) {
        JourneyStop stop = journeyStopRepository.findById(stopId)
                .orElseThrow(() -> new RuntimeException("Journey stop not found"));

        if (!stop.getJourney().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized access to journey stop");
        }

        List<GooglePlaceResult> parkingLots = osmPlacesProvider.searchNearby(stop.getLat(), stop.getLng(), 800, "parking");

        // Calculate planned arrival time (ETA) of this stop in the active/selected plan
        LocalDateTime routeArrivalTime = calculateStopRouteArrivalTime(stop);

        List<ParkingOptionResponse> options = new ArrayList<>();
        for (GooglePlaceResult lot : parkingLots) {
            double distance = haversineDistance(stop.getLat(), stop.getLng(), lot.getLat(), lot.getLng());
            
            // Limit otopark search to 300-800m çevresi (or keep all up to 800m but display walking info)
            // Let's filter to keep ones within 800m
            if (distance <= 800.0) {
                double walkTimeMinutes = distance / (1.4 * 60.0); // 1.4 m/s walking speed
                
                // Mocks or simple deterministic formula based on rating & hash of placeId
                double occupancyRate = 0.3 + (Math.abs(lot.getPlaceId().hashCode()) % 60) / 100.0;
                double parkingSearchTimeMinutes = 2.0 + (occupancyRate * 5.0); // 2 to 7 minutes search time
                
                LocalDateTime effectiveArrival = routeArrivalTime
                        .plusSeconds((long) (parkingSearchTimeMinutes * 60))
                        .plusSeconds((long) (walkTimeMinutes * 60));

                ParkingOptionResponse option = new ParkingOptionResponse();
                option.setPlaceId(lot.getPlaceId());
                option.setName(lot.getName());
                option.setAddress(lot.getVicinity());
                option.setLat(lot.getLat());
                option.setLng(lot.getLng());
                option.setDistanceMeters((int) distance);
                option.setWalkTimeMinutes(walkTimeMinutes);
                option.setParkingSearchTimeEstimateMinutes(parkingSearchTimeMinutes);
                option.setEffectiveArrivalTime(effectiveArrival);
                option.setOccupancyRate(occupancyRate);
                
                boolean isFree = lot.getName().toLowerCase().contains("free") || (Math.abs(lot.getPlaceId().hashCode()) % 5 == 0);
                option.setPaymentType(isFree ? "free" : "paid");
                option.setCostEstimate(isFree ? BigDecimal.ZERO : BigDecimal.valueOf(5.0 + (Math.abs(lot.getPlaceId().hashCode()) % 15)));

                options.add(option);
            }
        }

        // Sort by effective arrival time ascending
        return options.stream()
                .sorted(Comparator.comparing(ParkingOptionResponse::getEffectiveArrivalTime))
                .collect(Collectors.toList());
    }

    private LocalDateTime calculateStopRouteArrivalTime(JourneyStop stop) {
        Journey journey = stop.getJourney();
        JourneyPlan plan = journey.getPlans().stream()
                .filter(JourneyPlan::getIsSelected)
                .findFirst()
                .orElse(null);

        if (plan == null && !journey.getPlans().isEmpty()) {
            plan = journey.getPlans().get(0);
        }

        LocalDateTime time = journey.getPlannedDepartureTime() != null 
                ? journey.getPlannedDepartureTime() : LocalDateTime.now();

        if (plan == null) {
            return time;
        }

        for (PlanLeg leg : plan.getLegs()) {
            time = time.plusSeconds(leg.getDurationSeconds());
            if (leg.getToStop().getId().equals(stop.getId())) {
                return time;
            }
            time = time.plusMinutes(leg.getToStop().getVisitDurationMinutes());
        }

        return time;
    }

    private String mapCategoryToPlacesType(String category) {
        if (category == null) return "point_of_interest";
        return switch (category.toLowerCase()) {
            case "fuel", "gas" -> "gas_station";
            case "pharmacy" -> "pharmacy";
            case "restaurant" -> "restaurant";
            case "parking" -> "parking";
            case "cafe" -> "cafe";
            case "supermarket" -> "supermarket";
            default -> "point_of_interest";
        };
    }

    public static List<double[]> decodePolyline(String encoded) {
        List<double[]> track = new ArrayList<>();
        int index = 0;
        int len = encoded.length();
        int lat = 0, lng = 0;

        while (index < len) {
            int b, shift = 0, result = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            track.add(new double[] { lat / 1e5, lng / 1e5 });
        }
        return track;
    }

    public static double haversineDistance(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371e3; // meters
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaPhi = Math.toRadians(lat2 - lat1);
        double deltaLambda = Math.toRadians(lng2 - lng1);

        double a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                   Math.cos(phi1) * Math.cos(phi2) *
                   Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // meters
    }

    public List<GooglePlaceResult> searchPlaces(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return osmPlacesProvider.textSearch(query);
    }

    public String reverseGeocode(double lat, double lng) {
        return osmPlacesProvider.reverseGeocode(lat, lng);
    }
}
