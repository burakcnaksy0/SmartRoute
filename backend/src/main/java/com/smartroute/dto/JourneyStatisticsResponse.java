package com.smartroute.dto;

public class JourneyStatisticsResponse {
    private long totalTrips;
    private double totalDistanceKm;
    private double totalSavingsEur;

    public long getTotalTrips() {
        return totalTrips;
    }

    public void setTotalTrips(long totalTrips) {
        this.totalTrips = totalTrips;
    }

    public double getTotalDistanceKm() {
        return totalDistanceKm;
    }

    public void setTotalDistanceKm(double totalDistanceKm) {
        this.totalDistanceKm = totalDistanceKm;
    }

    public double getTotalSavingsEur() {
        return totalSavingsEur;
    }

    public void setTotalSavingsEur(double totalSavingsEur) {
        this.totalSavingsEur = totalSavingsEur;
    }
}
