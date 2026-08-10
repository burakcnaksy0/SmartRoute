package com.smartroute.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "trip_expenses")
public class TripExpense {

    @Id
    @GeneratedValue(generator = "UUID")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journey_id", nullable = false, unique = true)
    private Journey journey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @Column(name = "entry_method", nullable = false)
    private String entryMethod; // gps_estimated, odometer, manual_receipt

    @Column(name = "odometer_start_km")
    private Integer odometerStartKm;

    @Column(name = "odometer_end_km")
    private Integer odometerEndKm;

    @Column(name = "actual_fuel_liters", precision = 10, scale = 2)
    private BigDecimal actualFuelLiters;

    @Column(name = "actual_energy_kwh", precision = 10, scale = 2)
    private BigDecimal actualEnergyKwh;

    @Column(name = "actual_fuel_cost", nullable = false, precision = 10, scale = 2)
    private BigDecimal actualFuelCost = BigDecimal.ZERO;

    @Column(name = "actual_toll_cost", precision = 10, scale = 2)
    private BigDecimal actualTollCost;

    @Column(name = "estimated_fuel_cost_at_planning", nullable = false, precision = 10, scale = 2)
    private BigDecimal estimatedFuelCostAtPlanning = BigDecimal.ZERO;

    @Column(name = "variance_percent", precision = 10, scale = 2)
    private BigDecimal variancePercent;

    @Column(name = "receipt_photo_url")
    private String receiptPhotoUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public TripExpense() {
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

    public Vehicle getVehicle() {
        return vehicle;
    }

    public void setVehicle(Vehicle vehicle) {
        this.vehicle = vehicle;
    }

    public String getEntryMethod() {
        return entryMethod;
    }

    public void setEntryMethod(String entryMethod) {
        this.entryMethod = entryMethod;
    }

    public Integer getOdometerStartKm() {
        return odometerStartKm;
    }

    public void setOdometerStartKm(Integer odometerStartKm) {
        this.odometerStartKm = odometerStartKm;
    }

    public Integer getOdometerEndKm() {
        return odometerEndKm;
    }

    public void setOdometerEndKm(Integer odometerEndKm) {
        this.odometerEndKm = odometerEndKm;
    }

    public BigDecimal getActualFuelLiters() {
        return actualFuelLiters;
    }

    public void setActualFuelLiters(BigDecimal actualFuelLiters) {
        this.actualFuelLiters = actualFuelLiters;
    }

    public BigDecimal getActualEnergyKwh() {
        return actualEnergyKwh;
    }

    public void setActualEnergyKwh(BigDecimal actualEnergyKwh) {
        this.actualEnergyKwh = actualEnergyKwh;
    }

    public BigDecimal getActualFuelCost() {
        return actualFuelCost;
    }

    public void setActualFuelCost(BigDecimal actualFuelCost) {
        this.actualFuelCost = actualFuelCost;
    }

    public BigDecimal getActualTollCost() {
        return actualTollCost;
    }

    public void setActualTollCost(BigDecimal actualTollCost) {
        this.actualTollCost = actualTollCost;
    }

    public BigDecimal getEstimatedFuelCostAtPlanning() {
        return estimatedFuelCostAtPlanning;
    }

    public void setEstimatedFuelCostAtPlanning(BigDecimal estimatedFuelCostAtPlanning) {
        this.estimatedFuelCostAtPlanning = estimatedFuelCostAtPlanning;
    }

    public BigDecimal getVariancePercent() {
        return variancePercent;
    }

    public void setVariancePercent(BigDecimal variancePercent) {
        this.variancePercent = variancePercent;
    }

    public String getReceiptPhotoUrl() {
        return receiptPhotoUrl;
    }

    public void setReceiptPhotoUrl(String receiptPhotoUrl) {
        this.receiptPhotoUrl = receiptPhotoUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
