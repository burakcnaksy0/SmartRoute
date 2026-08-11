package com.smartroute.dto;

import java.util.List;

public class CalculateRouteRequest {

    public static class Coordinate {
        private double latitude;
        private double longitude;

        public Coordinate() {}

        public Coordinate(double latitude, double longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
        }

        public double getLatitude() {
            return latitude;
        }

        public void setLatitude(double latitude) {
            this.latitude = latitude;
        }

        public double getLongitude() {
            return longitude;
        }

        public void setLongitude(double longitude) {
            this.longitude = longitude;
        }
    }

    public static class Options {
        private String preferredRouteType; // FASTEST, SHORTEST, CHEAPEST, BALANCED
        private boolean avoidTolls;
        private boolean avoidHighways;
        private boolean preserveStopOrder;
        private double fuelConsumption = 7.2;
        private double fuelPrice = 55.50;

        public Options() {}

        public String getPreferredRouteType() {
            return preferredRouteType;
        }

        public void setPreferredRouteType(String preferredRouteType) {
            this.preferredRouteType = preferredRouteType;
        }

        public boolean isAvoidTolls() {
            return avoidTolls;
        }

        public void setAvoidTolls(boolean avoidTolls) {
            this.avoidTolls = avoidTolls;
        }

        public boolean isAvoidHighways() {
            return avoidHighways;
        }

        public void setAvoidHighways(boolean avoidHighways) {
            this.avoidHighways = avoidHighways;
        }

        public boolean isPreserveStopOrder() {
            return preserveStopOrder;
        }

        public void setPreserveStopOrder(boolean preserveStopOrder) {
            this.preserveStopOrder = preserveStopOrder;
        }

        public double getFuelConsumption() {
            return fuelConsumption;
        }

        public void setFuelConsumption(double fuelConsumption) {
            this.fuelConsumption = fuelConsumption;
        }

        public double getFuelPrice() {
            return fuelPrice;
        }

        public void setFuelPrice(double fuelPrice) {
            this.fuelPrice = fuelPrice;
        }
    }

    private Coordinate origin;
    private Coordinate destination;
    private List<Coordinate> waypoints;
    private Options options;

    public CalculateRouteRequest() {}

    public Coordinate getOrigin() {
        return origin;
    }

    public void setOrigin(Coordinate origin) {
        this.origin = origin;
    }

    public Coordinate getDestination() {
        return destination;
    }

    public void setDestination(Coordinate destination) {
        this.destination = destination;
    }

    public List<Coordinate> getWaypoints() {
        return waypoints;
    }

    public void setWaypoints(List<Coordinate> waypoints) {
        this.waypoints = waypoints;
    }

    public Options getOptions() {
        return options;
    }

    public void setOptions(Options options) {
        this.options = options;
    }
}
