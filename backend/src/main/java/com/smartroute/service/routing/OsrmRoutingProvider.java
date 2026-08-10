package com.smartroute.service.routing;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * OSRM-based routing provider — replaces GoogleRoutesProvider.
 *
 * Route service:  GET /route/v1/driving/{coords}?overview=full&geometries=polyline&alternatives=true
 * Table service:  GET /table/v1/driving/{coords}?annotations=duration,distance
 *
 * Uses the public OSRM demo server (router.project-osrm.org) by default.
 * For production, self-host via Docker: docker run -t -i -p 5000:5000 osrm/osrm-backend
 */
@Service
public class OsrmRoutingProvider implements RoutingProvider {

    private static final Logger log = LoggerFactory.getLogger(OsrmRoutingProvider.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${osrm.baseUrl:https://router.project-osrm.org}")
    private String baseUrl;

    public OsrmRoutingProvider(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
                .version(java.net.http.HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory(httpClient))
                .build();
    }

    // ── Distance Matrix (OSRM Table Service) ─────────────────────────────────

    @Override
    @CircuitBreaker(name = "osrmRoutesApi")
    public DistanceMatrixResult computeMatrix(List<GeoPoint> origins, List<GeoPoint> destinations) {
        // OSRM Table endpoint requires all points as a single coordinate list.
        // sources= and destinations= are index lists into the full list.
        // We pass origins first, then destinations (deduplication not needed for matrix).
        List<GeoPoint> allPoints = new ArrayList<>(origins);
        // Add any destination points not already in origins
        for (GeoPoint d : destinations) {
            boolean found = false;
            for (GeoPoint o : origins) {
                if (Math.abs(o.getLat() - d.getLat()) < 1e-7 && Math.abs(o.getLng() - d.getLng()) < 1e-7) {
                    found = true;
                    break;
                }
            }
            if (!found) allPoints.add(d);
        }

        String coords = buildCoordString(allPoints);

        // Build sources and destinations index parameters
        StringBuilder srcIdx = new StringBuilder();
        for (int i = 0; i < origins.size(); i++) {
            if (i > 0) srcIdx.append(";");
            srcIdx.append(i);
        }

        StringBuilder dstIdx = new StringBuilder();
        for (int i = 0; i < destinations.size(); i++) {
            if (i > 0) dstIdx.append(";");
            // Find this destination's index in allPoints
            GeoPoint d = destinations.get(i);
            for (int j = 0; j < allPoints.size(); j++) {
                GeoPoint p = allPoints.get(j);
                if (Math.abs(p.getLat() - d.getLat()) < 1e-7 && Math.abs(p.getLng() - d.getLng()) < 1e-7) {
                    dstIdx.append(j);
                    break;
                }
            }
        }

        String url = baseUrl + "/table/v1/driving/" + coords
                + "?annotations=duration,distance"
                + "&sources=" + srcIdx
                + "&destinations=" + dstIdx;

        long[][] durations = new long[origins.size()][destinations.size()];
        long[][] distances = new long[origins.size()][destinations.size()];

        try {
            String responseBody = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);

            if (root != null && "Ok".equals(root.path("code").asText())) {
                JsonNode durNode = root.path("durations");
                JsonNode distNode = root.path("distances");

                for (int i = 0; i < origins.size(); i++) {
                    for (int j = 0; j < destinations.size(); j++) {
                        if (durNode.isArray() && durNode.has(i) && durNode.get(i).has(j)) {
                            durations[i][j] = durNode.get(i).get(j).asLong();
                        }
                        if (distNode.isArray() && distNode.has(i) && distNode.get(i).has(j)) {
                            distances[i][j] = distNode.get(i).get(j).asLong();
                        }
                    }
                }
            } else {
                log.warn("OSRM table service returned non-Ok response, using fallback distances");
                fillFallbackMatrix(durations, distances, origins, destinations);
            }
        } catch (Exception e) {
            log.error("OSRM table service error, using fallback: ", e);
            fillFallbackMatrix(durations, distances, origins, destinations);
        }

        return new DistanceMatrixResult(durations, distances);
    }

    // ── Route (OSRM Route Service) ────────────────────────────────────────────

    @Override
    public List<RouteCandidate> computeRoute(GeoPoint origin, GeoPoint destination, RouteOptions options) {
        String coords = origin.getLng() + "," + origin.getLat()
                + ";" + destination.getLng() + "," + destination.getLat();

        String url = baseUrl + "/route/v1/driving/" + coords
                + "?overview=full&geometries=polyline&alternatives=true&steps=false";

        List<RouteCandidate> candidates = new ArrayList<>();

        try {
            String responseBody = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);

            if (root != null && "Ok".equals(root.path("code").asText())) {
                JsonNode routes = root.path("routes");
                if (routes.isArray()) {
                    for (JsonNode route : routes) {
                        int durationSeconds = (int) route.path("duration").asDouble();
                        int distanceMeters = (int) route.path("distance").asDouble();
                        String polyline = route.path("geometry").asText("");

                        // OSRM returns no toll data — toll cost is always 0
                        candidates.add(new RouteCandidate(durationSeconds, distanceMeters, BigDecimal.ZERO, polyline));
                    }
                }
            }
        } catch (Exception e) {
            log.error("OSRM route service error for {}->{}: ", origin, destination, e);
        }

        // Fallback: straight-line estimate at 50 km/h
        if (candidates.isEmpty()) {
            log.warn("OSRM returned no routes, using straight-line fallback");
            double distM = haversineMeters(origin.getLat(), origin.getLng(), destination.getLat(), destination.getLng());
            int durationSec = (int) (distM / (50_000.0 / 3600.0)); // 50 km/h
            candidates.add(new RouteCandidate(durationSec, (int) distM, BigDecimal.ZERO, ""));
        }

        return candidates;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String buildCoordString(List<GeoPoint> points) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < points.size(); i++) {
            if (i > 0) sb.append(";");
            sb.append(points.get(i).getLng()).append(",").append(points.get(i).getLat());
        }
        return sb.toString();
    }

    private void fillFallbackMatrix(long[][] durations, long[][] distances,
                                     List<GeoPoint> origins, List<GeoPoint> destinations) {
        for (int i = 0; i < origins.size(); i++) {
            for (int j = 0; j < destinations.size(); j++) {
                double distM = haversineMeters(
                        origins.get(i).getLat(), origins.get(i).getLng(),
                        destinations.get(j).getLat(), destinations.get(j).getLng());
                distances[i][j] = (long) distM;
                durations[i][j] = (long) (distM / (50_000.0 / 3600.0));
            }
        }
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6_371_000; // Earth radius in meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
