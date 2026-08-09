package com.smartroute.dto;

import java.time.LocalDateTime;

public class DepartureSuggestionResponse {
    private LocalDateTime departureTime;
    private double arrivalConfidence;
    private int estimatedDurationSeconds;

    public DepartureSuggestionResponse() {
    }

    public DepartureSuggestionResponse(LocalDateTime departureTime, double arrivalConfidence, int estimatedDurationSeconds) {
        this.departureTime = departureTime;
        this.arrivalConfidence = arrivalConfidence;
        this.estimatedDurationSeconds = estimatedDurationSeconds;
    }

    public LocalDateTime getDepartureTime() {
        return departureTime;
    }

    public void setDepartureTime(LocalDateTime departureTime) {
        this.departureTime = departureTime;
    }

    public double getArrivalConfidence() {
        return arrivalConfidence;
    }

    public void setArrivalConfidence(double arrivalConfidence) {
        this.arrivalConfidence = arrivalConfidence;
    }

    public int getEstimatedDurationSeconds() {
        return estimatedDurationSeconds;
    }

    public void setEstimatedDurationSeconds(int estimatedDurationSeconds) {
        this.estimatedDurationSeconds = estimatedDurationSeconds;
    }
}
