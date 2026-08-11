package com.smartroute.service.places;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
@ConditionalOnProperty(name = "providers.geocoding", havingValue = "geoapify", matchIfMissing = true)
public class GeoapifyGeocodingProvider implements GeocodingProvider {

    private static final Logger log = LoggerFactory.getLogger(GeoapifyGeocodingProvider.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @Value("${geocoding.geoapify.base-url:https://api.geoapify.com}")
    private String baseUrl;

    @Value("${geocoding.geoapify.api-key:YOUR_GEOAPIFY_API_KEY_HERE}")
    private String apiKey;

    public GeoapifyGeocodingProvider(ObjectMapper objectMapper, StringRedisTemplate redisTemplate) {
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
    public List<LocationResult> search(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String cacheKey = "geocode:" + query.trim().toLowerCase(Locale.ROOT);
        try {
            String cachedValue = redisTemplate.opsForValue().get(cacheKey);
            if (cachedValue != null) {
                log.info("Geocoding cache hit for query: {}", query);
                return objectMapper.readValue(cachedValue, objectMapper.getTypeFactory().constructCollectionType(List.class, LocationResult.class));
            }
        } catch (Exception e) {
            log.warn("Redis read error for geocode search: ", e);
        }

        List<LocationResult> results = new ArrayList<>();
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(baseUrl + "/v1/geocode/search")
                    .queryParam("text", query)
                    .queryParam("apiKey", apiKey)
                    .queryParam("limit", "10")
                    .queryParam("lang", "tr")
                    .build()
                    .toUri();

            String responseBody = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode features = root.path("features");

            if (features.isArray()) {
                for (JsonNode feature : features) {
                    JsonNode properties = feature.path("properties");
                    String name = properties.path("name").asText(properties.path("formatted").asText(""));
                    double lat = properties.path("lat").asDouble();
                    double lon = properties.path("lon").asDouble();
                    String formatted = properties.path("formatted").asText("");

                    results.add(new LocationResult(name, lat, lon, formatted));
                }
            }

            // Cache results for 24 hours
            try {
                redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(results), Duration.ofHours(24));
            } catch (Exception e) {
                log.warn("Redis write error for geocode search: ", e);
            }

        } catch (Exception e) {
            log.error("Geoapify forward geocoding error (query={}): ", query, e);
        }

        return results;
    }

    @Override
    public LocationResult reverseGeocode(double latitude, double longitude) {
        // Round coordinates to 4 decimal places
        double latRounded = Math.round(latitude * 10000.0) / 10000.0;
        double lonRounded = Math.round(longitude * 10000.0) / 10000.0;
        String cacheKey = String.format(Locale.US, "reverse-geocode:%.4f:%.4f", latRounded, lonRounded);

        try {
            String cachedValue = redisTemplate.opsForValue().get(cacheKey);
            if (cachedValue != null) {
                log.info("Reverse geocoding cache hit for coordinates: {}, {}", latRounded, lonRounded);
                return objectMapper.readValue(cachedValue, LocationResult.class);
            }
        } catch (Exception e) {
            log.warn("Redis read error for reverse geocode: ", e);
        }

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(baseUrl + "/v1/geocode/reverse")
                    .queryParam("lat", latitude)
                    .queryParam("lon", longitude)
                    .queryParam("apiKey", apiKey)
                    .queryParam("lang", "tr")
                    .build()
                    .toUri();

            String responseBody = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode features = root.path("features");

            if (features.isArray() && features.size() > 0) {
                JsonNode properties = features.get(0).path("properties");
                String name = properties.path("name").asText(properties.path("formatted").asText(""));
                double lat = properties.path("lat").asDouble();
                double lon = properties.path("lon").asDouble();
                String formatted = properties.path("formatted").asText("");

                LocationResult result = new LocationResult(name, lat, lon, formatted);

                // Cache result for 24 hours
                try {
                    redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result), Duration.ofHours(24));
                } catch (Exception e) {
                    log.warn("Redis write error for reverse geocode: ", e);
                }

                return result;
            }
        } catch (Exception e) {
            log.error("Geoapify reverse geocoding error ({}, {}): ", latitude, longitude, e);
        }

        return new LocationResult("Unknown Location", latitude, longitude, "Unknown Location");
    }
}
