package com.smartroute.dto;

import java.math.BigDecimal;
import java.util.List;

public class CalculateRouteResponse {
    private int totalDistanceMeters;
    private int totalDurationSeconds;
    private BigDecimal tollCost;
    private BigDecimal fuelCostEstimate;
    private List<Integer> optimizedStopOrder;
    private String polyline;
    private String explanation;

    public CalculateRouteResponse() {}

    public CalculateRouteResponse(int totalDistanceMeters, int totalDurationSeconds, BigDecimal tollCost, BigDecimal fuelCostEstimate, List<Integer> optimizedStopOrder, String polyline, String explanation) {
        this.totalDistanceMeters = totalDistanceMeters;
        this.totalDurationSeconds = totalDurationSeconds;
        this.tollCost = tollCost;
        this.fuelCostEstimate = fuelCostEstimate;
        this.optimizedStopOrder = optimizedStopOrder;
        this.polyline = polyline;
        this.explanation = explanation;
    }

    public int getTotalDistanceMeters() {
        return totalDistanceMeters;
    }

    public void setTotalDistanceMeters(int totalDistanceMeters) {
        this.totalDistanceMeters = totalDistanceMeters;
    }

    public int getTotalDurationSeconds() {
        return totalDurationSeconds;
    }

    public void setTotalDurationSeconds(int totalDurationSeconds) {
        this.totalDurationSeconds = totalDurationSeconds;
    }

    public BigDecimal getTollCost() {
        return tollCost;
    }

    public void setTollCost(BigDecimal tollCost) {
        this.tollCost = tollCost;
    }

    public BigDecimal getFuelCostEstimate() {
        return fuelCostEstimate;
    }

    public void setFuelCostEstimate(BigDecimal fuelCostEstimate) {
        this.fuelCostEstimate = fuelCostEstimate;
    }

    public List<Integer> getOptimizedStopOrder() {
        return optimizedStopOrder;
    }

    public void setOptimizedStopOrder(List<Integer> optimizedStopOrder) {
        this.optimizedStopOrder = optimizedStopOrder;
    }

    public String getPolyline() {
        return polyline;
    }

    public void setPolyline(String polyline) {
        this.polyline = polyline;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }
}
