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

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
@Transactional
class JourneyNlpParsingServiceTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.4-alpine").asCompatibleSubstituteFor("postgres")
    );

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
        registry.add("huggingface.api.baseUrl", () -> "http://localhost:" + wireMockServer.port());
        registry.add("huggingface.api.key", () -> "test-hf-key");
        registry.add("huggingface.api.model", () -> "meta-llama/Llama-3.1-8B-Instruct");
        // Point Nominatim to WireMock for geocoding
        registry.add("osm.nominatim.url", () -> "http://localhost:" + wireMockServer.port());
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
        // Mock Hugging Face response
        String hfResponse = "{\n" +
                "  \"choices\": [\n" +
                "    {\n" +
                "      \"message\": {\n" +
                "        \"role\": \"assistant\",\n" +
                "        \"content\": \"{\\n  \\\"startAddressText\\\": \\\"Kadikoy\\\",\\n  \\\"plannedDepartureTime\\\": \\\"2026-08-08T12:00:00\\\",\\n  \\\"stops\\\": [\\n    {\\n      \\\"placeNameRaw\\\": \\\"Gebze Center\\\",\\n      \\\"visitDurationMinutes\\\": 60,\\n      \\\"priority\\\": \\\"high\\\",\\n      \\\"stopType\\\": \\\"poi\\\"\\n    }\\n  ]\\n}\"\n" +
                "      }\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        wireMockServer.stubFor(post(urlEqualTo("/v1/chat/completions"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(hfResponse)));

        // Mock Nominatim geocoding response for Kadikoy
        String geocodeKadikoy = "[{\n" +
                "  \"place_id\": 123,\n" +
                "  \"display_name\": \"Kadıköy, Istanbul, Turkey\",\n" +
                "  \"lat\": \"40.9909\",\n" +
                "  \"lon\": \"29.0303\"\n" +
                "}]";

        wireMockServer.stubFor(get(urlPathEqualTo("/search"))
                .withQueryParam("q", equalTo("Kadikoy"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(geocodeKadikoy)));

        // Mock Nominatim geocoding response for Gebze Center
        String geocodeGebze = "[{\n" +
                "  \"place_id\": 456,\n" +
                "  \"display_name\": \"Gebze Center, Kocaeli, Turkey\",\n" +
                "  \"lat\": \"40.7989\",\n" +
                "  \"lon\": \"29.4123\"\n" +
                "}]";

        wireMockServer.stubFor(get(urlPathEqualTo("/search"))
                .withQueryParam("q", equalTo("Gebze Center"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(geocodeGebze)));

        JourneyRequest request = journeyNlpParsingService.parseAndGeocode("Kadıköy'den çıkıp Gebze Center'a gitmek istiyorum.", testUser);

        assertNotNull(request);
        assertEquals("Kadikoy", request.getStartAddressText());
        assertEquals(40.9909, request.getStartLat(), 0.001);
        assertEquals(29.0303, request.getStartLng(), 0.001);
        assertEquals(1, request.getStops().size());
        assertEquals("Gebze Center", request.getStops().get(0).getPlaceName());
        assertEquals(40.7989, request.getStops().get(0).getLat(), 0.001);
        assertEquals(29.4123, request.getStops().get(0).getLng(), 0.001);
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
        // Hugging Face returns invalid text structure
        String hfInvalidResponse = "{\n" +
                "  \"choices\": [\n" +
                "    {\n" +
                "      \"message\": {\n" +
                "        \"role\": \"assistant\",\n" +
                "        \"content\": \"Bu bir JSON değil, hata verecek metin.\"\n" +
                "      }\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        wireMockServer.stubFor(post(urlEqualTo("/v1/chat/completions"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(hfInvalidResponse)));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                journeyNlpParsingService.parseAndGeocode("some text", testUser)
        );
        assertTrue(ex.getMessage().contains("işlenemedi") || ex.getMessage().contains("manuel"));
    }

    @Test
    void parseAndGeocode_llmApiTimeoutOrError() {
        wireMockServer.stubFor(post(urlEqualTo("/v1/chat/completions"))
                .willReturn(aResponse()
                        .withStatus(500)));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                journeyNlpParsingService.parseAndGeocode("some text", testUser)
        );
        assertTrue(ex.getMessage().contains("erişilemiyor") || ex.getMessage().contains("manuel"));
    }
}
