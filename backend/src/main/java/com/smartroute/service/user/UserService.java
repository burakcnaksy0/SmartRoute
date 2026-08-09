package com.smartroute.service.user;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.smartroute.domain.User;
import com.smartroute.dto.AuthResponse;
import com.smartroute.dto.LoginRequest;
import com.smartroute.dto.RegisterRequest;
import com.smartroute.exception.EmailAlreadyExistsException;
import com.smartroute.exception.InvalidCredentialsException;
import com.smartroute.exception.UserNotFoundException;
import com.smartroute.repository.UserRepository;
import com.smartroute.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new IllegalArgumentException("Şifre en az 6 karakter olmalıdır.");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("Bu e-posta adresi zaten kayıtlı.");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setDefaultVehicleType(request.getDefaultVehicleType() != null ? request.getDefaultVehicleType() : "gasoline");

        user = userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail());

        return new AuthResponse(accessToken, refreshToken, user.getId(), user.getEmail(), user.getFullName());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("E-posta adresi veya şifre hatalı."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("E-posta adresi veya şifre hatalı.");
        }

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail());

        return new AuthResponse(accessToken, refreshToken, user.getId(), user.getEmail(), user.getFullName());
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(String refreshToken) {
        try {
            DecodedJWT jwt = jwtService.verifyToken(refreshToken);

            if (!jwtService.isRefreshToken(jwt)) {
                throw new InvalidCredentialsException("Geçersiz yenileme anahtarı.");
            }

            String email = jwt.getSubject();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new UserNotFoundException("Kullanıcı bulunamadı."));

            String newAccessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
            String newRefreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail());

            return new AuthResponse(newAccessToken, newRefreshToken, user.getId(), user.getEmail(), user.getFullName());
        } catch (Exception e) {
            throw new InvalidCredentialsException("Oturum yenileme başarısız.");
        }
    }
}
