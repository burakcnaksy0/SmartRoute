package com.smartroute.service.journey;

import com.smartroute.domain.Journey;
import com.smartroute.domain.JourneyPlan;
import com.smartroute.domain.PlanLeg;
import com.smartroute.dto.DepartureSuggestionResponse;
import com.smartroute.dto.DepartureSuggestionsRequest;
import com.smartroute.repository.JourneyRepository;
import com.smartroute.service.routing.GeoPoint;
import com.smartroute.service.routing.RouteCandidate;
import com.smartroute.service.routing.RouteOptions;
import com.smartroute.service.routing.RoutingProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class DepartureOptimizerService {

    private static final Logger log = LoggerFactory.getLogger(DepartureOptimizerService.class);

    private final JourneyRepository journeyRepository;
    private final RoutingProvider routingProvider;

    public DepartureOptimizerService(JourneyRepository journeyRepository, RoutingProvider routingProvider) {
        this.journeyRepository = journeyRepository;
        this.routingProvider = routingProvider;
    }

    @Transactional(readOnly = true)
    public List<DepartureSuggestionResponse> getDepartureSuggestions(UUID journeyId, DepartureSuggestionsRequest request, com.smartroute.domain.User user) {
        LocalDateTime targetArrival = request.getTargetArrivalTime();
        if (targetArrival == null) {
            throw new IllegalArgumentException("Hedef varış saati boş olamaz.");
        }
        if (targetArrival.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Hedef varış saati geçmişte olamaz.");
        }

        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new IllegalArgumentException("Yolculuk bulunamadı."));
        if (!journey.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bu yolculuğa erişim yetkiniz yok.");
        }

        if (journey.getPlans() == null || journey.getPlans().isEmpty()) {
            throw new IllegalArgumentException("Yolculuk için henüz plan oluşturulmamış. Lütfen önce optimize edin.");
        }

        // Use selected plan or default to recommended plan
        JourneyPlan basePlan = journey.getPlans().stream()
                .filter(JourneyPlan::getIsSelected)
                .findFirst()
                .orElse(journey.getPlans().stream()
                        .filter(p -> "recommended".equalsIgnoreCase(p.getPlanLabel()))
                        .findFirst()
                        .orElse(journey.getPlans().get(0)));

        List<PlanLeg> legs = new ArrayList<>(basePlan.getLegs());
        legs.sort(Comparator.comparing(PlanLeg::getLegOrder));

        // Generate candidate departure times: from targetArrival - 2 hours to targetArrival - 15 mins in 15-minute intervals
        List<LocalDateTime> candidates = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime currentCandidate = targetArrival.minusMinutes(15);
        LocalDateTime earliestCandidate = targetArrival.minusHours(2);

        while (!currentCandidate.isBefore(earliestCandidate)) {
            if (currentCandidate.isAfter(now)) {
                candidates.add(currentCandidate);
            }
            currentCandidate = currentCandidate.minusMinutes(15);
        }

        // Sort chronologically (earliest to latest)
        candidates.sort(Comparator.naturalOrder());

        List<DepartureSuggestionResponse> suggestions = new ArrayList<>();

        for (LocalDateTime depTime : candidates) {
            try {
                // Compute total duration for Best Guess, Optimistic, and Pessimistic timelines
                int bestDuration = simulateTimeline(journey, legs, depTime, "BEST_GUESS");
                int optDuration = simulateTimeline(journey, legs, depTime, "OPTIMISTIC");
                int pessDuration = simulateTimeline(journey, legs, depTime, "PESSIMISTIC");

                // Calculate confidence percentage
                long bufferSeconds = Duration.between(depTime, targetArrival).toSeconds();
                double confidence = calculateConfidence(bestDuration, optDuration, pessDuration, bufferSeconds);

                suggestions.add(new DepartureSuggestionResponse(depTime, confidence, bestDuration));
            } catch (Exception e) {
                log.error("Departure suggestion simulation failed for " + depTime + ": ", e);
                // Fallback to static values if external computation fails
                long bufferSeconds = Duration.between(depTime, targetArrival).toSeconds();
                int staticDuration = basePlan.getTotalDurationSeconds();
                double confidence = bufferSeconds >= staticDuration ? 0.90 : 0.10;
                suggestions.add(new DepartureSuggestionResponse(depTime, confidence, staticDuration));
            }
        }

        return suggestions;
    }

    private int simulateTimeline(Journey journey, List<PlanLeg> legs, LocalDateTime depTime, String trafficModel) {
        LocalDateTime currentTime = depTime;
        int durationSum = 0;

        for (int i = 0; i < legs.size(); i++) {
            PlanLeg leg = legs.get(i);
            GeoPoint from = getFromPoint(leg, journey);
            GeoPoint to = getToPoint(leg, journey);

            RouteOptions options = new RouteOptions();
            options.setAvoidTolls(false); // Default or extract from plan
            options.setAvoidHighways(false);
            options.setDepartureTime(currentTime);
            options.setTrafficModel(trafficModel);

            List<RouteCandidate> candidates = routingProvider.computeRoute(from, to, options);
            if (candidates.isEmpty()) {
                throw new RuntimeException("Rota hesaplanamadı.");
            }
            RouteCandidate bestCandidate = candidates.get(0);
            int legDur = bestCandidate.getDurationSeconds();

            durationSum += legDur;
            currentTime = currentTime.plusSeconds(legDur);

            // Add visit duration if this is not the last leg
            if (i < legs.size() - 1 && leg.getToStop() != null) {
                int visitSec = leg.getToStop().getVisitDurationMinutes() * 60;
                durationSum += visitSec;
                currentTime = currentTime.plusSeconds(visitSec);
            }
        }

        return durationSum;
    }

    private GeoPoint getFromPoint(PlanLeg leg, Journey journey) {
        if (leg.getFromStop() == null) {
            return new GeoPoint(journey.getStartLat(), journey.getStartLng());
        } else {
            return new GeoPoint(leg.getFromStop().getLat(), leg.getFromStop().getLng());
        }
    }

    private GeoPoint getToPoint(PlanLeg leg, Journey journey) {
        if (leg.getLegOrder() > journey.getStops().size()) {
            return new GeoPoint(journey.getStartLat(), journey.getStartLng());
        } else {
            return new GeoPoint(leg.getToStop().getLat(), leg.getToStop().getLng());
        }
    }

    private double calculateConfidence(int best, int opt, int pess, long bufferSeconds) {
        if (bufferSeconds <= 0) {
            return 0.0;
        }

        double mean = best;
        // Standard deviation approximated by range (pessimistic - optimistic) / 4
        // To handle areas without traffic data, enforce standard deviation of at least 10% of mean or a minimum of 5 minutes
        double stdDev = Math.max((pess - opt) / 4.0, Math.max(mean * 0.1, 300.0));

        double zScore = (bufferSeconds - mean) / stdDev;
        double confidence = 0.5 * (1.0 + erf(zScore / Math.sqrt(2.0)));

        // Round to 4 decimal places
        return Math.round(confidence * 10000.0) / 10000.0;
    }

    // Abramowitz and Stegun formula 7.1.26 for error function
    private double erf(double x) {
        double a1 =  0.254829592;
        double a2 = -0.284496736;
        double a3 =  1.421413741;
        double a4 = -1.453152027;
        double a5 =  1.061405429;
        double p  =  0.3275911;

        int sign = 1;
        if (x < 0) {
            sign = -1;
        }
        x = Math.abs(x);

        double t = 1.0 / (1.0 + p * x);
        double y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return sign * y;
    }
}
