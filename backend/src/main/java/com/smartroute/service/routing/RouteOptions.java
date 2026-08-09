package com.smartroute.service.routing;

import java.time.LocalDateTime;

public class RouteOptions {
    private boolean avoidTolls;
    private boolean avoidHighways;
    private String vehicleType;
    private LocalDateTime departureTime;
    private String trafficModel; // 'BEST_GUESS', 'OPTIMISTIC', 'PESSIMISTIC'

    public RouteOptions() {
    }

    public RouteOptions(boolean avoidTolls, boolean avoidHighways, String vehicleType, LocalDateTime departureTime, String trafficModel) {
        this.avoidTolls = avoidTolls;
        this.avoidHighways = avoidHighways;
        this.vehicleType = vehicleType;
        this.departureTime = departureTime;
        this.trafficModel = trafficModel;
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

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public LocalDateTime getDepartureTime() {
        return departureTime;
    }

    public void setDepartureTime(LocalDateTime departureTime) {
        this.departureTime = departureTime;
    }

    public String getTrafficModel() {
        return trafficModel;
    }

    public void setTrafficModel(String trafficModel) {
        this.trafficModel = trafficModel;
    }
}
