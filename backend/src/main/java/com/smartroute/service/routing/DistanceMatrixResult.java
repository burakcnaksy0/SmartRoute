package com.smartroute.service.routing;

public class DistanceMatrixResult {
    private long[][] durations; // rows: origins, columns: destinations
    private long[][] distances; // rows: origins, columns: destinations

    public DistanceMatrixResult() {
    }

    public DistanceMatrixResult(long[][] durations, long[][] distances) {
        this.durations = durations;
        this.distances = distances;
    }

    public long[][] getDurations() {
        return durations;
    }

    public void setDurations(long[][] durations) {
        this.durations = durations;
    }

    public long[][] getDistances() {
        return distances;
    }

    public void setDistances(long[][] distances) {
        this.distances = distances;
    }
}
