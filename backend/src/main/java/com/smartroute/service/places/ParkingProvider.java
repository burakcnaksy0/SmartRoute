package com.smartroute.service.places;

import com.smartroute.service.routing.GeoPoint;
import java.util.List;

public interface ParkingProvider {
    List<ParkingResult> findNearby(GeoPoint location, int radiusMeters);
}
