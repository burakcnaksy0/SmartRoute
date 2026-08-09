package com.smartroute.service.nlp;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.smartroute.domain.User;
import com.smartroute.domain.UserNlpUsage;
import com.smartroute.dto.JourneyRequest;
import com.smartroute.exception.RateLimitExceededException;
import com.smartroute.repository.UserNlpUsageRepository;
import com.smartroute.repository.UserRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class JourneyNlpParsingServiceTest {

    private static WireMockServer wireMockServer;

    @Autowired
    private JourneyNlpParsingService journeyNlpParsingService;

    @Autowired
    private UserNlpUsageRepository userNlpUsageRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeAll
    static void startWireMock() {
        wireMockServer = new WireMockServer(0);
        wireMockServer.start();
    }

    @AfterAll
    static void stopWireMock() {
        if (wireMockServer != null) {
            wireMockServer.stop();
        }
    }

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("anthropic.api.baseUrl", () -> "http://localhost:" + wireMockServer.port());
        registry.add("anthropic.api.key", () -> "test-anthropic-key");
        registry.add("google.api.mapsBaseUrl", () -> "http://localhost:" + wireMockServer.port());
        registry.add("google.api.key", () -> "test-google-key");
    }

    @BeforeEach
    void setUp() {
        wireMockServer.resetAll();
        userNlpUsageRepository.deleteAll();

        testUser = new User();
        testUser.setEmail("nlp_test@example.com");
        testUser.setPasswordHash("hash");
        testUser.setFullName("NLP Test User");
        testUser = userRepository.save(testUser);
    }

    @Test
    void parseAndGeocode_success() {
        // Mock Claude response
        String claudeResponse = "{\n" +
                "  \"content\": [\n" +
                "    {\n" +
                "      \"type\": \"text\",\n" +
                "      \"text\": \"{\\n  \\\"startAddressText\\\": \\\"Kadikoy\\\",\\n  \\\"plannedDepartureTime\\\": \\\"2026-08-08T12:00:00\\\",\\n  \\\"stops\\\": [\\n    {\\n      \\\"placeNameRaw\\\": \\\"Gebze Center\\\",\\n      \\\"visitDurationMinutes\\\": 60,\\n      \\\"priority\\\": \\\"high\\\",\\n      \\\"stopType\\\": \\\"poi\\\"\\n    }\\n  ]\\n}\"\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        wireMockServer.stubFor(post(urlEqualTo("/v1/messages"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(claudeResponse)));

        // Mock Geocoding response for Kadikoy
        String geocodeKadikoy = "{\n" +
                "  \"status\": \"OK\",\n" +
                "  \"results\": [\n" +
                "    {\n" +
                "      \"formatted_address\": \"Kadıköy, Istanbul, Turkey\",\n" +
                "      \"geometry\": {\n" +
                "        \"location\": {\n" +
                "          \"lat\": 40.9909,\n" +
                "          \"lng\": 29.0303\n" +
                "        }\n" +
                "      }\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        wireMockServer.stubFor(get(urlPathEqualTo("/maps/api/geocode/json"))
                .withQueryParam("address", equalTo("Kadikoy"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(geocodeKadikoy)));

        // Mock Geocoding response for Gebze Center
        String geocodeGebze = "{\n" +
                "  \"status\": \"OK\",\n" +
                "  \"results\": [\n" +
                "    {\n" +
                "      \"formatted_address\": \"Gebze Center, Kocaeli, Turkey\",\n" +
                "      \"geometry\": {\n" +
                "        \"location\": {\n" +
                "          \"lat\": 40.7989,\n" +
                "          \"lng\": 29.4123\n" +
                "        }\n" +
                "      }\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        wireMockServer.stubFor(get(urlPathEqualTo("/maps/api/geocode/json"))
                .withQueryParam("address", equalTo("Gebze Center"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(geocodeGebze)));

        JourneyRequest request = journeyNlpParsingService.parseAndGeocode("Kadıköy'den çıkıp Gebze Center'a gitmek istiyorum.", testUser);

        assertNotNull(request);
        assertEquals("Kadikoy", request.getStartAddressText());
        assertEquals(40.9909, request.getStartLat());
        assertEquals(29.0303, request.getStartLng());
        assertEquals(1, request.getStops().size());
        assertEquals("Gebze Center", request.getStops().get(0).getPlaceName());
        assertEquals(40.7989, request.getStops().get(0).getLat());
        assertEquals(29.4123, request.getStops().get(0).getLng());
        assertEquals(60, request.getStops().get(0).getVisitDurationMinutes());
    }

    @Test
    void parseAndGeocode_rateLimitExceeded() {
        // Set count to 30 for today
        UserNlpUsage usage = new UserNlpUsage(testUser, LocalDate.now(), 30);
        userNlpUsageRepository.save(usage);

        assertThrows(RateLimitExceededException.class, () ->
                journeyNlpParsingService.parseAndGeocode("some text", testUser)
        );
    }

    @Test
    void parseAndGeocode_invalidLlmJson() {
        // Claude returns invalid text structure
        String claudeInvalidResponse = "{\n" +
                "  \"content\": [\n" +
                "    {\n" +
                "      \"type\": \"text\",\n" +
                "      \"text\": \"Bu bir JSON değil, hata verecek metin.\"\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        wireMockServer.stubFor(post(urlEqualTo("/v1/messages"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(claudeInvalidResponse)));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                journeyNlpParsingService.parseAndGeocode("some text", testUser)
        );
        assertTrue(ex.getMessage().contains("işlenemedi") || ex.getMessage().contains("manuel"));
    }

    @Test
    void parseAndGeocode_llmApiTimeoutOrError() {
        wireMockServer.stubFor(post(urlEqualTo("/v1/messages"))
                .willReturn(aResponse()
                        .withStatus(500)));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                journeyNlpParsingService.parseAndGeocode("some text", testUser)
        );
        assertTrue(ex.getMessage().contains("erişilemiyor") || ex.getMessage().contains("manuel"));
    }
}
