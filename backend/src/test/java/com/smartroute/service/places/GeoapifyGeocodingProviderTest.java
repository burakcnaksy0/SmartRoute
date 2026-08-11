package com.smartroute.service.places;

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
class GeoapifyGeocodingProviderTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private ObjectMapper objectMapper;
    private GeoapifyGeocodingProvider provider;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        provider = new GeoapifyGeocodingProvider(objectMapper, redisTemplate);
        ReflectionTestUtils.setField(provider, "baseUrl", "https://api.geoapify.com");
        ReflectionTestUtils.setField(provider, "apiKey", "test-geoapify-key");
    }

    @Test
    void search_emptyQuery_returnsEmptyList() {
        List<LocationResult> results = provider.search("");
        assertNotNull(results);
        assertTrue(results.isEmpty());
    }

    @Test
    void search_cachedResult_returnsFromCache() {
        String cachedJson = "[{\"name\":\"Kadıköy\",\"formattedAddress\":\"Kadıköy, İstanbul, Türkiye\",\"latitude\":40.9901,\"longitude\":29.0290,\"country\":\"Türkiye\",\"city\":\"İstanbul\",\"street\":null,\"postcode\":null}]";
        when(valueOperations.get(anyString())).thenReturn(cachedJson);

        List<LocationResult> results = provider.search("Kadıköy");

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("Kadıköy", results.get(0).getName());
        assertEquals(40.9901, results.get(0).getLatitude(), 0.0001);
        assertEquals(29.0290, results.get(0).getLongitude(), 0.0001);
    }

    @Test
    void reverseGeocode_cachedResult_returnsFromCache() {
        String cachedJson = "{\"name\":\"Kadıköy Rıhtım\",\"formattedAddress\":\"Kadıköy Rıhtım Cd., İstanbul, Türkiye\",\"latitude\":40.9901,\"longitude\":29.0290,\"country\":\"Türkiye\",\"city\":\"İstanbul\",\"street\":\"Rıhtım Cd.\",\"postcode\":\"34710\"}";
        when(valueOperations.get(anyString())).thenReturn(cachedJson);

        LocationResult result = provider.reverseGeocode(40.9901, 29.0290);

        assertNotNull(result);
        assertEquals("Kadıköy Rıhtım Cd., İstanbul, Türkiye", result.getFormattedAddress());
    }
}
