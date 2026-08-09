package com.smartroute.mapper;

import com.smartroute.domain.Journey;
import com.smartroute.domain.JourneyPlan;
import com.smartroute.domain.JourneyStop;
import com.smartroute.domain.PlanLeg;
import com.smartroute.dto.JourneyPlanResponse;
import com.smartroute.dto.JourneyResponse;
import com.smartroute.dto.JourneyStopResponse;
import com.smartroute.dto.PlanLegResponse;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JourneyMapper {

    public JourneyResponse toResponse(Journey journey) {
        if (journey == null) {
            return null;
        }
        JourneyResponse response = new JourneyResponse();
        response.setId(journey.getId());
        response.setStartLat(journey.getStartLat());
        response.setStartLng(journey.getStartLng());
        response.setStartAddressText(journey.getStartAddressText());
        response.setStatus(journey.getStatus());
        response.setPlannedDepartureTime(journey.getPlannedDepartureTime());
        response.setDeadlineTime(journey.getDeadlineTime());
        response.setRawNlpInput(journey.getRawNlpInput());

        if (journey.getStops() != null) {
            response.setStops(journey.getStops().stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList()));
        }

        if (journey.getPlans() != null) {
            response.setPlans(journey.getPlans().stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList()));
        }

        return response;
    }

    public JourneyStopResponse toResponse(JourneyStop stop) {
        if (stop == null) {
            return null;
        }
        JourneyStopResponse response = new JourneyStopResponse();
        response.setId(stop.getId());
        response.setSequenceOrder(stop.getSequenceOrder());
        response.setOptimizedOrder(stop.getOptimizedOrder());
        response.setPlaceName(stop.getPlaceName());
        response.setLat(stop.getLat());
        response.setLng(stop.getLng());
        response.setVisitDurationMinutes(stop.getVisitDurationMinutes());
        response.setTimeWindowStart(stop.getTimeWindowStart());
        response.setTimeWindowEnd(stop.getTimeWindowEnd());
        response.setPriority(stop.getPriority());
        response.setStopType(stop.getStopType());
        return response;
    }

    public JourneyPlanResponse toResponse(JourneyPlan plan) {
        if (plan == null) {
            return null;
        }
        JourneyPlanResponse response = new JourneyPlanResponse();
        response.setPlanId(plan.getId());
        response.setLabel(plan.getPlanLabel());
        response.setTotalDurationSeconds(plan.getTotalDurationSeconds());
        response.setTotalDistanceMeters(plan.getTotalDistanceMeters());
        response.setTotalTollCost(plan.getTotalTollCost());
        response.setTotalFuelCostEstimate(plan.getTotalFuelCostEstimate());
        response.setTrafficRiskScore(plan.getTrafficRiskScore());
        response.setOverallScore(plan.getOverallScore());
        response.setExplanation(plan.getExplanationText());
        response.setIsSelected(plan.getIsSelected());

        if (plan.getLegs() != null) {
            response.setLegs(plan.getLegs().stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList()));
        }

        if (plan.getLegs() != null && !plan.getLegs().isEmpty()) {
            List<PlanLeg> sortedLegs = new ArrayList<>(plan.getLegs());
            sortedLegs.sort(Comparator.comparingInt(PlanLeg::getLegOrder));

            List<String> stopOrder = new ArrayList<>();
            for (PlanLeg leg : sortedLegs) {
                if (leg.getToStop() != null) {
                    stopOrder.add(leg.getToStop().getPlaceName());
                }
            }
            response.setStopOrder(stopOrder);
        } else {
            response.setStopOrder(Collections.emptyList());
        }

        return response;
    }

    public PlanLegResponse toResponse(PlanLeg leg) {
        if (leg == null) {
            return null;
        }
        PlanLegResponse response = new PlanLegResponse();
        response.setId(leg.getId());
        response.setFromStopId(leg.getFromStop() != null ? leg.getFromStop().getId() : null);
        response.setToStopId(leg.getToStop() != null ? leg.getToStop().getId() : null);
        response.setLegOrder(leg.getLegOrder());
        response.setDistanceMeters(leg.getDistanceMeters());
        response.setDurationSeconds(leg.getDurationSeconds());
        response.setPolylineEncoded(leg.getPolylineEncoded());
        response.setTollCost(leg.getTollCost());
        return response;
    }
}
