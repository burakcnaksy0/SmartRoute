package com.smartroute.service.routing;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * @deprecated Replaced by {@link OsrmRoutingProvider}.
 * This class is kept for reference only and is NOT registered as a Spring bean.
 * To re-enable, restore the @Service annotation and remove it from OsrmRoutingProvider.
 */
// @Service  — disabled; OsrmRoutingProvider is the active RoutingProvider
public class GoogleRoutesProvider implements RoutingProvider {

    private final RestClient restClient;

    @Value("${google.api.key}")
    private String apiKey;

    @Value("${google.api.baseUrl}")
    private String baseUrl;

    public GoogleRoutesProvider() {
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
                .version(java.net.http.HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory(httpClient))
                .build();
    }

    // Constructor for testing
    public GoogleRoutesProvider(RestClient restClient, String apiKey, String baseUrl) {
        this.restClient = restClient;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }

    @Override
    @CircuitBreaker(name = "googleRoutesApi")
    public DistanceMatrixResult computeMatrix(List<GeoPoint> origins, List<GeoPoint> destinations) {
        String url = baseUrl + "/distanceMatrix/v2:computeRouteMatrix";

        List<Map<String, Object>> originWaypoints = new ArrayList<>();
        for (GeoPoint p : origins) {
            originWaypoints.add(Map.of("waypoint", Map.of("location", Map.of("latLng", Map.of(
                    "latitude", p.getLat(),
                    "longitude", p.getLng()
            )))));
        }

        List<Map<String, Object>> destinationWaypoints = new ArrayList<>();
        for (GeoPoint p : destinations) {
            destinationWaypoints.add(Map.of("waypoint", Map.of("location", Map.of("latLng", Map.of(
                    "latitude", p.getLat(),
                    "longitude", p.getLng()
            )))));
        }

        Map<String, Object> requestBody = Map.of(
                "origins", originWaypoints,
                "destinations", destinationWaypoints,
                "travelMode", "DRIVE",
                "routingPreference", "TRAFFIC_AWARE"
        );

        List<Map<String, Object>> response = restClient.post()
                .uri(url)
                .header("X-Goog-Api-Key", apiKey)
                .header("X-Goog-FieldMask", "originIndex,destinationIndex,duration,distanceMeters,status")
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});

        long[][] durations = new long[origins.size()][destinations.size()];
        long[][] distances = new long[origins.size()][destinations.size()];

        if (response != null) {
            for (Map<String, Object> element : response) {
                // If index is 0, Google's JSON parser might omit it
                Integer originIndex = element.containsKey("originIndex") && element.get("originIndex") != null
                        ? ((Number) element.get("originIndex")).intValue() : 0;
                Integer destinationIndex = element.containsKey("destinationIndex") && element.get("destinationIndex") != null
                        ? ((Number) element.get("destinationIndex")).intValue() : 0;
                Integer distanceMeters = element.containsKey("distanceMeters") && element.get("distanceMeters") != null
                        ? ((Number) element.get("distanceMeters")).intValue() : 0;
                String durationStr = (String) element.get("duration");

                long duration = 0;
                if (durationStr != null && durationStr.endsWith("s")) {
                    String clean = durationStr.substring(0, durationStr.length() - 1);
                    duration = (long) Double.parseDouble(clean);
                }

                if (originIndex < origins.size() && destinationIndex < destinations.size()) {
                    durations[originIndex][destinationIndex] = duration;
                    distances[originIndex][destinationIndex] = distanceMeters;
                }
            }
        }

        return new DistanceMatrixResult(durations, distances);
    }

    @Override
    @CircuitBreaker(name = "googleRoutesApi")
    public List<RouteCandidate> computeRoute(GeoPoint origin, GeoPoint destination, RouteOptions options) {
        String url = baseUrl + "/directions/v2:computeRoutes";

        Map<String, Object> originMap = Map.of("location", Map.of("latLng", Map.of(
                "latitude", origin.getLat(),
                "longitude", origin.getLng()
        )));
        Map<String, Object> destinationMap = Map.of("location", Map.of("latLng", Map.of(
                "latitude", destination.getLat(),
                "longitude", destination.getLng()
        )));

        Map<String, Object> routeModifiers = Map.of(
                "avoidTolls", options.isAvoidTolls(),
                "avoidHighways", options.isAvoidHighways()
        );

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("origin", originMap);
        requestBody.put("destination", destinationMap);
        requestBody.put("travelMode", "DRIVE");
        requestBody.put("routingPreference", "TRAFFIC_AWARE");
        requestBody.put("computeAlternativeRoutes", true);
        requestBody.put("routeModifiers", routeModifiers);

        if (options.getDepartureTime() != null) {
            String formattedTime = options.getDepartureTime().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z";
            requestBody.put("departureTime", formattedTime);
        }

        if (options.getTrafficModel() != null) {
            requestBody.put("trafficModel", options.getTrafficModel());
        }

        if (options.isAvoidTolls()) {
            requestBody.put("extraComputations", List.of("TOLLS"));
        }

        Map<String, Object> response = restClient.post()
                .uri(url)
                .header("X-Goog-Api-Key", apiKey)
                .header("X-Goog-FieldMask", "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo")
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});

        List<RouteCandidate> candidates = new ArrayList<>();
        if (response != null && response.containsKey("routes")) {
            List<Map<String, Object>> routes = (List<Map<String, Object>>) response.get("routes");
            for (Map<String, Object> route : routes) {
                String durationStr = (String) route.get("duration");
                int distanceMeters = route.containsKey("distanceMeters") && route.get("distanceMeters") != null
                        ? ((Number) route.get("distanceMeters")).intValue() : 0;

                int durationSeconds = 0;
                if (durationStr != null && durationStr.endsWith("s")) {
                    String clean = durationStr.substring(0, durationStr.length() - 1);
                    durationSeconds = (int) Double.parseDouble(clean);
                }

                String polyline = "";
                if (route.containsKey("polyline")) {
                    Map<String, Object> polylineMap = (Map<String, Object>) route.get("polyline");
                    if (polylineMap != null && polylineMap.containsKey("encodedPolyline")) {
                        polyline = (String) polylineMap.get("encodedPolyline");
                    }
                }

                BigDecimal tollCost = BigDecimal.ZERO;
                if (route.containsKey("travelAdvisory")) {
                    Map<String, Object> travelAdvisory = (Map<String, Object>) route.get("travelAdvisory");
                    if (travelAdvisory != null && travelAdvisory.containsKey("tollInfo")) {
                        Map<String, Object> tollInfo = (Map<String, Object>) travelAdvisory.get("tollInfo");
                        if (tollInfo != null && tollInfo.containsKey("estimatedPrice")) {
                            List<Map<String, Object>> estimatedPrice = (List<Map<String, Object>>) tollInfo.get("estimatedPrice");
                            if (estimatedPrice != null && !estimatedPrice.isEmpty()) {
                                Map<String, Object> price = estimatedPrice.get(0);
                                String unitsStr = (String) price.get("units");
                                Integer nanos = price.containsKey("nanos") && price.get("nanos") != null
                                        ? ((Number) price.get("nanos")).intValue() : 0;
                                if (unitsStr != null) {
                                    double val = Double.parseDouble(unitsStr);
                                    if (nanos != null) {
                                        val += nanos / 1000000000.0;
                                    }
                                    tollCost = BigDecimal.valueOf(val);
                                }
                            }
                        }
                    }
                }

                candidates.add(new RouteCandidate(durationSeconds, distanceMeters, tollCost, polyline));
            }
        }

        return candidates;
    }
}
