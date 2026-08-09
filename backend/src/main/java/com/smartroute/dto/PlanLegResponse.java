package com.smartroute.dto;

import java.math.BigDecimal;
import java.util.UUID;

public class PlanLegResponse {
    private UUID id;
    private UUID fromStopId;
    private UUID toStopId;
    private Integer legOrder;
    private Integer distanceMeters;
    private Integer durationSeconds;
    private String polylineEncoded;
    private BigDecimal tollCost;

    public PlanLegResponse() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getFromStopId() {
        return fromStopId;
    }

    public void setFromStopId(UUID fromStopId) {
        this.fromStopId = fromStopId;
    }

    public UUID getToStopId() {
        return toStopId;
    }

    public void setToStopId(UUID toStopId) {
        this.toStopId = toStopId;
    }

    public Integer getLegOrder() {
        return legOrder;
    }

    public void setLegOrder(Integer legOrder) {
        this.legOrder = legOrder;
    }

    public Integer getDistanceMeters() {
        return distanceMeters;
    }

    public void setDistanceMeters(Integer distanceMeters) {
        this.distanceMeters = distanceMeters;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public String getPolylineEncoded() {
        return polylineEncoded;
    }

    public void setPolylineEncoded(String polylineEncoded) {
        this.polylineEncoded = polylineEncoded;
    }

    public BigDecimal getTollCost() {
        return tollCost;
    }

    public void setTollCost(BigDecimal tollCost) {
        this.tollCost = tollCost;
    }
}
