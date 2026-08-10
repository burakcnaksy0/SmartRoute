package com.smartroute.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class TripExpenseResponse {

    private UUID id;
    private UUID journeyId;
    private String entryMethod;
    private Integer odometerStartKm;
    private Integer odometerEndKm;
    private BigDecimal actualFuelLiters;
    private BigDecimal actualEnergyKwh;
    private BigDecimal actualFuelCost;
    private BigDecimal actualTollCost;
    private BigDecimal estimatedFuelCostAtPlanning;
    private BigDecimal variancePercent;
    private String receiptPhotoUrl;
    private LocalDateTime createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getJourneyId() { return journeyId; }
    public void setJourneyId(UUID journeyId) { this.journeyId = journeyId; }
    public String getEntryMethod() { return entryMethod; }
    public void setEntryMethod(String entryMethod) { this.entryMethod = entryMethod; }
    public Integer getOdometerStartKm() { return odometerStartKm; }
    public void setOdometerStartKm(Integer odometerStartKm) { this.odometerStartKm = odometerStartKm; }
    public Integer getOdometerEndKm() { return odometerEndKm; }
    public void setOdometerEndKm(Integer odometerEndKm) { this.odometerEndKm = odometerEndKm; }
    public BigDecimal getActualFuelLiters() { return actualFuelLiters; }
    public void setActualFuelLiters(BigDecimal actualFuelLiters) { this.actualFuelLiters = actualFuelLiters; }
    public BigDecimal getActualEnergyKwh() { return actualEnergyKwh; }
    public void setActualEnergyKwh(BigDecimal actualEnergyKwh) { this.actualEnergyKwh = actualEnergyKwh; }
    public BigDecimal getActualFuelCost() { return actualFuelCost; }
    public void setActualFuelCost(BigDecimal actualFuelCost) { this.actualFuelCost = actualFuelCost; }
    public BigDecimal getActualTollCost() { return actualTollCost; }
    public void setActualTollCost(BigDecimal actualTollCost) { this.actualTollCost = actualTollCost; }
    public BigDecimal getEstimatedFuelCostAtPlanning() { return estimatedFuelCostAtPlanning; }
    public void setEstimatedFuelCostAtPlanning(BigDecimal v) { this.estimatedFuelCostAtPlanning = v; }
    public BigDecimal getVariancePercent() { return variancePercent; }
    public void setVariancePercent(BigDecimal variancePercent) { this.variancePercent = variancePercent; }
    public String getReceiptPhotoUrl() { return receiptPhotoUrl; }
    public void setReceiptPhotoUrl(String receiptPhotoUrl) { this.receiptPhotoUrl = receiptPhotoUrl; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
