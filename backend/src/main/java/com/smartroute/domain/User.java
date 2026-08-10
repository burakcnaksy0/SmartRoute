package com.smartroute.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(generator = "UUID")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "default_vehicle_type")
    private String defaultVehicleType;

    @Column(name = "weight_time", precision = 3, scale = 2)
    private BigDecimal weightTime = BigDecimal.valueOf(0.50);

    @Column(name = "weight_cost", precision = 3, scale = 2)
    private BigDecimal weightCost = BigDecimal.valueOf(0.50);

    @Column(name = "map_provider")
    private String mapProvider = "Google Haritalar";

    @Column(name = "distance_unit")
    private String distanceUnit = "Kilometre";

    @Column(name = "language")
    private String language = "Türkçe";

    @Column(name = "departure_alerts")
    private Boolean departureAlerts = true;

    @Column(name = "service_disruptions")
    private Boolean serviceDisruptions = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public User() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getDefaultVehicleType() {
        return defaultVehicleType;
    }

    public void setDefaultVehicleType(String defaultVehicleType) {
        this.defaultVehicleType = defaultVehicleType;
    }

    public java.math.BigDecimal getWeightTime() {
        return weightTime;
    }

    public void setWeightTime(java.math.BigDecimal weightTime) {
        this.weightTime = weightTime;
    }

    public java.math.BigDecimal getWeightCost() {
        return weightCost;
    }

    public void setWeightCost(java.math.BigDecimal weightCost) {
        this.weightCost = weightCost;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getMapProvider() {
        return mapProvider;
    }

    public void setMapProvider(String mapProvider) {
        this.mapProvider = mapProvider;
    }

    public String getDistanceUnit() {
        return distanceUnit;
    }

    public void setDistanceUnit(String distanceUnit) {
        this.distanceUnit = distanceUnit;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public Boolean getDepartureAlerts() {
        return departureAlerts;
    }

    public void setDepartureAlerts(Boolean departureAlerts) {
        this.departureAlerts = departureAlerts;
    }

    public Boolean getServiceDisruptions() {
        return serviceDisruptions;
    }

    public void setServiceDisruptions(Boolean serviceDisruptions) {
        this.serviceDisruptions = serviceDisruptions;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
