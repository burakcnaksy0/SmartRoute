package com.smartroute.dto;

import java.util.List;
import java.util.UUID;

public class OptimizeRequest {

    public static class GeoPointDto {
        private Double lat;
        private Double lng;

        public GeoPointDto() {}

        public GeoPointDto(Double lat, Double lng) {
            this.lat = lat;
            this.lng = lng;
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
    }

    public static class PreferencesDto {
        private String profileType; // 'fast', 'economic', 'stress_free', 'comfortable', 'eco', 'balanced'
        private boolean avoidTolls;
        private boolean avoidHighways;
        private boolean preserveStopOrder;

        public PreferencesDto() {}

        public String getProfileType() {
            return profileType;
        }

        public void setProfileType(String profileType) {
            this.profileType = profileType;
        }

        public boolean isAvoidTolls() {
            return avoidTolls;
        }

        public void setAvoidTolls(boolean avoidTolls) {
            this.avoidTolls = avoidTolls;
        }

        public boolean isAvoidHighways() {
            return avoidHighways;
        }

        public void setAvoidHighways(boolean avoidHighways) {
            this.avoidHighways = avoidHighways;
        }

        public boolean isPreserveStopOrder() {
            return preserveStopOrder;
        }

        public void setPreserveStopOrder(boolean preserveStopOrder) {
            this.preserveStopOrder = preserveStopOrder;
        }
    }

    private GeoPointDto startLocation;
    private GeoPointDto destination;
    private List<JourneyStopRequest> stops;
    private boolean returnToStart;
    private PreferencesDto preferences;
    private String vehicleType;
    private UUID vehicleId;
    private Integer currentStateOfChargePercent;

    public OptimizeRequest() {
    }

    public GeoPointDto getStartLocation() {
        return startLocation;
    }

    public void setStartLocation(GeoPointDto startLocation) {
        this.startLocation = startLocation;
    }

    public GeoPointDto getDestination() {
        return destination;
    }

    public void setDestination(GeoPointDto destination) {
        this.destination = destination;
    }

    public List<JourneyStopRequest> getStops() {
        return stops;
    }

    public void setStops(List<JourneyStopRequest> stops) {
        this.stops = stops;
    }

    public boolean isReturnToStart() {
        return returnToStart;
    }

    public void setReturnToStart(boolean returnToStart) {
        this.returnToStart = returnToStart;
    }

    public PreferencesDto getPreferences() {
        return preferences;
    }

    public void setPreferences(PreferencesDto preferences) {
        this.preferences = preferences;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public UUID getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(UUID vehicleId) {
        this.vehicleId = vehicleId;
    }

    public Integer getCurrentStateOfChargePercent() {
        return currentStateOfChargePercent;
    }

    public void setCurrentStateOfChargePercent(Integer currentStateOfChargePercent) {
        this.currentStateOfChargePercent = currentStateOfChargePercent;
    }
}
