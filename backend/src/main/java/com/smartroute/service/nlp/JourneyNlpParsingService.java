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
    private final LlmProvider llmProvider;
    private final com.smartroute.service.places.OsmPlacesProvider osmPlacesProvider;

    public JourneyNlpParsingService(
            UserNlpUsageRepository userNlpUsageRepository,
            ObjectMapper objectMapper,
            LlmProvider llmProvider,
            com.smartroute.service.places.OsmPlacesProvider osmPlacesProvider) {
        this.userNlpUsageRepository = userNlpUsageRepository;
        this.objectMapper = objectMapper;
        this.llmProvider = llmProvider;
        this.osmPlacesProvider = osmPlacesProvider;
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory())
                .build();
    }

    @Transactional
    public JourneyRequest parseAndGeocode(String text, User user) {
        // 1. Enforce Rate Limiting
        checkAndIncrementRateLimit(user);

        // 2. Call LLM API to parse natural language to structured JSON
        String rawJson = callLlmNlpParser(text);

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

    private String callLlmNlpParser(String text) {
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

        try {
            String rawText = llmProvider.generate(systemPrompt, text);
            return extractJson(rawText);
        } catch (Exception e) {
            log.error("LLM API çağrısı sırasında hata oluştu: ", e);
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
            log.error("LLM JSON çıktısı parse edilemedi: " + json, e);
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
        double[] coords = osmPlacesProvider.geocode(address);
        if (coords != null) {
            return Map.of("lat", coords[0], "lng", coords[1]);
        }
        return null; // Return null if not geocoded (will remain null for user resolution)
    }
}
