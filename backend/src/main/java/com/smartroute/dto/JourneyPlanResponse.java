package com.smartroute.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class JourneyPlanResponse {
    private UUID planId;
    private String label;
    private Integer totalDurationSeconds;
    private Integer totalDistanceMeters;
    private BigDecimal totalTollCost;
    private BigDecimal totalFuelCostEstimate;
    private Double trafficRiskScore;
    private Double overallScore;
    private String explanation;
    private List<String> stopOrder;
    private List<PlanLegResponse> legs;
    private Boolean isSelected;

    public JourneyPlanResponse() {
    }

    public UUID getPlanId() {
        return planId;
    }

    public void setPlanId(UUID planId) {
        this.planId = planId;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public Integer getTotalDurationSeconds() {
        return totalDurationSeconds;
    }

    public void setTotalDurationSeconds(Integer totalDurationSeconds) {
        this.totalDurationSeconds = totalDurationSeconds;
    }

    public Integer getTotalDistanceMeters() {
        return totalDistanceMeters;
    }

    public void setTotalDistanceMeters(Integer totalDistanceMeters) {
        this.totalDistanceMeters = totalDistanceMeters;
    }

    public BigDecimal getTotalTollCost() {
        return totalTollCost;
    }

    public void setTotalTollCost(BigDecimal totalTollCost) {
        this.totalTollCost = totalTollCost;
    }

    public BigDecimal getTotalFuelCostEstimate() {
        return totalFuelCostEstimate;
    }

    public void setTotalFuelCostEstimate(BigDecimal totalFuelCostEstimate) {
        this.totalFuelCostEstimate = totalFuelCostEstimate;
    }

    public Double getTrafficRiskScore() {
        return trafficRiskScore;
    }

    public void setTrafficRiskScore(Double trafficRiskScore) {
        this.trafficRiskScore = trafficRiskScore;
    }

    public Double getOverallScore() {
        return overallScore;
    }

    public void setOverallScore(Double overallScore) {
        this.overallScore = overallScore;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getExplanationText() {
        return explanation;
    }

    public List<String> getStopOrder() {
        return stopOrder;
    }

    public void setStopOrder(List<String> stopOrder) {
        this.stopOrder = stopOrder;
    }

    public List<PlanLegResponse> getLegs() {
        return legs;
    }

    public void setLegs(List<PlanLegResponse> legs) {
        this.legs = legs;
    }

    public Boolean getIsSelected() {
        return isSelected;
    }

    public void setIsSelected(Boolean isSelected) {
        this.isSelected = isSelected;
    }
}
