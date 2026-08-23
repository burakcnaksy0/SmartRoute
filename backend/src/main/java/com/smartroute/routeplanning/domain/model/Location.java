package com.smartroute.routeplanning.domain.model;

import java.util.Objects;

/**
 * Value Object representing a physical location.
 */
public final class Location {
    private final Coordinates coordinates;
    private final String addressText;

    public Location(Coordinates coordinates, String addressText) {
        if (coordinates == null) {
            throw new IllegalArgumentException("Coordinates cannot be null.");
        }
        this.coordinates = coordinates;
        this.addressText = addressText;
    }

    public Coordinates getCoordinates() {
        return coordinates;
    }

    public String getAddressText() {
        return addressText;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Location location = (Location) o;
        return Objects.equals(coordinates, location.coordinates) &&
               Objects.equals(addressText, location.addressText);
    }

    @Override
    public int hashCode() {
        return Objects.hash(coordinates, addressText);
    }
}
