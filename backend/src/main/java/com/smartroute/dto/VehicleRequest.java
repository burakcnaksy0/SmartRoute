package com.smartroute.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class VehicleRequest {

    @NotBlank(message = "Araç takma adı zorunludur.")
    private String nickname;

    @NotBlank(message = "Marka zorunludur.")
    private String brand;

    @NotBlank(message = "Model zorunludur.")
    private String model;

    @NotNull(message = "Model yılı zorunludur.")
    private Integer modelYear;

    @NotBlank(message = "Yakıt tipi zorunludur.")
    private String fuelType; // gasoline, diesel, lpg, hybrid, plugin_hybrid, electric

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
    private Boolean isDefault = false;

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
}
