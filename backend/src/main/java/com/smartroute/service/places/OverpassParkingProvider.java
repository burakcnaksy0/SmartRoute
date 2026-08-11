package com.smartroute.service.places;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartroute.service.routing.GeoPoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Service
@ConditionalOnProperty(name = "providers.parking", havingValue = "overpass", matchIfMissing = true)
public class OverpassParkingProvider implements ParkingProvider {

    private static final Logger log = LoggerFactory.getLogger(OverpassParkingProvider.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @Value("${osm.overpass.url:https://overpass-api.de/api/interpreter}")
    private String overpassUrl;

    @Value("${osm.userAgent:SmartRoute/1.0}")
    private String userAgent;

    public OverpassParkingProvider(ObjectMapper objectMapper, StringRedisTemplate redisTemplate) {
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
    public List<ParkingResult> findNearby(GeoPoint location, int radiusMeters) {
        if (location == null) {
            return Collections.emptyList();
        }

        // Round coordinates to 4 decimal places for caching key
        double latRounded = Math.round(location.getLat() * 10000.0) / 10000.0;
        double lonRounded = Math.round(location.getLng() * 10000.0) / 10000.0;
        String cacheKey = String.format(Locale.US, "parking:%.4f:%.4f:%d", latRounded, lonRounded, radiusMeters);

        try {
            String cachedValue = redisTemplate.opsForValue().get(cacheKey);
            if (cachedValue != null) {
                log.info("Parking search cache hit for: {}, {} (radius: {})", latRounded, lonRounded, radiusMeters);
                return objectMapper.readValue(cachedValue, objectMapper.getTypeFactory().constructCollectionType(List.class, ParkingResult.class));
            }
        } catch (Exception e) {
            log.warn("Redis read error for parking options: ", e);
        }

        String query = String.format(Locale.US,
                "[out:json][timeout:15];\n" +
                "(\n" +
                "  node[\"amenity\"=\"parking\"](around:%d,%.6f,%.6f);\n" +
                "  way[\"amenity\"=\"parking\"](around:%d,%.6f,%.6f);\n" +
                ");\n" +
                "out center 30;",
                radiusMeters, location.getLat(), location.getLng(),
                radiusMeters, location.getLat(), location.getLng()
        );

        List<ParkingResult> results = new ArrayList<>();
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(overpassUrl)
                    .queryParam("data", query)
                    .build()
                    .toUri();

            String responseBody = restClient.get()
                    .uri(uri)
                    .header("User-Agent", userAgent)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode elements = root.path("elements");

            if (elements.isArray()) {
                for (JsonNode element : elements) {
                    double elemLat, elemLng;
                    if (element.has("lat")) {
                        elemLat = element.get("lat").asDouble();
                        elemLng = element.get("lon").asDouble();
                    } else if (element.has("center")) {
                        elemLat = element.path("center").path("lat").asDouble();
                        elemLng = element.path("center").path("lon").asDouble();
                    } else {
                        continue;
                    }

                    JsonNode tags = element.path("tags");
                    String name = tags.path("name").asText("");
                    if (name.isBlank()) {
                        name = "Parking Lot #" + element.path("id").asText();
                    }

                    // Parse fee tag: "yes", "no", "interval", etc.
                    Boolean fee = null;
                    if (tags.has("fee")) {
                        String feeTag = tags.get("fee").asText().toLowerCase(Locale.ROOT).trim();
                        if ("yes".equals(feeTag) || "paid".equals(feeTag)) {
                            fee = true;
                        } else if ("no".equals(feeTag) || "free".equals(feeTag)) {
                            fee = false;
                        }
                    }

                    // Parse capacity tag
                    Integer capacity = null;
                    if (tags.has("capacity")) {
                        try {
                            capacity = Integer.parseInt(tags.get("capacity").asText().trim());
                        } catch (NumberFormatException ignored) {
                        }
                    }

                    // Access tag: "public", "private", "customers", etc.
                    String access = tags.has("access") ? tags.get("access").asText().toLowerCase(Locale.ROOT).trim() : null;

                    double dist = haversineDistance(location.getLat(), location.getLng(), elemLat, elemLng);

                    results.add(new ParkingResult(
                            "osm:" + element.path("type").asText() + ":" + element.path("id").asText(),
                            name,
                            elemLat,
                            elemLng,
                            (int) dist,
                            capacity,
                            fee,
                            access
                    ));
                }
            }

            // Cache for 1 hour
            try {
                redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(results), Duration.ofHours(1));
            } catch (Exception e) {
                log.warn("Redis write error for parking search: ", e);
            }

        } catch (Exception e) {
            log.error("Overpass parking query error: ", e);
        }

        return results;
    }

    private static double haversineDistance(double lat1, double lng1, double lat2, double lng2) {
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
}
