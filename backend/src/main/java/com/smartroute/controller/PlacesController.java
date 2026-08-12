package com.smartroute.controller;

import com.smartroute.domain.User;
import com.smartroute.dto.ParkingOptionResponse;
import com.smartroute.exception.UserNotFoundException;
import com.smartroute.repository.UserRepository;
import com.smartroute.service.places.PlacesService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/places")
public class PlacesController {

    private final PlacesService placesService;
    private final UserRepository userRepository;

    public PlacesController(PlacesService placesService, UserRepository userRepository) {
        this.placesService = placesService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("Oturum açmış kullanıcı bulunamadı."));
    }

//    @GetMapping("/{id}/parking-options")
//    public ResponseEntity<List<ParkingOptionResponse>> getParkingOptions(@PathVariable UUID id) {
//        User user = getCurrentUser();
//        return ResponseEntity.ok(placesService.getParkingOptions(id, user));
//    }

    @GetMapping("/search")
    public ResponseEntity<List<com.smartroute.service.places.GooglePlaceResult>> searchPlaces(@RequestParam String query) {
        return ResponseEntity.ok(placesService.searchPlaces(query));
    }

    @GetMapping("/reverse-geocode")
    public ResponseEntity<String> reverseGeocode(@RequestParam double lat, @RequestParam double lng) {
        return ResponseEntity.ok(placesService.reverseGeocode(lat, lng));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<com.smartroute.service.places.GooglePlaceResult>> getRecommendations(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "2000") int radius) {
        return ResponseEntity.ok(placesService.getRecommendations(lat, lng, radius));
    }
}
