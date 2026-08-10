package com.smartroute.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(generator = "UUID")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "nickname", nullable = false)
    private String nickname;

    @Column(name = "brand", nullable = false)
    private String brand;

    @Column(name = "model", nullable = false)
    private String model;

    @Column(name = "model_year", nullable = false)
    private Integer modelYear;

    @Column(name = "fuel_type", nullable = false)
    private String fuelType; // gasoline, diesel, lpg, hybrid, plugin_hybrid, electric

    @Column(name = "fuel_consumption_l_per_100km", precision = 10, scale = 2)
    private BigDecimal fuelConsumptionLPer100km;

    @Column(name = "energy_consumption_kwh_per_100km", precision = 10, scale = 2)
    private BigDecimal energyConsumptionKwhPer100km;

    @Column(name = "tank_capacity_liters", precision = 10, scale = 2)
    private BigDecimal tankCapacityLiters;

    @Column(name = "battery_capacity_kwh", precision = 10, scale = 2)
    private BigDecimal batteryCapacityKwh;

    @Column(name = "usable_range_km")
    private Integer usableRangeKm;

    @Column(name = "charging_connector_type")
    private String chargingConnectorType;

    @Column(name = "average_charging_speed_kw", precision = 10, scale = 2)
    private BigDecimal averageChargingSpeedKw;

    @Column(name = "emission_class")
    private String emissionClass;

    @Column(name = "toll_class")
    private String tollClass;

    @Column(name = "height_cm")
    private Integer heightCm;

    @Column(name = "width_cm")
    private Integer widthCm;

    @Column(name = "length_cm")
    private Integer lengthCm;

    @Column(name = "weight_kg")
    private Integer weightKg;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Vehicle() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Integer getModelYear() {
        return modelYear;
    }

    public void setModelYear(Integer modelYear) {
        this.modelYear = modelYear;
    }

    public String getFuelType() {
        return fuelType;
    }

    public void setFuelType(String fuelType) {
        this.fuelType = fuelType;
    }

    public BigDecimal getFuelConsumptionLPer100km() {
        return fuelConsumptionLPer100km;
    }

    public void setFuelConsumptionLPer100km(BigDecimal fuelConsumptionLPer100km) {
        this.fuelConsumptionLPer100km = fuelConsumptionLPer100km;
    }

    public BigDecimal getEnergyConsumptionKwhPer100km() {
        return energyConsumptionKwhPer100km;
    }

    public void setEnergyConsumptionKwhPer100km(BigDecimal energyConsumptionKwhPer100km) {
        this.energyConsumptionKwhPer100km = energyConsumptionKwhPer100km;
    }

    public BigDecimal getTankCapacityLiters() {
        return tankCapacityLiters;
    }

    public void setTankCapacityLiters(BigDecimal tankCapacityLiters) {
        this.tankCapacityLiters = tankCapacityLiters;
    }

    public BigDecimal getBatteryCapacityKwh() {
        return batteryCapacityKwh;
    }

    public void setBatteryCapacityKwh(BigDecimal batteryCapacityKwh) {
        this.batteryCapacityKwh = batteryCapacityKwh;
    }

    public Integer getUsableRangeKm() {
        return usableRangeKm;
    }

    public void setUsableRangeKm(Integer usableRangeKm) {
        this.usableRangeKm = usableRangeKm;
    }

    public String getChargingConnectorType() {
        return chargingConnectorType;
    }

    public void setChargingConnectorType(String chargingConnectorType) {
        this.chargingConnectorType = chargingConnectorType;
    }

    public BigDecimal getAverageChargingSpeedKw() {
        return averageChargingSpeedKw;
    }

    public void setAverageChargingSpeedKw(BigDecimal averageChargingSpeedKw) {
        this.averageChargingSpeedKw = averageChargingSpeedKw;
    }

    public String getEmissionClass() {
        return emissionClass;
    }

    public void setEmissionClass(String emissionClass) {
        this.emissionClass = emissionClass;
    }

    public String getTollClass() {
        return tollClass;
    }

    public void setTollClass(String tollClass) {
        this.tollClass = tollClass;
    }

    public Integer getHeightCm() {
        return heightCm;
    }

    public void setHeightCm(Integer heightCm) {
        this.heightCm = heightCm;
    }

    public Integer getWidthCm() {
        return widthCm;
    }

    public void setWidthCm(Integer widthCm) {
        this.widthCm = widthCm;
    }

    public Integer getLengthCm() {
        return lengthCm;
    }

    public void setLengthCm(Integer lengthCm) {
        this.lengthCm = lengthCm;
    }

    public Integer getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Integer weightKg) {
        this.weightKg = weightKg;
    }

    public Boolean getIsDefault() {
        return isDefault;
    }

    public void setIsDefault(Boolean isDefault) {
        this.isDefault = isDefault;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
