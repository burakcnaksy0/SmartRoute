package com.smartroute.controller;

import com.smartroute.domain.User;
import com.smartroute.dto.*;
import com.smartroute.exception.UserNotFoundException;
import com.smartroute.repository.UserRepository;
import com.smartroute.service.journey.JourneyPlanningService;
import com.smartroute.service.journey.DepartureOptimizerService;
import com.smartroute.service.nlp.JourneyNlpParsingService;
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
    private final JourneyNlpParsingService journeyNlpParsingService;
    private final DepartureOptimizerService departureOptimizerService;
    private final com.smartroute.service.places.PlacesService placesService;

    public JourneyController(
            JourneyPlanningService journeyPlanningService,
            UserRepository userRepository,
            JourneyNlpParsingService journeyNlpParsingService,
            DepartureOptimizerService departureOptimizerService,
            com.smartroute.service.places.PlacesService placesService) {
        this.journeyPlanningService = journeyPlanningService;
        this.userRepository = userRepository;
        this.journeyNlpParsingService = journeyNlpParsingService;
        this.departureOptimizerService = departureOptimizerService;
        this.placesService = placesService;
    }

    private User getCurrentUser() {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("Oturum açmış kullanıcı bulunamadı."));
    }

    @PostMapping("/parse-nlp")
    public ResponseEntity<JourneyRequest> parseNlp(@RequestBody NlpParseRequest request) {
        User user = getCurrentUser();
        return ResponseEntity.ok(journeyNlpParsingService.parseAndGeocode(request.getText(), user));
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

    @PostMapping("/{id}/departure-suggestions")
    public ResponseEntity<List<DepartureSuggestionResponse>> getDepartureSuggestions(
            @PathVariable UUID id,
            @RequestBody DepartureSuggestionsRequest request) {
        User user = getCurrentUser();
        return ResponseEntity.ok(departureOptimizerService.getDepartureSuggestions(id, request, user));
    }

    @PostMapping("/{id}/replan")
    public ResponseEntity<ReplanResponse> replanJourney(
            @PathVariable UUID id,
            @RequestBody ReplanRequest request,
            @RequestParam(defaultValue = "false") boolean confirm) {
        User user = getCurrentUser();
        return ResponseEntity.ok(journeyPlanningService.replanJourney(id, request, user, confirm));
    }

    @GetMapping("/{id}/along-route")
    public ResponseEntity<List<AlongRoutePoiResponse>> getAlongRoutePoi(
            @PathVariable UUID id,
            @RequestParam String category,
            @RequestParam(name = "max_detour_minutes", defaultValue = "10.0") Double maxDetourMinutes,
            @RequestParam(name = "max_detour_km", defaultValue = "2.0") Double maxDetourKm) {
        User user = getCurrentUser();
        return ResponseEntity.ok(placesService.getAlongRoutePoi(id, category, maxDetourMinutes, maxDetourKm, user));
    }
}
