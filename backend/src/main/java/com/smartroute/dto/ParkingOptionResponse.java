package com.smartroute.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ParkingOptionResponse {
    private String placeId;
    private String name;
    private String address;
    private Double lat;
    private Double lng;
    private int distanceMeters;
    private double walkTimeMinutes;
    private double parkingSearchTimeEstimateMinutes;
    private LocalDateTime effectiveArrivalTime;
    private Double occupancyRate; // 0.0 to 1.0
    private BigDecimal costEstimate;
    private String paymentType; // 'free', 'paid', 'unknown'

    public ParkingOptionResponse() {
    }

    public String getPlaceId() {
        return placeId;
    }

    public void setPlaceId(String placeId) {
        this.placeId = placeId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public Double getLat() {
        return lat;
    }

    public void setLat(Double lat) {
        this.lat = lat;
    }

    public Double getLng() {
        return lng;
    }

    public void setLng(Double lng) {
        this.lng = lng;
    }

    public int getDistanceMeters() {
        return distanceMeters;
    }

    public void setDistanceMeters(int distanceMeters) {
        this.distanceMeters = distanceMeters;
    }

    public double getWalkTimeMinutes() {
        return walkTimeMinutes;
    }

    public void setWalkTimeMinutes(double walkTimeMinutes) {
        this.walkTimeMinutes = walkTimeMinutes;
    }

    public double getParkingSearchTimeEstimateMinutes() {
        return parkingSearchTimeEstimateMinutes;
    }

    public void setParkingSearchTimeEstimateMinutes(double parkingSearchTimeEstimateMinutes) {
        this.parkingSearchTimeEstimateMinutes = parkingSearchTimeEstimateMinutes;
    }

    public LocalDateTime getEffectiveArrivalTime() {
        return effectiveArrivalTime;
    }

    public void setEffectiveArrivalTime(LocalDateTime effectiveArrivalTime) {
        this.effectiveArrivalTime = effectiveArrivalTime;
    }

    public Double getOccupancyRate() {
        return occupancyRate;
    }

    public void setOccupancyRate(Double occupancyRate) {
        this.occupancyRate = occupancyRate;
    }

    public BigDecimal getCostEstimate() {
        return costEstimate;
    }

    public void setCostEstimate(BigDecimal costEstimate) {
        this.costEstimate = costEstimate;
    }

    public String getPaymentType() {
        return paymentType;
    }

    public void setPaymentType(String paymentType) {
        this.paymentType = paymentType;
    }
}
