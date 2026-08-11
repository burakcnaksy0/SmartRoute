package com.smartroute.service.routing;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OpenRouteServiceProviderTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private ObjectMapper objectMapper;
    private OpenRouteServiceProvider provider;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        provider = new OpenRouteServiceProvider(objectMapper, redisTemplate);
        ReflectionTestUtils.setField(provider, "baseUrl", "https://api.openrouteservice.org");
        ReflectionTestUtils.setField(provider, "apiKey", "test-api-key");
    }

    @Test
    void computeMatrix_emptyPoints_returnsEmptyResult() {
        DistanceMatrixResult result = provider.computeMatrix(List.of(), List.of());
        assertNotNull(result);
        assertEquals(0, result.getDurations().length);
        assertEquals(0, result.getDistances().length);
    }

    @Test
    void computeMatrix_cachedResult_returnsFromCache() throws Exception {
        String cachedJson = "{\"durations\":[[0,600],[600,0]],\"distances\":[[0,5000],[5000,0]]}";
        when(valueOperations.get(anyString())).thenReturn(cachedJson);

        List<GeoPoint> points = List.of(new GeoPoint(40.99, 29.03), new GeoPoint(41.01, 29.05));
        DistanceMatrixResult result = provider.computeMatrix(points, points);

        assertNotNull(result);
        assertEquals(600, result.getDurations()[0][1]);
        assertEquals(5000, result.getDistances()[0][1]);
        verify(valueOperations, times(1)).get(anyString());
    }

    @Test
    void computeRoute_nullPoints_returnsEmptyList() {
        List<RouteCandidate> result = provider.computeRoute(null, null, new RouteOptions());
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void computeRoute_cachedResult_returnsFromCache() {
        String cachedJson = "[{\"durationSeconds\":1200,\"distanceMeters\":15000,\"tollCost\":0,\"polylineEncoded\":\"_p~iF~ps|U_ulLnnqC_mqNvxq`@\"}]";
        when(valueOperations.get(anyString())).thenReturn(cachedJson);

        GeoPoint origin = new GeoPoint(40.99, 29.03);
        GeoPoint dest = new GeoPoint(41.01, 29.05);
        List<RouteCandidate> candidates = provider.computeRoute(origin, dest, new RouteOptions());

        assertNotNull(candidates);
        assertEquals(1, candidates.size());
        assertEquals(1200, candidates.get(0).getDurationSeconds());
        assertEquals(15000, candidates.get(0).getDistanceMeters());
    }
}
