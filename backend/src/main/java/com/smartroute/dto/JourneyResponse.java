package com.smartroute.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class JourneyResponse {
    private UUID id;
    private Double startLat;
    private Double startLng;
    private String startAddressText;
    private Double destinationLat;
    private Double destinationLng;
    private String destinationAddressText;
    private String status;
    private LocalDateTime plannedDepartureTime;
    private LocalDateTime deadlineTime;
    private String rawNlpInput;
    private List<JourneyStopResponse> stops;
    private List<JourneyPlanResponse> plans;

    public JourneyResponse() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Double getStartLat() {
        return startLat;
    }

    public void setStartLat(Double startLat) {
        this.startLat = startLat;
    }

    public Double getStartLng() {
        return startLng;
    }

    public void setStartLng(Double startLng) {
        this.startLng = startLng;
    }

    public String getStartAddressText() {
        return startAddressText;
    }

    public void setStartAddressText(String startAddressText) {
        this.startAddressText = startAddressText;
    }

    public Double getDestinationLat() {
        return destinationLat;
    }

    public void setDestinationLat(Double destinationLat) {
        this.destinationLat = destinationLat;
    }

    public Double getDestinationLng() {
        return destinationLng;
    }

    public void setDestinationLng(Double destinationLng) {
        this.destinationLng = destinationLng;
    }

    public String getDestinationAddressText() {
        return destinationAddressText;
    }

    public void setDestinationAddressText(String destinationAddressText) {
        this.destinationAddressText = destinationAddressText;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getPlannedDepartureTime() {
        return plannedDepartureTime;
    }

    public void setPlannedDepartureTime(LocalDateTime plannedDepartureTime) {
        this.plannedDepartureTime = plannedDepartureTime;
    }

    public LocalDateTime getDeadlineTime() {
        return deadlineTime;
    }

    public void setDeadlineTime(LocalDateTime deadlineTime) {
        this.deadlineTime = deadlineTime;
    }

    public String getRawNlpInput() {
        return rawNlpInput;
    }

    public void setRawNlpInput(String rawNlpInput) {
        this.rawNlpInput = rawNlpInput;
    }

    public List<JourneyStopResponse> getStops() {
        return stops;
    }

    public void setStops(List<JourneyStopResponse> stops) {
        this.stops = stops;
    }

    public List<JourneyPlanResponse> getPlans() {
        return plans;
    }

    public void setPlans(List<JourneyPlanResponse> plans) {
        this.plans = plans;
    }
}
