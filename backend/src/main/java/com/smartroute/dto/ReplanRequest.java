package com.smartroute.dto;

import java.util.List;
import java.util.UUID;

public class ReplanRequest {
    private Double currentLat;
    private Double currentLng;
    private List<UUID> completedStopIds;

    public ReplanRequest() {}

    public Double getCurrentLat() {
        return currentLat;
    }

    public void setCurrentLat(Double currentLat) {
        this.currentLat = currentLat;
    }

    public Double getCurrentLng() {
        return currentLng;
    }

    public void setCurrentLng(Double currentLng) {
        this.currentLng = currentLng;
    }

    public List<UUID> getCompletedStopIds() {
        return completedStopIds;
    }

    public void setCompletedStopIds(List<UUID> completedStopIds) {
        this.completedStopIds = completedStopIds;
    }
}
