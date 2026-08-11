package com.smartroute.service.places;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/**
 * OpenStreetMap-based places provider — replaces GooglePlacesProvider.
 *
 * - Nearby search  → Overpass API  (https://overpass-api.de/api/interpreter)
 * - Text search    → Nominatim     (https://nominatim.openstreetmap.org/search)
 * - Reverse geocode→ Nominatim     (https://nominatim.openstreetmap.org/reverse)
 *
 * OSM amenity type mapping (subset):
 *   parking → amenity=parking
 *   restaurant → amenity=restaurant
 *   fuel → amenity=fuel
 *   hospital → amenity=hospital
 *   pharmacy → amenity=pharmacy
 *   supermarket → shop=supermarket
 *
 * Nominatim usage policy: max 1 request/second, set a valid User-Agent.
 */
@Service
public class OsmPlacesProvider {

    private static final Logger log = LoggerFactory.getLogger(OsmPlacesProvider.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${osm.overpass.url:https://overpass-api.de/api/interpreter}")
    private String overpassUrl;

    @Value("${osm.nominatim.url:https://nominatim.openstreetmap.org}")
    private String nominatimUrl;

    @Value("${osm.nominatim.userAgent:SmartRoute/1.0 (contact@smartroute.app)}")
    private String userAgent;

    public OsmPlacesProvider(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
                .version(java.net.http.HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory(httpClient))
                .build();
    }

    // ── Nearby Search (Overpass API) ──────────────────────────────────────────

    /**
     * Searches for POIs near (lat, lng) within radius meters, filtered by OSM type string.
     * type examples: "parking", "restaurant", "fuel", "hospital", "pharmacy", "supermarket"
     */
    public List<GooglePlaceResult> searchNearby(double lat, double lng, int radius, String type) {
        String overpassQuery = buildOverpassQuery(lat, lng, radius, type);
        List<GooglePlaceResult> results = new ArrayList<>();

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(overpassUrl)
                    .queryParam("data", overpassQuery)
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
                    GooglePlaceResult item = new GooglePlaceResult();

                    // Overpass returns either node (lat/lon directly) or way/relation (center)
                    double elemLat, elemLng;
                    if (element.has("lat")) {
                        elemLat = element.get("lat").asDouble();
                        elemLng = element.get("lon").asDouble();
                    } else if (element.has("center")) {
                        elemLat = element.path("center").path("lat").asDouble();
                        elemLng = element.path("center").path("lon").asDouble();
                    } else {
                        continue; // skip elements without location
                    }

                    JsonNode tags = element.path("tags");
                    String name = tags.path("name").asText("");
                    if (name.isBlank()) name = type + " #" + element.path("id").asText();

                    item.setPlaceId("osm:" + element.path("type").asText() + ":" + element.path("id").asText());
                    item.setName(name);
                    item.setVicinity(tags.path("addr:street").asText("") + " " + tags.path("addr:housenumber").asText(""));
                    item.setLat(elemLat);
                    item.setLng(elemLng);
                    item.setRating(0.0);
                    item.setUserRatingsTotal(0);

                    results.add(item);
                    if (results.size() >= 20) break; // Limit to 20 results
                }
            }
        } catch (Exception e) {
            log.error("Overpass API nearby search error (type={}): ", type, e);
        }

