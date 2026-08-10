package com.smartroute.service.places;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;

/**
 * @deprecated Replaced by {@link OsmPlacesProvider}.
 * Kept for reference; NOT registered as a Spring bean.
 */
// @Service  — disabled; OsmPlacesProvider is the active provider
public class GooglePlacesProvider {

    private static final Logger log = LoggerFactory.getLogger(GooglePlacesProvider.class);
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${google.api.key}")
    private String apiKey;

    @Value("${google.api.mapsBaseUrl}")
    private String mapsBaseUrl;

    public GooglePlacesProvider(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
                .version(java.net.http.HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory(httpClient))
                .build();
    }

    public List<GooglePlaceResult> searchNearby(double lat, double lng, int radius, String type) {
        String url = mapsBaseUrl + "/maps/api/place/nearbysearch/json?location={location}&radius={radius}&type={type}&key={key}";
        String locationStr = lat + "," + lng;
        List<GooglePlaceResult> results = new ArrayList<>();

        try {
            JsonNode response = restClient.get()
                    .uri(url, locationStr, radius, type, apiKey)
                    .retrieve()
                    .body(JsonNode.class);

            if (response != null && "OK".equals(response.get("status").asText())) {
                JsonNode resultsNode = response.get("results");
                if (resultsNode != null && resultsNode.isArray()) {
                    for (JsonNode node : resultsNode) {
                        GooglePlaceResult item = new GooglePlaceResult();
                        item.setPlaceId(node.get("place_id").asText());
                        item.setName(node.get("name").asText());
                        item.setVicinity(node.has("vicinity") ? node.get("vicinity").asText() : "");
                        
                        JsonNode loc = node.get("geometry").get("location");
                        item.setLat(loc.get("lat").asDouble());
                        item.setLng(loc.get("lng").asDouble());
                        
                        if (node.has("rating")) {
                            item.setRating(node.get("rating").asDouble());
                        }
                        if (node.has("user_ratings_total")) {
                            item.setUserRatingsTotal(node.get("user_ratings_total").asInt());
                        }
                        results.add(item);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Google Places Nearby Search error: ", e);
        }

        return results;
    }

    public List<GooglePlaceResult> textSearch(String query) {
        String url = mapsBaseUrl + "/maps/api/place/textsearch/json?query={query}&key={key}";
        List<GooglePlaceResult> results = new ArrayList<>();

        try {
            JsonNode response = restClient.get()
                    .uri(url, query, apiKey)
                    .retrieve()
                    .body(JsonNode.class);

            if (response != null && "OK".equals(response.get("status").asText())) {
                JsonNode resultsNode = response.get("results");
                if (resultsNode != null && resultsNode.isArray()) {
                    for (JsonNode node : resultsNode) {
                        GooglePlaceResult item = new GooglePlaceResult();
                        item.setPlaceId(node.get("place_id").asText());
                        item.setName(node.get("name").asText());
                        item.setVicinity(node.has("formatted_address") ? node.get("formatted_address").asText() : "");
                        
                        JsonNode loc = node.get("geometry").get("location");
                        item.setLat(loc.get("lat").asDouble());
                        item.setLng(loc.get("lng").asDouble());
                        
                        if (node.has("rating")) {
                            item.setRating(node.get("rating").asDouble());
                        }
                        if (node.has("user_ratings_total")) {
                            item.setUserRatingsTotal(node.get("user_ratings_total").asInt());
                        }
                        results.add(item);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Google Places Text Search error: ", e);
        }

        return results;
    }

    public String reverseGeocode(double lat, double lng) {
        String url = mapsBaseUrl + "/maps/api/geocode/json?latlng={latlng}&key={key}";
        String latlngStr = lat + "," + lng;
        try {
            JsonNode response = restClient.get()
                    .uri(url, latlngStr, apiKey)
                    .retrieve()
                    .body(JsonNode.class);

            if (response != null && "OK".equals(response.get("status").asText())) {
                JsonNode resultsNode = response.get("results");
                if (resultsNode != null && resultsNode.isArray() && resultsNode.size() > 0) {
                    return resultsNode.get(0).get("formatted_address").asText();
                }
            }
        } catch (Exception e) {
            log.error("Google Geocoding error: ", e);
        }
        return "Unknown Location";
    }
}
