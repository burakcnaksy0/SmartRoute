package com.smartroute.controller;

import com.smartroute.domain.User;
import com.smartroute.dto.TripExpenseRequest;
import com.smartroute.dto.TripExpenseResponse;
import com.smartroute.exception.UserNotFoundException;
import com.smartroute.repository.UserRepository;
import com.smartroute.service.journey.TripExpenseService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/journeys")
public class TripExpenseController {

    private final TripExpenseService tripExpenseService;
    private final UserRepository userRepository;

    public TripExpenseController(TripExpenseService tripExpenseService, UserRepository userRepository) {
        this.tripExpenseService = tripExpenseService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("Oturum açmış kullanıcı bulunamadı."));
    }

    @GetMapping("/{journeyId}/expenses")
    public ResponseEntity<TripExpenseResponse> getExpense(@PathVariable UUID journeyId) {
        return ResponseEntity.ok(tripExpenseService.getExpenseForJourney(journeyId, getCurrentUser()));
    }

    @PostMapping("/{journeyId}/expenses")
    public ResponseEntity<TripExpenseResponse> recordExpense(
            @PathVariable UUID journeyId,
            @RequestBody TripExpenseRequest request) {
        return ResponseEntity.ok(tripExpenseService.recordExpense(journeyId, request, getCurrentUser()));
    }

    @PatchMapping("/{journeyId}/expenses")
    public ResponseEntity<TripExpenseResponse> updateExpense(
            @PathVariable UUID journeyId,
            @RequestBody TripExpenseRequest request) {
        return ResponseEntity.ok(tripExpenseService.updateExpense(journeyId, request, getCurrentUser()));
    }
}
