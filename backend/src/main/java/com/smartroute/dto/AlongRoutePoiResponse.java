package com.smartroute.dto;

public class AlongRoutePoiResponse {
    private String placeId;
    private String name;
    private String address;
    private Double lat;
    private Double lng;
    private Double rating;
    private Integer userRatingsTotal;
    private double detourDurationMinutes;
    private double detourDistanceMeters;

    public AlongRoutePoiResponse() {
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

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public Integer getUserRatingsTotal() {
        return userRatingsTotal;
    }

    public void setUserRatingsTotal(Integer userRatingsTotal) {
        this.userRatingsTotal = userRatingsTotal;
    }

    public double getDetourDurationMinutes() {
        return detourDurationMinutes;
    }

    public void setDetourDurationMinutes(double detourDurationMinutes) {
        this.detourDurationMinutes = detourDurationMinutes;
    }

    public double getDetourDistanceMeters() {
        return detourDistanceMeters;
    }

    public void setDetourDistanceMeters(double detourDistanceMeters) {
        this.detourDistanceMeters = detourDistanceMeters;
    }
}
