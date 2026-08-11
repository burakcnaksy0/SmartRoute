package com.smartroute.service.places;

import java.util.List;

public interface GeocodingProvider {
    List<LocationResult> search(String query);
    LocationResult reverseGeocode(double latitude, double longitude);
}
