package com.smartroute.service.routing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Service
@ConditionalOnProperty(name = "providers.routing", havingValue = "ors")
public class OpenRouteServiceProvider implements RoutingProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenRouteServiceProvider.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @Value("${routing.ors.base-url:https://api.openrouteservice.org}")
    private String baseUrl;

    @Value("${routing.ors.api-key:YOUR_ORS_API_KEY_HERE}")
    private String apiKey;

    public OpenRouteServiceProvider(ObjectMapper objectMapper, StringRedisTemplate redisTemplate) {
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
                .version(java.net.http.HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory(httpClient))
                .build();
    }

    @Override
    @CircuitBreaker(name = "orsRoutesApi")
    public DistanceMatrixResult computeMatrix(List<GeoPoint> origins, List<GeoPoint> destinations) {
        if (origins == null || origins.isEmpty() || destinations == null || destinations.isEmpty()) {
            return new DistanceMatrixResult(new long[0][0], new long[0][0]);
        }

        // Generate cache key by hashing the coords
        String cacheKey = "matrix:" + generateMatrixHash(origins, destinations);
        try {
            String cachedValue = redisTemplate.opsForValue().get(cacheKey);
            if (cachedValue != null) {
                log.info("ORS Matrix cache hit");
                return objectMapper.readValue(cachedValue, DistanceMatrixResult.class);
            }
        } catch (Exception e) {
            log.warn("Redis read error for ORS Matrix: ", e);
        }

        try {
            // ORS Matrix API uses a single list of locations and indexes for sources/destinations
            // Let's combine origins and destinations
            List<GeoPoint> combined = new ArrayList<>(origins);
            List<Integer> sources = new ArrayList<>();
            for (int i = 0; i < origins.size(); i++) {
                sources.add(i);
            }

            List<Integer> targets = new ArrayList<>();
            // If destinations are different, append them. Otherwise map targets to combined indices.
            for (int i = 0; i < destinations.size(); i++) {
                GeoPoint dest = destinations.get(i);
                int index = combined.indexOf(dest);
                if (index == -1) {
                    combined.add(dest);
                    targets.add(combined.size() - 1);
                } else {
                    targets.add(index);
                }
            }

            ObjectNode body = objectMapper.createObjectNode();
            ArrayNode locationsNode = body.putArray("locations");
            for (GeoPoint p : combined) {
                // IMPORTANT: ORS expects [longitude, latitude]
                ArrayNode coord = locationsNode.addArray();
                coord.add(p.getLng());
                coord.add(p.getLat());
            }

            ArrayNode sourcesNode = body.putArray("sources");
            for (int s : sources) sourcesNode.add(s);

            ArrayNode targetsNode = body.putArray("destinations");
            for (int t : targets) targetsNode.add(t);

            body.putArray("metrics").add("duration").add("distance");

            String url = baseUrl + "/v2/matrix/driving-car";
            String responseBody = restClient.post()
                    .uri(url)
                    .header("Authorization", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(objectMapper.writeValueAsString(body))
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode durationsNode = root.path("durations");
            JsonNode distancesNode = root.path("distances");

            int rows = origins.size();
            int cols = destinations.size();
            long[][] durations = new long[rows][cols];
            long[][] distances = new long[rows][cols];

            for (int i = 0; i < rows; i++) {
                for (int j = 0; j < cols; j++) {
                    durations[i][j] = durationsNode.path(i).path(j).asLong();
                    // ORS distance is usually in meters
                    distances[i][j] = distancesNode.path(i).path(j).asLong();
                }
            }

            DistanceMatrixResult result = new DistanceMatrixResult(durations, distances);

            // Cache for 12 hours
            try {
                redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result), Duration.ofHours(12));
            } catch (Exception e) {
                log.warn("Redis write error for ORS Matrix: ", e);
            }

            return result;

        } catch (Exception e) {
            log.error("OpenRouteService Matrix API call failed, using fallback: ", e);
            long[][] durations = new long[origins.size()][destinations.size()];
            long[][] distances = new long[origins.size()][destinations.size()];
            fillFallbackMatrix(durations, distances, origins, destinations);
            return new DistanceMatrixResult(durations, distances);
        }
    }

    @Override
    @CircuitBreaker(name = "orsRoutesApi")
    public List<RouteCandidate> computeRoute(GeoPoint origin, GeoPoint destination, RouteOptions options) {
        if (origin == null || destination == null) {
            return Collections.emptyList();
        }

        // Generate cache key
        double lat1 = Math.round(origin.getLat() * 10000.0) / 10000.0;
        double lon1 = Math.round(origin.getLng() * 10000.0) / 10000.0;
        double lat2 = Math.round(destination.getLat() * 10000.0) / 10000.0;
        double lon2 = Math.round(destination.getLng() * 10000.0) / 10000.0;
        String cacheKey = String.format(Locale.US, "route:%.4f:%.4f:%.4f:%.4f:%b:%b",
                lat1, lon1, lat2, lon2, options.isAvoidTolls(), options.isAvoidHighways());

        try {
            String cachedValue = redisTemplate.opsForValue().get(cacheKey);
            if (cachedValue != null) {
                log.info("ORS Route cache hit");
                return objectMapper.readValue(cachedValue, objectMapper.getTypeFactory().constructCollectionType(List.class, RouteCandidate.class));
            }
        } catch (Exception e) {
            log.warn("Redis read error for ORS Route: ", e);
        }

        List<RouteCandidate> candidates = new ArrayList<>();
        try {
            ObjectNode body = objectMapper.createObjectNode();
            ArrayNode coordinatesNode = body.putArray("coordinates");
            
            // [lon, lat] for start
            ArrayNode startNode = coordinatesNode.addArray();
            startNode.add(origin.getLng());
            startNode.add(origin.getLat());

            // [lon, lat] for end
            ArrayNode endNode = coordinatesNode.addArray();
            endNode.add(destination.getLng());
            endNode.add(destination.getLat());

            // Avoid tollways or highways
            if (options.isAvoidTolls() || options.isAvoidHighways()) {
                ObjectNode optionsNode = body.putObject("options");
                ArrayNode avoidFeaturesNode = optionsNode.putArray("avoid_features");
                if (options.isAvoidTolls()) {
                    avoidFeaturesNode.add("tollways");
                }
                if (options.isAvoidHighways()) {
                    avoidFeaturesNode.add("highways");
                }
            }

            String url = baseUrl + "/v2/directions/driving-car";
            String responseBody = restClient.post()
                    .uri(url)
                    .header("Authorization", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(objectMapper.writeValueAsString(body))
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode routesNode = root.path("routes");

            if (routesNode.isArray()) {
                for (JsonNode route : routesNode) {
                    JsonNode summary = route.path("summary");
                    double distance = summary.path("distance").asDouble(); // meters
                    double duration = summary.path("duration").asDouble(); // seconds
                    String geometry = route.path("geometry").asText();

                    candidates.add(new RouteCandidate((int) duration, (int) distance, BigDecimal.ZERO, geometry));
                }
            }

            // Cache for 6 hours
            if (!candidates.isEmpty()) {
                try {
                    redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(candidates), Duration.ofHours(6));
                } catch (Exception e) {
                    log.warn("Redis write error for ORS Route: ", e);
                }
            }

        } catch (Exception e) {
            log.error("OpenRouteService Directions API call failed: ", e);
        }

        // Fallback: straight-line estimate at 50 km/h
        if (candidates.isEmpty()) {
            log.warn("ORS returned no routes for {}->{}, using straight-line fallback", origin, destination);
            double distM = haversineMeters(origin.getLat(), origin.getLng(), destination.getLat(), destination.getLng());
            int durationSec = (int) (distM / (50_000.0 / 3600.0)); // 50 km/h
            candidates.add(new RouteCandidate(durationSec, (int) distM, BigDecimal.ZERO, ""));
        }

        return candidates;
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

    private String generateMatrixHash(List<GeoPoint> origins, List<GeoPoint> destinations) {
        try {
            StringBuilder sb = new StringBuilder();
            for (GeoPoint p : origins) {
                sb.append(String.format(Locale.US, "%.4f,%.4f;", p.getLat(), p.getLng()));
            }
            sb.append("|");
            for (GeoPoint p : destinations) {
                sb.append(String.format(Locale.US, "%.4f,%.4f;", p.getLat(), p.getLng()));
            }
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString().substring(0, 16);
        } catch (Exception e) {
            return String.valueOf(origins.hashCode() ^ destinations.hashCode());
        }
    }
}
