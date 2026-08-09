package com.smartroute.controller;

import com.smartroute.domain.User;
import com.smartroute.dto.*;
import com.smartroute.exception.UserNotFoundException;
import com.smartroute.repository.UserRepository;
import com.smartroute.service.journey.JourneyPlanningService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/journeys")
public class JourneyController {

    private final JourneyPlanningService journeyPlanningService;
    private final UserRepository userRepository;

    public JourneyController(JourneyPlanningService journeyPlanningService, UserRepository userRepository) {
        this.journeyPlanningService = journeyPlanningService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("Oturum açmış kullanıcı bulunamadı."));
    }

    @PostMapping
    public ResponseEntity<JourneyResponse> createJourneyDraft(@RequestBody JourneyRequest request) {
        User user = getCurrentUser();
        return ResponseEntity.ok(journeyPlanningService.createJourneyDraft(request, user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JourneyResponse> getJourney(@PathVariable UUID id) {
        User user = getCurrentUser();
        return ResponseEntity.ok(journeyPlanningService.getJourney(id, user));
    }

    @PostMapping("/{id}/optimize")
    public ResponseEntity<JourneyResponse> optimizeJourney(@PathVariable UUID id, @RequestBody OptimizeRequest request) {
        User user = getCurrentUser();
        return ResponseEntity.ok(journeyPlanningService.optimizeJourney(id, request, user));
    }

    @GetMapping("/{id}/plans")
    public ResponseEntity<List<JourneyPlanResponse>> getJourneyPlans(@PathVariable UUID id) {
        User user = getCurrentUser();
        return ResponseEntity.ok(journeyPlanningService.getJourneyPlans(id, user));
    }

    @PostMapping("/{id}/plans/{planId}/select")
    public ResponseEntity<JourneyPlanResponse> selectPlan(@PathVariable UUID id, @PathVariable UUID planId) {
        User user = getCurrentUser();
        return ResponseEntity.ok(journeyPlanningService.selectPlan(id, planId, user));
    }
}
