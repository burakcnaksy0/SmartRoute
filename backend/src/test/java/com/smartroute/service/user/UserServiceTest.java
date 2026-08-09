package com.smartroute.service.user;

import com.smartroute.domain.User;
import com.smartroute.dto.AuthResponse;
import com.smartroute.dto.RegisterRequest;
import com.smartroute.exception.EmailAlreadyExistsException;
import com.smartroute.repository.UserRepository;
import com.smartroute.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private UserService userService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void register_success() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");
        request.setFullName("Test User");
        request.setDefaultVehicleType("gasoline");

        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(request.getPassword())).thenReturn("hashed_password");

        User savedUser = new User();
        savedUser.setId(UUID.randomUUID());
        savedUser.setEmail(request.getEmail());
        savedUser.setPasswordHash("hashed_password");
        savedUser.setFullName(request.getFullName());
        savedUser.setDefaultVehicleType(request.getDefaultVehicleType());

        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateAccessToken(any(UUID.class), anyString())).thenReturn("access_token");
        when(jwtService.generateRefreshToken(any(UUID.class), anyString())).thenReturn("refresh_token");

        AuthResponse response = userService.register(request);

        assertNotNull(response);
        assertEquals("access_token", response.getAccessToken());
        assertEquals("refresh_token", response.getRefreshToken());
        assertEquals(savedUser.getId(), response.getUserId());
        assertEquals(request.getEmail(), response.getEmail());
        assertEquals(request.getFullName(), response.getFullName());

        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_emailAlreadyExists_throwsException() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("exists@example.com");
        request.setPassword("password123");
        request.setFullName("Exists User");

        when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);

        assertThrows(EmailAlreadyExistsException.class, () -> userService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_invalidPasswordFormat_throwsException() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@example.com");
        request.setPassword("123"); // Too short
        request.setFullName("Short Password User");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> userService.register(request));
        assertEquals("Şifre en az 6 karakter olmalıdır.", exception.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }
}
