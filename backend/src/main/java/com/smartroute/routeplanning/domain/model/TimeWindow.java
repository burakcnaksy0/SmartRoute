package com.smartroute.routeplanning.domain.model;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Value Object representing a time constraint for visiting a destination.
 */
public final class TimeWindow {
    private final LocalDateTime earliestArrival;
    private final LocalDateTime latestDeparture;

    public TimeWindow(LocalDateTime earliestArrival, LocalDateTime latestDeparture) {
        if (earliestArrival != null && latestDeparture != null && earliestArrival.isAfter(latestDeparture)) {
            throw new IllegalArgumentException("Earliest arrival cannot be after latest departure.");
        }
        this.earliestArrival = earliestArrival;
        this.latestDeparture = latestDeparture;
    }

    public LocalDateTime getEarliestArrival() {
        return earliestArrival;
    }

    public LocalDateTime getLatestDeparture() {
        return latestDeparture;
    }

    public boolean isSatisfiedBy(LocalDateTime arrivalTime) {
        if (earliestArrival != null && arrivalTime.isBefore(earliestArrival)) {
            return false;
        }
        if (latestDeparture != null && arrivalTime.isAfter(latestDeparture)) {
            return false;
        }
        return true;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TimeWindow that = (TimeWindow) o;
        return Objects.equals(earliestArrival, that.earliestArrival) &&
               Objects.equals(latestDeparture, that.latestDeparture);
    }

    @Override
    public int hashCode() {
        return Objects.hash(earliestArrival, latestDeparture);
    }
}
