package com.smartroute.controller;

import com.smartroute.domain.User;
import com.smartroute.dto.UserSettingsDto;
import com.smartroute.exception.UserNotFoundException;
import com.smartroute.repository.UserRepository;
import com.smartroute.service.user.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/settings")
public class SettingsController {

    private final UserService userService;
    private final UserRepository userRepository;

    public SettingsController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("Oturum açmış kullanıcı bulunamadı."));
    }

    @GetMapping
    public ResponseEntity<UserSettingsDto> getSettings() {
        User user = getCurrentUser();
        return ResponseEntity.ok(userService.getSettings(user));
    }

    @PutMapping
    public ResponseEntity<UserSettingsDto> updateSettings(@RequestBody UserSettingsDto request) {
        User user = getCurrentUser();
        return ResponseEntity.ok(userService.updateSettings(request, user));
    }
}
