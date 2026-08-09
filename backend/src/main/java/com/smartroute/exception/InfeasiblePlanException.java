package com.smartroute.exception;

import java.util.List;

/**
 * Thrown when the optimization engine determines that the given stops and time windows
 * cannot be satisfied simultaneously (physically impossible combination — Section 25.2).
 *
 * The exception carries the names of the conflicting stops so the API response can
 * pinpoint exactly which pair of stops is the problem (required by Bölüm 25.2 & Faz 5).
 */
public class InfeasiblePlanException extends RuntimeException {

    /** Names of the stops whose time windows are in conflict (may be null for generic infeasibility). */
    private final List<String> conflictingStops;

    public InfeasiblePlanException(String message) {
        super(message);
        this.conflictingStops = List.of();
    }

    public InfeasiblePlanException(String message, String stopA, String stopB) {
        super(message);
        this.conflictingStops = List.of(stopA, stopB);
    }

    public List<String> getConflictingStops() {
        return conflictingStops;
    }
}
