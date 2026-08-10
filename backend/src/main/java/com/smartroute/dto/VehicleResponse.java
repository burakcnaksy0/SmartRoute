package com.smartroute.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class VehicleResponse {

    private UUID id;
    private String nickname;
    private String brand;
    private String model;
    private Integer modelYear;
    private String fuelType;
    private BigDecimal fuelConsumptionLPer100km;
    private BigDecimal energyConsumptionKwhPer100km;
    private BigDecimal tankCapacityLiters;
    private BigDecimal batteryCapacityKwh;
    private Integer usableRangeKm;
    private String chargingConnectorType;
    private BigDecimal averageChargingSpeedKw;
    private String emissionClass;
    private String tollClass;
    private Integer heightCm;
    private Integer widthCm;
    private Integer lengthCm;
    private Integer weightKg;
    private Boolean isDefault;
    private LocalDateTime createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public Integer getModelYear() { return modelYear; }
    public void setModelYear(Integer modelYear) { this.modelYear = modelYear; }
    public String getFuelType() { return fuelType; }
    public void setFuelType(String fuelType) { this.fuelType = fuelType; }
    public BigDecimal getFuelConsumptionLPer100km() { return fuelConsumptionLPer100km; }
    public void setFuelConsumptionLPer100km(BigDecimal v) { this.fuelConsumptionLPer100km = v; }
    public BigDecimal getEnergyConsumptionKwhPer100km() { return energyConsumptionKwhPer100km; }
    public void setEnergyConsumptionKwhPer100km(BigDecimal v) { this.energyConsumptionKwhPer100km = v; }
    public BigDecimal getTankCapacityLiters() { return tankCapacityLiters; }
    public void setTankCapacityLiters(BigDecimal v) { this.tankCapacityLiters = v; }
    public BigDecimal getBatteryCapacityKwh() { return batteryCapacityKwh; }
    public void setBatteryCapacityKwh(BigDecimal v) { this.batteryCapacityKwh = v; }
    public Integer getUsableRangeKm() { return usableRangeKm; }
    public void setUsableRangeKm(Integer usableRangeKm) { this.usableRangeKm = usableRangeKm; }
    public String getChargingConnectorType() { return chargingConnectorType; }
    public void setChargingConnectorType(String v) { this.chargingConnectorType = v; }
    public BigDecimal getAverageChargingSpeedKw() { return averageChargingSpeedKw; }
    public void setAverageChargingSpeedKw(BigDecimal v) { this.averageChargingSpeedKw = v; }
    public String getEmissionClass() { return emissionClass; }
    public void setEmissionClass(String emissionClass) { this.emissionClass = emissionClass; }
    public String getTollClass() { return tollClass; }
    public void setTollClass(String tollClass) { this.tollClass = tollClass; }
    public Integer getHeightCm() { return heightCm; }
    public void setHeightCm(Integer heightCm) { this.heightCm = heightCm; }
    public Integer getWidthCm() { return widthCm; }
    public void setWidthCm(Integer widthCm) { this.widthCm = widthCm; }
    public Integer getLengthCm() { return lengthCm; }
    public void setLengthCm(Integer lengthCm) { this.lengthCm = lengthCm; }
    public Integer getWeightKg() { return weightKg; }
    public void setWeightKg(Integer weightKg) { this.weightKg = weightKg; }
    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
