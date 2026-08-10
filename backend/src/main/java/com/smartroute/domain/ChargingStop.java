package com.smartroute.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "charging_stops")
public class ChargingStop {

    @Id
    @GeneratedValue(generator = "UUID")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    @JsonIgnore
    private JourneyPlan plan;

    @Column(name = "after_leg_order", nullable = false)
    private Integer afterLegOrder;

    @Column(name = "station_place_id")
    private String stationPlaceId;

    @Column(name = "estimated_charging_minutes", nullable = false)
    private Integer estimatedChargingMinutes;

    @Column(name = "estimated_soc_arrival_percent", nullable = false)
    private Integer estimatedSocArrivalPercent;

    public ChargingStop() {
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

    public Integer getAfterLegOrder() {
        return afterLegOrder;
    }

    public void setAfterLegOrder(Integer afterLegOrder) {
        this.afterLegOrder = afterLegOrder;
    }

    public String getStationPlaceId() {
        return stationPlaceId;
    }

    public void setStationPlaceId(String stationPlaceId) {
        this.stationPlaceId = stationPlaceId;
    }

    public Integer getEstimatedChargingMinutes() {
        return estimatedChargingMinutes;
    }

    public void setEstimatedChargingMinutes(Integer estimatedChargingMinutes) {
        this.estimatedChargingMinutes = estimatedChargingMinutes;
    }

    public Integer getEstimatedSocArrivalPercent() {
        return estimatedSocArrivalPercent;
    }

    public void setEstimatedSocArrivalPercent(Integer estimatedSocArrivalPercent) {
        this.estimatedSocArrivalPercent = estimatedSocArrivalPercent;
    }
}
