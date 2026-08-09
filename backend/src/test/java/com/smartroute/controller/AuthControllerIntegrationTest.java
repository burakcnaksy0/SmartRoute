package com.smartroute.controller;

import com.smartroute.dto.AuthResponse;
import com.smartroute.dto.LoginRequest;
import com.smartroute.dto.RegisterRequest;
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

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class AuthControllerIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.4-alpine").asCompatibleSubstituteFor("postgres")
    );

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void testEndToEndAuthFlowAndProtectedAccess() {
        // 1. Register a new user
        RegisterRequest registerReq = new RegisterRequest();
        registerReq.setEmail("user@example.com");
        registerReq.setPassword("securePassword");
        registerReq.setFullName("John Doe");
        registerReq.setDefaultVehicleType("electric");

        ResponseEntity<AuthResponse> registerRes = restTemplate.postForEntity(
                "/api/v1/auth/register",
                registerReq,
                AuthResponse.class
        );

        assertEquals(HttpStatus.OK, registerRes.getStatusCode());
        AuthResponse auth = registerRes.getBody();
        assertNotNull(auth);
        assertNotNull(auth.getAccessToken());
        assertNotNull(auth.getRefreshToken());
        assertEquals("user@example.com", auth.getEmail());
        assertEquals("John Doe", auth.getFullName());

        // 2. Login with the registered user
        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail("user@example.com");
        loginReq.setPassword("securePassword");

        ResponseEntity<AuthResponse> loginRes = restTemplate.postForEntity(
                "/api/v1/auth/login",
                loginReq,
                AuthResponse.class
        );

        assertEquals(HttpStatus.OK, loginRes.getStatusCode());
        AuthResponse loginAuth = loginRes.getBody();
        assertNotNull(loginAuth);
        assertNotNull(loginAuth.getAccessToken());
        assertEquals("user@example.com", loginAuth.getEmail());

        // 3. Request protected endpoint with VALID token
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAuth.getAccessToken());
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> protectedRes = restTemplate.exchange(
                "/api/v1/test/protected",
                HttpMethod.GET,
                entity,
                Map.class
        );

        assertEquals(HttpStatus.OK, protectedRes.getStatusCode());
        assertEquals("Erişim başarılı!", protectedRes.getBody().get("message"));

        // 4. Request protected endpoint with EXPIRED/INVALID token -> 401
        HttpHeaders invalidHeaders = new HttpHeaders();
        invalidHeaders.setBearerAuth("invalid-expired-token-value");
        HttpEntity<Void> invalidEntity = new HttpEntity<>(invalidHeaders);

        ResponseEntity<Map> invalidRes = restTemplate.exchange(
                "/api/v1/test/protected",
                HttpMethod.GET,
                invalidEntity,
                Map.class
        );

        assertEquals(HttpStatus.UNAUTHORIZED, invalidRes.getStatusCode());
    }
}
