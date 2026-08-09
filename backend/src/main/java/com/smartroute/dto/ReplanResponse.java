package com.smartroute.dto;

import java.util.List;

public class ReplanResponse {
    private boolean replanSuggested;
    private String message;
    private boolean gpsWeak;
    private JourneyPlanResponse proposedPlan;

    public ReplanResponse() {}

    public boolean isReplanSuggested() {
        return replanSuggested;
    }

    public void setReplanSuggested(boolean replanSuggested) {
        this.replanSuggested = replanSuggested;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isGpsWeak() {
        return gpsWeak;
    }

    public void setGpsWeak(boolean gpsWeak) {
        this.gpsWeak = gpsWeak;
    }

    public JourneyPlanResponse getProposedPlan() {
        return proposedPlan;
    }

    public void setProposedPlan(JourneyPlanResponse proposedPlan) {
        this.proposedPlan = proposedPlan;
    }
}
