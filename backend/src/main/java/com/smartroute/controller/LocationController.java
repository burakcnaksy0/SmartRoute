package com.smartroute.controller;

import com.smartroute.service.places.GeocodingProvider;
import com.smartroute.service.places.LocationResult;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.context.SecurityContextHolder;
import com.smartroute.domain.User;
import com.smartroute.repository.UserRepository;
import com.smartroute.exception.UserNotFoundException;
import com.smartroute.service.places.SavedLocationService;
import com.smartroute.dto.SavedLocationDto;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api", "/api/v1"})
public class LocationController {

    private final GeocodingProvider geocodingProvider;
    private final SavedLocationService savedLocationService;
    private final UserRepository userRepository;

    public LocationController(GeocodingProvider geocodingProvider, 
                              SavedLocationService savedLocationService,
                              UserRepository userRepository) {
        this.geocodingProvider = geocodingProvider;
        this.savedLocationService = savedLocationService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("Oturum açmış kullanıcı bulunamadı."));
    }

    @GetMapping("/locations/search")
    public ResponseEntity<List<LocationResult>> searchLocations(@RequestParam String query) {
        return ResponseEntity.ok(geocodingProvider.search(query));
    }

    @GetMapping("/locations/reverse")
    public ResponseEntity<LocationResult> reverseGeocode(
            @RequestParam double latitude,
            @RequestParam double longitude) {
        return ResponseEntity.ok(geocodingProvider.reverseGeocode(latitude, longitude));
    }

//    @GetMapping("/parking/nearby")
//    public ResponseEntity<List<ParkingResult>> getNearbyParking(
//            @RequestParam double latitude,
//            @RequestParam double longitude,
//            @RequestParam(defaultValue = "2000") int radius) {
//        return ResponseEntity.ok(parkingProvider.findNearby(new GeoPoint(latitude, longitude), radius));
//    }

    // --- Saved Locations Endpoints ---

    @GetMapping("/locations/saved")
    public ResponseEntity<List<SavedLocationDto>> getSavedLocations() {
        return ResponseEntity.ok(savedLocationService.getSavedLocations(getCurrentUser()));
    }

    @PostMapping("/locations/saved")
    public ResponseEntity<SavedLocationDto> saveLocation(@RequestBody SavedLocationDto dto) {
        return ResponseEntity.ok(savedLocationService.saveLocation(getCurrentUser(), dto));
    }

    @DeleteMapping("/locations/saved/{id}")
    public ResponseEntity<Void> deleteSavedLocation(@PathVariable UUID id) {
        savedLocationService.deleteLocation(getCurrentUser(), id);
        return ResponseEntity.noContent().build();
    }
}
