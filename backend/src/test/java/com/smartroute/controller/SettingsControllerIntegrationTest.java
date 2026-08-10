package com.smartroute.controller;

import com.smartroute.dto.AuthResponse;
import com.smartroute.dto.RegisterRequest;
import com.smartroute.dto.UserSettingsDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class SettingsControllerIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.4-alpine").asCompatibleSubstituteFor("postgres")
    );

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void testGetAndPatchSettings() {
        // 1. Register a new user to generate accessToken
        RegisterRequest registerReq = new RegisterRequest();
        registerReq.setEmail("settings_user@example.com");
        registerReq.setPassword("securePassword");
        registerReq.setFullName("Settings Test User");
        registerReq.setDefaultVehicleType("gasoline");

        ResponseEntity<AuthResponse> registerRes = restTemplate.postForEntity(
                "/api/v1/auth/register",
                registerReq,
                AuthResponse.class
        );

        assertEquals(HttpStatus.OK, registerRes.getStatusCode());
        AuthResponse auth = registerRes.getBody();
        assertNotNull(auth);

        // 2. Fetch default settings
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(auth.getAccessToken());
        HttpEntity<Void> getEntity = new HttpEntity<>(headers);

        ResponseEntity<UserSettingsDto> getRes = restTemplate.exchange(
                "/api/v1/users/settings",
                HttpMethod.GET,
                getEntity,
                UserSettingsDto.class
        );

        assertEquals(HttpStatus.OK, getRes.getStatusCode());
        UserSettingsDto defaultSettings = getRes.getBody();
        assertNotNull(defaultSettings);
        assertEquals("Google Haritalar", defaultSettings.getMapProvider());
        assertEquals("Kilometre", defaultSettings.getDistanceUnit());
        assertEquals("Türkçe", defaultSettings.getLanguage());
        assertTrue(defaultSettings.getDepartureAlerts());
        assertFalse(defaultSettings.getServiceDisruptions());

        // 3. Update settings (PATCH)
        UserSettingsDto updateReq = new UserSettingsDto();
        updateReq.setMapProvider("Apple Haritalar");
        updateReq.setDistanceUnit("Mil");
        updateReq.setLanguage("English");
        updateReq.setDepartureAlerts(false);
        updateReq.setServiceDisruptions(true);

        HttpEntity<UserSettingsDto> patchEntity = new HttpEntity<>(updateReq, headers);

        ResponseEntity<UserSettingsDto> patchRes = restTemplate.exchange(
                "/api/v1/users/settings",
                HttpMethod.PUT,
                patchEntity,
                UserSettingsDto.class
        );

        assertEquals(HttpStatus.OK, patchRes.getStatusCode());
        UserSettingsDto updatedSettings = patchRes.getBody();
        assertNotNull(updatedSettings);
        assertEquals("Apple Haritalar", updatedSettings.getMapProvider());
        assertEquals("Mil", updatedSettings.getDistanceUnit());
        assertEquals("English", updatedSettings.getLanguage());
        assertFalse(updatedSettings.getDepartureAlerts());
        assertTrue(updatedSettings.getServiceDisruptions());

        // 4. Verify updates persist on GET
        ResponseEntity<UserSettingsDto> getVerifyRes = restTemplate.exchange(
                "/api/v1/users/settings",
                HttpMethod.GET,
                getEntity,
                UserSettingsDto.class
        );

        assertEquals(HttpStatus.OK, getVerifyRes.getStatusCode());
        UserSettingsDto verifiedSettings = getVerifyRes.getBody();
        assertNotNull(verifiedSettings);
        assertEquals("Apple Haritalar", verifiedSettings.getMapProvider());
        assertEquals("Mil", verifiedSettings.getDistanceUnit());
        assertEquals("English", verifiedSettings.getLanguage());
        assertFalse(verifiedSettings.getDepartureAlerts());
        assertTrue(verifiedSettings.getServiceDisruptions());
    }
}
