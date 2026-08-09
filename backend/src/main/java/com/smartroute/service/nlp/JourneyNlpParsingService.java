package com.smartroute.service.nlp;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartroute.domain.User;
import com.smartroute.domain.UserNlpUsage;
import com.smartroute.dto.JourneyRequest;
import com.smartroute.dto.JourneyStopRequest;
import com.smartroute.exception.RateLimitExceededException;
import com.smartroute.repository.UserNlpUsageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class JourneyNlpParsingService {

    private static final Logger log = LoggerFactory.getLogger(JourneyNlpParsingService.class);
    private static final int DAILY_LIMIT = 30;

    private final UserNlpUsageRepository userNlpUsageRepository;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${anthropic.api.key}")
    private String anthropicApiKey;

    @Value("${anthropic.api.baseUrl}")
    private String anthropicBaseUrl;

    @Value("${google.api.key}")
    private String googleApiKey;

    @Value("${google.api.mapsBaseUrl}")
    private String googleMapsBaseUrl;

    public JourneyNlpParsingService(UserNlpUsageRepository userNlpUsageRepository, ObjectMapper objectMapper) {
        this.userNlpUsageRepository = userNlpUsageRepository;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory())
                .build();
    }

    @Transactional
    public JourneyRequest parseAndGeocode(String text, User user) {
        // 1. Enforce Rate Limiting
        checkAndIncrementRateLimit(user);

        // 2. Call Anthropic Claude API to parse natural language to structured JSON
        String rawJson = callClaudeNlpParser(text);

        // 3. Map LLM JSON output to DTO
        JourneyRequest parsedRequest = parseLlmJson(rawJson);

        // 4. Geocode each stop and start location
        geocodeJourneyRequest(parsedRequest);

        return parsedRequest;
    }

    private void checkAndIncrementRateLimit(User user) {
        LocalDate today = LocalDate.now();
        UserNlpUsage usage = userNlpUsageRepository.findByUserAndUsageDate(user, today)
                .orElseGet(() -> new UserNlpUsage(user, today, 0));

        if (usage.getUsageCount() >= DAILY_LIMIT) {
            throw new RateLimitExceededException("Günlük doğal dil işleme limitinizi (" + DAILY_LIMIT + ") aştınız.");
        }

        usage.setUsageCount(usage.getUsageCount() + 1);
        userNlpUsageRepository.save(usage);
    }

    private String callClaudeNlpParser(String text) {
        String url = anthropicBaseUrl + "/v1/messages";
        String currentDateStr = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        String systemPrompt = "Sen bir yolculuk planlama asistanısın. Kullanıcının serbest metnini, aşağıdaki JSON şemasına uyan yapılandırılmış bir yolculuk planına çevir.\n" +
                "- Adları geocode ETME (sadece metin olarak bırak, \"placeNameRaw\" alanına yaz; gerçek koordinat çözümlemesi ayrı bir Geocoding adımında yapılacak).\n" +
                "- Zaman ifadelerini ISO 8601'e çevir (bugünün tarihini kullan: " + currentDateStr + ").\n" +
                "- Eğer zaman ifadesi belirsiz ise (örneğin 'akşamüstü'), 17:00-19:00 gibi mantıklı bir varsayılan aralık ata.\n" +
                "- Belirtilmeyen alanlar için varsayım YAPMA, null bırak.\n" +
                "- Sadece JSON döndür, başka hiçbir metin ekleme.\n\n" +
                "Şema:\n" +
                "{\n" +
                "  \"startAddressText\": \"string veya null\",\n" +
                "  \"plannedDepartureTime\": \"YYYY-MM-DDTHH:mm:ss formatında string veya null\",\n" +
                "  \"deadlineTime\": \"YYYY-MM-DDTHH:mm:ss formatında string veya null\",\n" +
                "  \"stops\": [\n" +
                "    {\n" +
                "      \"placeNameRaw\": \"durağın adı/adresi (string)\",\n" +
                "      \"visitDurationMinutes\": integer veya null (durak ziyaret süresi),\n" +
                "      \"timeWindowStart\": \"YYYY-MM-DDTHH:mm:ss formatında string veya null\",\n" +
                "      \"timeWindowEnd\": \"YYYY-MM-DDTHH:mm:ss formatında string veya null\",\n" +
                "      \"priority\": \"critical\", \"high\", \"normal\", \"low\" veya null,\n" +
                "      \"stopType\": \"errand\", \"meeting\", \"poi\", \"parking\", \"pickup\" veya null\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        Map<String, Object> requestBody = Map.of(
                "model", "claude-3-5-sonnet-20240620",
                "max_tokens", 1500,
                "system", systemPrompt,
                "messages", List.of(Map.of("role", "user", "content", text))
        );

        try {
            JsonNode response = restClient.post()
                    .uri(url)
                    .header("x-api-key", anthropicApiKey)
                    .header("anthropic-version", "2023-06-01")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);

            if (response != null && response.has("content")) {
                JsonNode contentArray = response.get("content");
                if (contentArray.isArray() && contentArray.size() > 0) {
                    String rawText = contentArray.get(0).get("text").asText();
                    return extractJson(rawText);
                }
            }
            throw new RuntimeException("Claude API'den geçerli içerik alınamadı.");
        } catch (Exception e) {
            log.error("Claude API çağrısı sırasında hata oluştu: ", e);
            throw new RuntimeException("Doğal dil işleme servisine şu an erişilemiyor. Lütfen manuel ekleme yapın.", e);
        }
    }

    private String extractJson(String text) {
        if (text == null) return null;
        text = text.trim();
        if (text.startsWith("```")) {
            int firstNewLine = text.indexOf('\n');
            int lastTicks = text.lastIndexOf("```");
            if (firstNewLine != -1 && lastTicks > firstNewLine) {
                text = text.substring(firstNewLine + 1, lastTicks).trim();
            }
        }
        int firstBrace = text.indexOf('{');
        int lastBrace = text.lastIndexOf('}');
        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            text = text.substring(firstBrace, lastBrace + 1);
        }
        return text;
    }

    private JourneyRequest parseLlmJson(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JourneyRequest request = new JourneyRequest();

            if (root.has("startAddressText") && !root.get("startAddressText").isNull()) {
                request.setStartAddressText(root.get("startAddressText").asText());
            }

            if (root.has("plannedDepartureTime") && !root.get("plannedDepartureTime").isNull()) {
                request.setPlannedDepartureTime(LocalDateTime.parse(root.get("plannedDepartureTime").asText()));
            }

            if (root.has("deadlineTime") && !root.get("deadlineTime").isNull()) {
                request.setDeadlineTime(LocalDateTime.parse(root.get("deadlineTime").asText()));
            }

            List<JourneyStopRequest> stops = new ArrayList<>();
            if (root.has("stops") && root.get("stops").isArray()) {
                for (JsonNode stopNode : root.get("stops")) {
                    JourneyStopRequest stop = new JourneyStopRequest();
                    if (stopNode.has("placeNameRaw") && !stopNode.get("placeNameRaw").isNull()) {
                        stop.setPlaceName(stopNode.get("placeNameRaw").asText());
                    } else if (stopNode.has("placeName") && !stopNode.get("placeName").isNull()) {
                        stop.setPlaceName(stopNode.get("placeName").asText());
                    }

                    if (stopNode.has("visitDurationMinutes") && !stopNode.get("visitDurationMinutes").isNull()) {
                        stop.setVisitDurationMinutes(stopNode.get("visitDurationMinutes").asInt());
                    } else {
                        stop.setVisitDurationMinutes(15);
                    }

                    if (stopNode.has("timeWindowStart") && !stopNode.get("timeWindowStart").isNull()) {
                        stop.setTimeWindowStart(LocalDateTime.parse(stopNode.get("timeWindowStart").asText()));
                    }

                    if (stopNode.has("timeWindowEnd") && !stopNode.get("timeWindowEnd").isNull()) {
                        stop.setTimeWindowEnd(LocalDateTime.parse(stopNode.get("timeWindowEnd").asText()));
                    }

                    if (stopNode.has("priority") && !stopNode.get("priority").isNull()) {
                        stop.setPriority(stopNode.get("priority").asText());
                    } else {
                        stop.setPriority("normal");
                    }

                    if (stopNode.has("stopType") && !stopNode.get("stopType").isNull()) {
                        stop.setStopType(stopNode.get("stopType").asText());
                    } else {
                        stop.setStopType("errand");
                    }

                    stops.add(stop);
                }
            }
            request.setStops(stops);
            return request;
        } catch (JsonProcessingException e) {
            log.error("Claude JSON çıktısı parse edilemedi: " + json, e);
            throw new RuntimeException("Doğal dil çıktısı işlenemedi. Lütfen manuel form ile devam edin.", e);
        } catch (Exception e) {
            log.error("LLM parser mapping hatası: ", e);
            throw new RuntimeException("Doğal dil çıktısı dönüştürülürken hata oluştu.", e);
        }
    }

    private void geocodeJourneyRequest(JourneyRequest request) {
        // Geocode startAddressText if present
        if (request.getStartAddressText() != null && !request.getStartAddressText().isBlank()) {
            Map<String, Double> coords = callGeocodingApi(request.getStartAddressText());
            if (coords != null) {
                request.setStartLat(coords.get("lat"));
                request.setStartLng(coords.get("lng"));
            }
        }

        // Geocode stops
        if (request.getStops() != null) {
            for (JourneyStopRequest stop : request.getStops()) {
                if (stop.getPlaceName() != null && !stop.getPlaceName().isBlank()) {
                    Map<String, Double> coords = callGeocodingApi(stop.getPlaceName());
                    if (coords != null) {
                        stop.setLat(coords.get("lat"));
                        stop.setLng(coords.get("lng"));
                    }
                }
            }
        }
    }

    private Map<String, Double> callGeocodingApi(String address) {
        String url = googleMapsBaseUrl + "/maps/api/geocode/json?address={address}&key={key}";
        try {
            JsonNode response = restClient.get()
                    .uri(url, address, googleApiKey)
                    .retrieve()
                    .body(JsonNode.class);

            if (response != null && "OK".equals(response.get("status").asText())) {
                JsonNode results = response.get("results");
                if (results.isArray() && results.size() > 0) {
                    JsonNode location = results.get(0).get("geometry").get("location");
                    double lat = location.get("lat").asDouble();
                    double lng = location.get("lng").asDouble();
                    return Map.of("lat", lat, "lng", lng);
                }
            }
        } catch (Exception e) {
            log.error("Geocoding hatası (" + address + "): ", e);
        }
        return null; // Return null if not geocoded (will remain null for user resolution)
    }
}
