package com.smartroute.routeplanning.domain.model;

import java.util.Objects;
import java.util.UUID;

/**
 * Entity representing a destination (stop) in a route plan.
 */
public class Destination {
    private final UUID id;
    private Location location;
    private TimeWindow timeWindow;
    private int estimatedDurationInMinutes;
    private boolean isMandatory;

    public Destination(UUID id, Location location, TimeWindow timeWindow, int estimatedDurationInMinutes, boolean isMandatory) {
        if (id == null) {
            throw new IllegalArgumentException("Destination ID cannot be null.");
        }
        if (location == null) {
            throw new IllegalArgumentException("Location cannot be null.");
        }
        if (estimatedDurationInMinutes < 0) {
            throw new IllegalArgumentException("Duration cannot be negative.");
        }
        
        this.id = id;
        this.location = location;
        this.timeWindow = timeWindow;
        this.estimatedDurationInMinutes = estimatedDurationInMinutes;
        this.isMandatory = isMandatory;
    }

    public UUID getId() {
        return id;
    }

    public Location getLocation() {
        return location;
    }

    public void setLocation(Location location) {
        if (location == null) throw new IllegalArgumentException("Location cannot be null.");
        this.location = location;
    }

    public TimeWindow getTimeWindow() {
        return timeWindow;
    }

    public void setTimeWindow(TimeWindow timeWindow) {
        this.timeWindow = timeWindow;
    }

    public int getEstimatedDurationInMinutes() {
        return estimatedDurationInMinutes;
    }

    public void setEstimatedDurationInMinutes(int estimatedDurationInMinutes) {
        if (estimatedDurationInMinutes < 0) throw new IllegalArgumentException("Duration cannot be negative.");
        this.estimatedDurationInMinutes = estimatedDurationInMinutes;
    }

    public boolean isMandatory() {
        return isMandatory;
    }

    public void setMandatory(boolean mandatory) {
        isMandatory = mandatory;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Destination that = (Destination) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
