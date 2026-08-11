package com.smartroute.service.routing;

import com.github.tomakehurst.wiremock.WireMockServer;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@org.junit.jupiter.api.Disabled("GoogleRoutesProvider is deprecated and disabled")
class GoogleRoutesProviderTest {

    private static WireMockServer wireMockServer;

    @Autowired
    private GoogleRoutesProvider googleRoutesProvider;

    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;

    @BeforeAll
    static void startWireMock() {
        wireMockServer = new WireMockServer(0); // dynamic port
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
        registry.add("google.api.baseUrl", () -> "http://localhost:" + wireMockServer.port());
        registry.add("google.api.key", () -> "test-api-key");
    }

    @BeforeEach
    void resetWireMockAndCircuitBreaker() {
        wireMockServer.resetAll();
        circuitBreakerRegistry.circuitBreaker("googleRoutesApi").reset();
    }

    @Test
    void computeMatrix_success() {
        String responseJson = "[" +
                "  {" +
                "    \"originIndex\": 0," +
                "    \"destinationIndex\": 1," +
                "    \"distanceMeters\": 5000," +
                "    \"duration\": \"600s\"" +
                "  }," +
                "  {" +
                "    \"originIndex\": 1," +
                "    \"destinationIndex\": 0," +
                "    \"distanceMeters\": 5000," +
                "    \"duration\": \"600s\"" +
                "  }" +
                "]";

        wireMockServer.stubFor(post(urlEqualTo("/distanceMatrix/v2:computeRouteMatrix"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        List<GeoPoint> points = List.of(new GeoPoint(40.99, 29.03), new GeoPoint(41.01, 29.05));
        DistanceMatrixResult result = googleRoutesProvider.computeMatrix(points, points);

        assertNotNull(result);
        assertEquals(600, result.getDurations()[0][1]);
        assertEquals(5000, result.getDistances()[0][1]);
        assertEquals(600, result.getDurations()[1][0]);
        assertEquals(5000, result.getDistances()[1][0]);
    }

    @Test
    void computeRoute_success() {
        String responseJson = "{" +
                "  \"routes\": [" +
                "    {" +
                "      \"duration\": \"1200s\"," +
                "      \"distanceMeters\": 15000," +
                "      \"polyline\": {" +
                "        \"encodedPolyline\": \"abc_polyline\"" +
                "      }," +
                "      \"travelAdvisory\": {" +
                "        \"tollInfo\": {" +
                "          \"estimatedPrice\": [" +
                "            {" +
                "              \"currencyCode\": \"TRY\"," +
                "              \"units\": \"45\"" +
                "            }" +
                "          ]" +
                "        }" +
                "      }" +
                "    }" +
                "  ]" +
                "}";

        wireMockServer.stubFor(post(urlEqualTo("/directions/v2:computeRoutes"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        RouteOptions options = new RouteOptions();
        options.setAvoidTolls(true);
        options.setAvoidHighways(false);
        options.setDepartureTime(LocalDateTime.now());

        List<RouteCandidate> candidates = googleRoutesProvider.computeRoute(
                new GeoPoint(40.99, 29.03),
                new GeoPoint(41.01, 29.05),
                options
        );

        assertNotNull(candidates);
        assertEquals(1, candidates.size());
        RouteCandidate candidate = candidates.get(0);
        assertEquals(1200, candidate.getDurationSeconds());
        assertEquals(15000, candidate.getDistanceMeters());
        assertEquals("abc_polyline", candidate.getPolylineEncoded());
        assertEquals(BigDecimal.valueOf(45.0), candidate.getTollCost());
    }

    @Test
    void circuitBreaker_opensOnFailures() {
        wireMockServer.stubFor(post(urlEqualTo("/directions/v2:computeRoutes"))
                .willReturn(aResponse()
                        .withStatus(500)));

        RouteOptions options = new RouteOptions();

        // Make 5 failing calls to hit the minimumNumberOfCalls threshold and trigger open state
        for (int i = 0; i < 5; i++) {
            try {
                googleRoutesProvider.computeRoute(
                        new GeoPoint(40.99, 29.03),
                        new GeoPoint(41.01, 29.05),
                        options
                );
            } catch (Exception e) {
                // Ignore expected HTTP errors to let the circuit breaker track them
            }
        }

        // The 6th call should be intercepted and fail with CallNotPermittedException since the circuit is open
        assertThrows(CallNotPermittedException.class, () ->
                googleRoutesProvider.computeRoute(
                        new GeoPoint(40.99, 29.03),
                        new GeoPoint(41.01, 29.05),
                        options
                )
        );
    }
}
