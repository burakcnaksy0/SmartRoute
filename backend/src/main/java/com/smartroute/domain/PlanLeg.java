package com.smartroute.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "plan_legs")
public class PlanLeg {

    @Id
    @GeneratedValue(generator = "UUID")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    @JsonIgnore
    private JourneyPlan plan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_stop_id")
    private JourneyStop fromStop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_stop_id", nullable = false)
    private JourneyStop toStop;

    @Column(name = "leg_order", nullable = false)
    private Integer legOrder;

    @Column(name = "distance_meters", nullable = false)
    private Integer distanceMeters;

    @Column(name = "duration_seconds", nullable = false)
    private Integer durationSeconds;

    @Column(name = "polyline_encoded", nullable = false, columnDefinition = "TEXT")
    private String polylineEncoded;

    @Column(name = "toll_cost", nullable = false, precision = 10, scale = 2)
    private BigDecimal tollCost = BigDecimal.ZERO;

    public PlanLeg() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public JourneyPlan getPlan() {
        return plan;
    }

    public void setPlan(JourneyPlan plan) {
        this.plan = plan;
    }

    public JourneyStop getFromStop() {
        return fromStop;
    }

    public void setFromStop(JourneyStop fromStop) {
        this.fromStop = fromStop;
    }

    public JourneyStop getToStop() {
        return toStop;
    }

    public void setToStop(JourneyStop toStop) {
        this.toStop = toStop;
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
