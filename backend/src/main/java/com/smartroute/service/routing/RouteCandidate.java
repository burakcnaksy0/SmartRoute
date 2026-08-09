package com.smartroute.service.routing;

import java.math.BigDecimal;

public class RouteCandidate {
    private int durationSeconds;
    private int distanceMeters;
    private BigDecimal tollCost = BigDecimal.ZERO;
    private String polylineEncoded;

    public RouteCandidate() {
    }

    public RouteCandidate(int durationSeconds, int distanceMeters, BigDecimal tollCost, String polylineEncoded) {
        this.durationSeconds = durationSeconds;
        this.distanceMeters = distanceMeters;
        this.tollCost = tollCost != null ? tollCost : BigDecimal.ZERO;
        this.polylineEncoded = polylineEncoded;
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(int durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public int getDistanceMeters() {
        return distanceMeters;
    }

    public void setDistanceMeters(int distanceMeters) {
        this.distanceMeters = distanceMeters;
    }

    public BigDecimal getTollCost() {
        return tollCost;
    }

    public void setTollCost(BigDecimal tollCost) {
        this.tollCost = tollCost != null ? tollCost : BigDecimal.ZERO;
    }

    public String getPolylineEncoded() {
        return polylineEncoded;
    }

    public void setPolylineEncoded(String polylineEncoded) {
        this.polylineEncoded = polylineEncoded;
    }
}
