package com.smartroute.dto;

import java.math.BigDecimal;

public class TripExpenseRequest {

    // entry_method: "gps_estimated" | "odometer" | "manual_receipt"
    private String entryMethod;
    private Integer odometerStartKm;
    private Integer odometerEndKm;
    private BigDecimal actualFuelLiters;
    private BigDecimal actualEnergyKwh;
    private BigDecimal actualFuelCost;
    private BigDecimal actualTollCost;
    private String receiptPhotoUrl;

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
    public String getReceiptPhotoUrl() { return receiptPhotoUrl; }
    public void setReceiptPhotoUrl(String receiptPhotoUrl) { this.receiptPhotoUrl = receiptPhotoUrl; }
}
