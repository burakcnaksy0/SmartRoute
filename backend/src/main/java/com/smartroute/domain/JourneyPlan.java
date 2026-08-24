package com.smartroute.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "journey_plans")
public class JourneyPlan {

    @Id
    @GeneratedValue(generator = "UUID")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journey_id", nullable = false)
    @JsonIgnore
    private Journey journey;

    @Column(name = "plan_label", nullable = false)
    private String planLabel; // 'fastest', 'cheapest', 'balanced', 'recommended'

    @Column(name = "total_duration_seconds", nullable = false)
    private Integer totalDurationSeconds;

    @Column(name = "total_distance_meters", nullable = false)
    private Integer totalDistanceMeters;

    @Column(name = "total_toll_cost", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalTollCost = BigDecimal.ZERO;

    @Column(name = "total_fuel_cost_estimate", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalFuelCostEstimate = BigDecimal.ZERO;

    @Column(name = "traffic_risk_score", nullable = false)
    private Double trafficRiskScore = 0.0;

    @Column(name = "overall_score", nullable = false)
    private Double overallScore = 0.0;

    @Column(name = "eta_confidence_percent")
    private Integer etaConfidencePercent;

    @Column(name = "is_selected", nullable = false)
    private Boolean isSelected = false;

    @Column(name = "explanation_text", columnDefinition = "TEXT")
    private String explanationText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("legOrder ASC")
    private List<PlanLeg> legs = new ArrayList<>();

    @Column(name = "estimated_energy_cost", precision = 10, scale = 2)
    private BigDecimal estimatedEnergyCost = BigDecimal.ZERO;

    @Column(name = "requires_charging_stop", nullable = false)
    private Boolean requiresChargingStop = false;

    @Column(name = "charging_stop_count", nullable = false)
    private Integer chargingStopCount = 0;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ChargingStop> chargingStops = new ArrayList<>();

    public BigDecimal getEstimatedEnergyCost() {
        return estimatedEnergyCost;
    }

    public void setEstimatedEnergyCost(BigDecimal estimatedEnergyCost) {
        this.estimatedEnergyCost = estimatedEnergyCost;
    }

    public Boolean getRequiresChargingStop() {
        return requiresChargingStop;
    }

    public void setRequiresChargingStop(Boolean requiresChargingStop) {
        this.requiresChargingStop = requiresChargingStop;
    }

    public Integer getChargingStopCount() {
        return chargingStopCount;
    }

    public void setChargingStopCount(Integer chargingStopCount) {
        this.chargingStopCount = chargingStopCount;
    }

    public List<ChargingStop> getChargingStops() {
        return chargingStops;
    }

    public void setChargingStops(List<ChargingStop> chargingStops) {
        this.chargingStops = chargingStops;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public JourneyPlan() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Journey getJourney() {
        return journey;
    }

    public void setJourney(Journey journey) {
        this.journey = journey;
    }

    public String getPlanLabel() {
        return planLabel;
    }

    public void setPlanLabel(String planLabel) {
        this.planLabel = planLabel;
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

    public Integer getEtaConfidencePercent() {
        return etaConfidencePercent;
    }

    public void setEtaConfidencePercent(Integer etaConfidencePercent) {
        this.etaConfidencePercent = etaConfidencePercent;
    }

    public Boolean getIsSelected() {
        return isSelected;
    }

    public void setIsSelected(Boolean isSelected) {
        this.isSelected = isSelected;
    }

    public String getExplanationText() {
        return explanationText;
    }

    public void setExplanationText(String explanationText) {
        this.explanationText = explanationText;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<PlanLeg> getLegs() {
        return legs;
    }

    public void setLegs(List<PlanLeg> legs) {
        this.legs = legs;
    }
}
