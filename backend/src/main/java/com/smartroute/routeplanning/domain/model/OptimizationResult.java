package com.smartroute.routeplanning.domain.model;

import java.util.Collections;
import java.util.List;

/**
 * Value object representing the outcome of a routing optimization.
 */
public record OptimizationResult(
        List<Destination> orderedDestinations,
        int totalDistanceMeters,
        int totalDurationSeconds
) {
    public OptimizationResult {
        orderedDestinations = Collections.unmodifiableList(orderedDestinations);
    }
}
