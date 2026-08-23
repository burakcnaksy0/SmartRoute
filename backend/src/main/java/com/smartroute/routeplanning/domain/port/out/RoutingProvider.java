package com.smartroute.routeplanning.domain.port.out;

import com.smartroute.routeplanning.domain.model.Location;
import java.util.List;

/**
 * Outbound port for external routing and matrix calculations.
 * Implemented by adapters (e.g., OpenRouteService, Mapbox).
 */
public interface RoutingProvider {

    /**
     * Calculates a distance and duration matrix for the given locations.
     * @param locations List of locations to include in the matrix.
     * @return A matrix containing durations (in seconds) and distances (in meters) between all points.
     */
    DistanceMatrix getDistanceMatrix(List<Location> locations);

    record DistanceMatrix(int[][] durationSeconds, int[][] distanceMeters) {}
}
