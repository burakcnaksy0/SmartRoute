package com.smartroute.dto;

import java.time.LocalDateTime;
import java.util.List;

public class JourneyRequest {
    private Double startLat;
    private Double startLng;
    private String startAddressText;
    private LocalDateTime plannedDepartureTime;
    private LocalDateTime deadlineTime;
    private List<JourneyStopRequest> stops;

    public JourneyRequest() {
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

    public List<JourneyStopRequest> getStops() {
        return stops;
    }

    public void setStops(List<JourneyStopRequest> stops) {
        this.stops = stops;
    }
}
