package com.smartroute.controller;

import com.smartroute.service.places.GeocodingProvider;
import com.smartroute.service.places.LocationResult;
import com.smartroute.service.places.ParkingProvider;
import com.smartroute.service.places.ParkingResult;
import com.smartroute.service.routing.GeoPoint;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api", "/api/v1"})
public class LocationController {

    private final GeocodingProvider geocodingProvider;
    private final ParkingProvider parkingProvider;

    public LocationController(GeocodingProvider geocodingProvider, ParkingProvider parkingProvider) {
        this.geocodingProvider = geocodingProvider;
        this.parkingProvider = parkingProvider;
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

    @GetMapping("/parking/nearby")
    public ResponseEntity<List<ParkingResult>> getNearbyParking(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "2000") int radius) {
        return ResponseEntity.ok(parkingProvider.findNearby(new GeoPoint(latitude, longitude), radius));
    }
}
