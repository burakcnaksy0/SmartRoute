package com.smartroute.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "route_feedbacks")
public class RouteFeedback {

    @Id
    @GeneratedValue(generator = "UUID")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journey_id", nullable = false)
    private Journey journey;

    @Column(name = "selected_plan_label", nullable = false)
    private String selectedPlanLabel;

    @Column(name = "rejected_plan_labels", length = 500)
    private String rejectedPlanLabels; // comma-separated values

    @Column(name = "actual_duration_seconds")
    private Integer actualDurationSeconds;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public RouteFeedback() {
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

    public Journey getJourney() {
        return journey;
    }

    public void setJourney(Journey journey) {
        this.journey = journey;
    }

    public String getSelectedPlanLabel() {
        return selectedPlanLabel;
    }

    public void setSelectedPlanLabel(String selectedPlanLabel) {
        this.selectedPlanLabel = selectedPlanLabel;
    }

    public String getRejectedPlanLabels() {
        return rejectedPlanLabels;
    }

    public void setRejectedPlanLabels(String rejectedPlanLabels) {
        this.rejectedPlanLabels = rejectedPlanLabels;
    }

    public Integer getActualDurationSeconds() {
        return actualDurationSeconds;
    }

    public void setActualDurationSeconds(Integer actualDurationSeconds) {
        this.actualDurationSeconds = actualDurationSeconds;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
