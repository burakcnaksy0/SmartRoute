package com.smartroute.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "journeys")
public class Journey {

    @Id
    @GeneratedValue(generator = "UUID")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "status", nullable = false)
    private String status; // 'draft', 'optimizing', 'planned', 'in_progress', 'completed', 'cancelled'

    @Column(name = "start_lat", nullable = false)
    private Double startLat;

    @Column(name = "start_lng", nullable = false)
    private Double startLng;

    @Column(name = "start_address_text")
    private String startAddressText;

    @Column(name = "destination_lat")
    private Double destinationLat;

    @Column(name = "destination_lng")
    private Double destinationLng;

    @Column(name = "destination_address_text")
    private String destinationAddressText;

    @Column(name = "planned_departure_time")
    private LocalDateTime plannedDepartureTime;

    @Column(name = "deadline_time")
    private LocalDateTime deadlineTime;

    @Column(name = "raw_nlp_input")
    private String rawNlpInput;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "journey", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sequenceOrder ASC")
    private List<JourneyStop> stops = new ArrayList<>();

    @OneToMany(mappedBy = "journey", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<JourneyPlan> plans = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @Column(name = "actual_distance_meters")
    private Integer actualDistanceMeters;

    @Column(name = "actual_duration_seconds")
    private Integer actualDurationSeconds;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "completion_status")
    private String completionStatus;

    public Vehicle getVehicle() {
        return vehicle;
    }

    public void setVehicle(Vehicle vehicle) {
        this.vehicle = vehicle;
    }

    public Integer getActualDistanceMeters() {
        return actualDistanceMeters;
    }

    public void setActualDistanceMeters(Integer actualDistanceMeters) {
        this.actualDistanceMeters = actualDistanceMeters;
    }

    public Integer getActualDurationSeconds() {
        return actualDurationSeconds;
    }

    public void setActualDurationSeconds(Integer actualDurationSeconds) {
        this.actualDurationSeconds = actualDurationSeconds;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public String getCompletionStatus() {
        return completionStatus;
    }

    public void setCompletionStatus(String completionStatus) {
        this.completionStatus = completionStatus;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "draft";
        }
    }

    public Journey() {
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getStartLat() {
        return startLat;
    }

    public void setStartLat(Double startLat) {
        this.startLat = startLat;
    }

    public Double getStartLng() {
        return startLng;
    }

    public void setStartLng(Double startLng) {
        this.startLng = startLng;
    }

    public String getStartAddressText() {
        return startAddressText;
    }

    public void setStartAddressText(String startAddressText) {
        this.startAddressText = startAddressText;
    }

    public Double getDestinationLat() {
        return destinationLat;
    }

    public void setDestinationLat(Double destinationLat) {
        this.destinationLat = destinationLat;
    }

    public Double getDestinationLng() {
        return destinationLng;
    }

    public void setDestinationLng(Double destinationLng) {
        this.destinationLng = destinationLng;
    }

    public String getDestinationAddressText() {
        return destinationAddressText;
    }

    public void setDestinationAddressText(String destinationAddressText) {
        this.destinationAddressText = destinationAddressText;
    }

    public LocalDateTime getPlannedDepartureTime() {
        return plannedDepartureTime;
    }

    public void setPlannedDepartureTime(LocalDateTime plannedDepartureTime) {
        this.plannedDepartureTime = plannedDepartureTime;
    }

    public LocalDateTime getDeadlineTime() {
        return deadlineTime;
    }

    public void setDeadlineTime(LocalDateTime deadlineTime) {
        this.deadlineTime = deadlineTime;
    }

    public String getRawNlpInput() {
        return rawNlpInput;
    }

    public void setRawNlpInput(String rawNlpInput) {
        this.rawNlpInput = rawNlpInput;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<JourneyStop> getStops() {
        return stops;
    }

    public void setStops(List<JourneyStop> stops) {
        this.stops = stops;
    }

    public List<JourneyPlan> getPlans() {
        return plans;
    }

    public void setPlans(List<JourneyPlan> plans) {
        this.plans = plans;
    }
}