        return results;
    }

    // ── Text Search (Nominatim) ───────────────────────────────────────────────

    public List<GooglePlaceResult> textSearch(String query) {
        List<GooglePlaceResult> results = new ArrayList<>();

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(nominatimUrl + "/search")
                    .queryParam("q", query)
                    .queryParam("format", "json")
                    .queryParam("limit", "10")
                    .queryParam("addressdetails", "1")
                    .build()
                    .toUri();

            String responseBody = restClient.get()
                    .uri(uri)
                    .header("User-Agent", userAgent)
                    .header("Accept-Language", "tr,en")
                    .retrieve()
                    .body(String.class);

            JsonNode arr = objectMapper.readTree(responseBody);

            if (arr.isArray()) {
                for (JsonNode node : arr) {
                    GooglePlaceResult item = new GooglePlaceResult();
                    item.setPlaceId("nominatim:" + node.path("place_id").asText());
                    item.setName(node.path("display_name").asText());
                    item.setVicinity(node.path("display_name").asText());
                    item.setLat(node.path("lat").asDouble());
                    item.setLng(node.path("lon").asDouble());
                    item.setRating(0.0);
                    item.setUserRatingsTotal(0);
                    results.add(item);
                }
            }
        } catch (Exception e) {
            log.error("Nominatim text search error (query={}): ", query, e);
        }

        return results;
    }

    // ── Reverse Geocode (Nominatim) ───────────────────────────────────────────

    public String reverseGeocode(double lat, double lng) {
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(nominatimUrl + "/reverse")
                    .queryParam("lat", lat)
                    .queryParam("lon", lng)
                    .queryParam("format", "json")
                    .build()
                    .toUri();

            String responseBody = restClient.get()
                    .uri(uri)
                    .header("User-Agent", userAgent)
                    .header("Accept-Language", "tr,en")
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            String displayName = root.path("display_name").asText();
            if (!displayName.isBlank()) return displayName;
        } catch (Exception e) {
            log.error("Nominatim reverse geocode error ({}, {}): ", lat, lng, e);
        }
        return "Unknown Location";
    }

    // ── Geocode (Nominatim) ───────────────────────────────────────────────────

    /**
     * Forward geocodes an address string to lat/lng.
     * Returns null if not found.
     */
    public double[] geocode(String address) {
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(nominatimUrl + "/search")
                    .queryParam("q", address)
                    .queryParam("format", "json")
                    .queryParam("limit", "1")
                    .build()
                    .toUri();

            String responseBody = restClient.get()
                    .uri(uri)
                    .header("User-Agent", userAgent)
                    .header("Accept-Language", "tr,en")
                    .retrieve()
                    .body(String.class);

            JsonNode arr = objectMapper.readTree(responseBody);
            if (arr.isArray() && arr.size() > 0) {
                JsonNode first = arr.get(0);
                double lat = first.path("lat").asDouble();
                double lon = first.path("lon").asDouble();
                return new double[]{lat, lon};
            }
        } catch (Exception e) {
            log.error("Nominatim geocode error (address={}): ", address, e);
        }
        return null;
    }

    // ── Overpass Query Builder ────────────────────────────────────────────────

    private String buildOverpassQuery(double lat, double lng, int radius, String type) {
        // Map Google Places types to OSM tag queries
        String osmFilter = switch (type.toLowerCase()) {
            case "parking"      -> "node[\"amenity\"=\"parking\"](around:{radius},{lat},{lng});\n" +
                                   "way[\"amenity\"=\"parking\"](around:{radius},{lat},{lng});";
            case "restaurant"   -> "node[\"amenity\"=\"restaurant\"](around:{radius},{lat},{lng});";
            case "fuel"         -> "node[\"amenity\"=\"fuel\"](around:{radius},{lat},{lng});";
            case "hospital"     -> "node[\"amenity\"~\"hospital|clinic\"](around:{radius},{lat},{lng});\n" +
                                   "way[\"amenity\"~\"hospital|clinic\"](around:{radius},{lat},{lng});";
            case "pharmacy"     -> "node[\"amenity\"=\"pharmacy\"](around:{radius},{lat},{lng});";
            case "supermarket"  -> "node[\"shop\"=\"supermarket\"](around:{radius},{lat},{lng});\n" +
                                   "way[\"shop\"=\"supermarket\"](around:{radius},{lat},{lng});";
            case "cafe"         -> "node[\"amenity\"=\"cafe\"](around:{radius},{lat},{lng});";
            case "atm"          -> "node[\"amenity\"=\"atm\"](around:{radius},{lat},{lng});";
            default             -> "node[\"amenity\"=\"" + type + "\"](around:{radius},{lat},{lng});";
        };

        osmFilter = osmFilter
                .replace("{radius}", String.valueOf(radius))
                .replace("{lat}", String.valueOf(lat))
                .replace("{lng}", String.valueOf(lng));

        return "[out:json][timeout:10];\n(" + osmFilter + "\n);\nout center 20;";
    }
}
