package com.smartroute.dto;

import java.time.LocalDateTime;

public class DepartureSuggestionsRequest {
    private LocalDateTime targetArrivalTime;

    public DepartureSuggestionsRequest() {
    }

    public DepartureSuggestionsRequest(LocalDateTime targetArrivalTime) {
        this.targetArrivalTime = targetArrivalTime;
    }

    public LocalDateTime getTargetArrivalTime() {
        return targetArrivalTime;
    }

    public void setTargetArrivalTime(LocalDateTime targetArrivalTime) {
        this.targetArrivalTime = targetArrivalTime;
    }
}
