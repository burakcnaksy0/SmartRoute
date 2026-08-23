package com.smartroute.routeplanning.domain.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Aggregate Root for the Route Planning bounded context.
 */
public class RoutePlan {
    private final UUID id;
    private final UUID userId;
    private Location origin;
    private Location finalDestination;
    private final List<Destination> destinations;
    private RoutePlanStatus status;

    public enum RoutePlanStatus {
        DRAFT, OPTIMIZING, OPTIMIZED, CANCELLED
    }

    public RoutePlan(UUID id, UUID userId, Location origin) {
        if (id == null) throw new IllegalArgumentException("RoutePlan ID cannot be null.");
        if (userId == null) throw new IllegalArgumentException("User ID cannot be null.");
        if (origin == null) throw new IllegalArgumentException("Origin cannot be null.");
        
        this.id = id;
        this.userId = userId;
        this.origin = origin;
        this.destinations = new ArrayList<>();
        this.status = RoutePlanStatus.DRAFT;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public Location getOrigin() {
        return origin;
    }

    public void setOrigin(Location origin) {
        if (origin == null) throw new IllegalArgumentException("Origin cannot be null.");
        this.origin = origin;
        this.status = RoutePlanStatus.DRAFT; // Modification resets status
    }

    public Location getFinalDestination() {
        return finalDestination;
    }

    public void setFinalDestination(Location finalDestination) {
        this.finalDestination = finalDestination;
        this.status = RoutePlanStatus.DRAFT;
    }

    public List<Destination> getDestinations() {
        return Collections.unmodifiableList(destinations);
    }

    public void addDestination(Destination destination) {
        if (destination == null) throw new IllegalArgumentException("Destination cannot be null.");
        if (this.destinations.contains(destination)) {
            throw new IllegalArgumentException("Destination is already in the route plan.");
        }
        this.destinations.add(destination);
        this.status = RoutePlanStatus.DRAFT;
    }

    public void removeDestination(UUID destinationId) {
        boolean removed = this.destinations.removeIf(d -> d.getId().equals(destinationId));
        if (removed) {
            this.status = RoutePlanStatus.DRAFT;
        }
    }

    public RoutePlanStatus getStatus() {
        return status;
    }

    public void markAsOptimizing() {
        this.status = RoutePlanStatus.OPTIMIZING;
    }

    public void markAsOptimized() {
        this.status = RoutePlanStatus.OPTIMIZED;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RoutePlan routePlan = (RoutePlan) o;
        return Objects.equals(id, routePlan.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
