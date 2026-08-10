package com.smartroute.dto;

public class UserSettingsDto {
    private String mapProvider;
    private String distanceUnit;
    private String language;
    private Boolean departureAlerts;
    private Boolean serviceDisruptions;

    public UserSettingsDto() {
    }

    public UserSettingsDto(String mapProvider, String distanceUnit, String language, Boolean departureAlerts, Boolean serviceDisruptions) {
        this.mapProvider = mapProvider;
        this.distanceUnit = distanceUnit;
        this.language = language;
        this.departureAlerts = departureAlerts;
        this.serviceDisruptions = serviceDisruptions;
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
}
