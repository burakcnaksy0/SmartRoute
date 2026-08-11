package com.smartroute.service.places;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartroute.service.routing.GeoPoint;
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
class OverpassParkingProviderTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private ObjectMapper objectMapper;
    private OverpassParkingProvider provider;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        provider = new OverpassParkingProvider(objectMapper, redisTemplate);
        ReflectionTestUtils.setField(provider, "overpassUrl", "https://overpass-api.de/api/interpreter");
        ReflectionTestUtils.setField(provider, "userAgent", "SmartRoute/1.0");
    }

    @Test
    void findNearby_nullLocation_returnsEmptyList() {
        List<ParkingResult> results = provider.findNearby(null, 1000);
        assertNotNull(results);
        assertTrue(results.isEmpty());
    }

    @Test
    void findNearby_cachedResult_returnsFromCache() {
        String cachedJson = "[{\"id\":\"node/12345\",\"name\":\"Kadıköy Katlı Otoparkı\",\"latitude\":40.9905,\"longitude\":29.0295,\"distanceMeters\":85,\"capacity\":200,\"fee\":true,\"access\":\"yes\"}]";
        when(valueOperations.get(anyString())).thenReturn(cachedJson);

        List<ParkingResult> results = provider.findNearby(new GeoPoint(40.99, 29.03), 1000);

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("Kadıköy Katlı Otoparkı", results.get(0).getName());
        assertEquals(200, results.get(0).getCapacity());
        assertTrue(results.get(0).getFee());
    }
}
