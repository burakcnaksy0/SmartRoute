package com.smartroute.service.journey;

import com.smartroute.domain.*;
import com.smartroute.dto.*;
import com.smartroute.exception.InfeasiblePlanException;
import com.smartroute.mapper.JourneyMapper;
import com.smartroute.repository.JourneyPlanRepository;
import com.smartroute.repository.JourneyRepository;
import com.smartroute.service.routing.DistanceMatrixResult;
import com.smartroute.service.routing.GeoPoint;
import com.smartroute.service.routing.RouteCandidate;
import com.smartroute.service.routing.RouteOptions;
import com.smartroute.service.routing.RoutingProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class JourneyPlanningService {

    private final JourneyRepository journeyRepository;
    private final JourneyPlanRepository journeyPlanRepository;
    private final RoutingProvider routingProvider;
    private final OptimizationEngine optimizationEngine;
    private final ExplainabilityService explainabilityService;
    private final JourneyMapper journeyMapper;

    public JourneyPlanningService(
            JourneyRepository journeyRepository,
            JourneyPlanRepository journeyPlanRepository,
            RoutingProvider routingProvider,
            OptimizationEngine optimizationEngine,
            ExplainabilityService explainabilityService,
            JourneyMapper journeyMapper) {
        this.journeyRepository = journeyRepository;
        this.journeyPlanRepository = journeyPlanRepository;
        this.routingProvider = routingProvider;
        this.optimizationEngine = optimizationEngine;
        this.explainabilityService = explainabilityService;
        this.journeyMapper = journeyMapper;
    }

    @Transactional
    public JourneyResponse createJourneyDraft(JourneyRequest request, User user) {
        validateJourneyRequest(request);

        Journey journey = new Journey();
        journey.setUser(user);
        journey.setStartLat(request.getStartLat());
        journey.setStartLng(request.getStartLng());
        journey.setStartAddressText(request.getStartAddressText());
        journey.setPlannedDepartureTime(request.getPlannedDepartureTime() != null ? request.getPlannedDepartureTime() : LocalDateTime.now());
        journey.setDeadlineTime(request.getDeadlineTime());
        journey.setStatus("draft");

        if (request.getStops() != null) {
            int seq = 1;
            for (JourneyStopRequest stopReq : request.getStops()) {
                JourneyStop stop = new JourneyStop();
                stop.setJourney(journey);
                stop.setSequenceOrder(seq++);
                stop.setPlaceName(stopReq.getPlaceName());
                stop.setLat(stopReq.getLat());
                stop.setLng(stopReq.getLng());
                stop.setVisitDurationMinutes(stopReq.getVisitDurationMinutes() != null ? stopReq.getVisitDurationMinutes() : 15);
                stop.setTimeWindowStart(stopReq.getTimeWindowStart());
                stop.setTimeWindowEnd(stopReq.getTimeWindowEnd());
                stop.setPriority(stopReq.getPriority() != null ? stopReq.getPriority() : "normal");
                stop.setStopType(stopReq.getStopType() != null ? stopReq.getStopType() : "errand");
                journey.getStops().add(stop);
            }
        }

        Journey saved = journeyRepository.save(journey);
        return journeyMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public JourneyResponse getJourney(UUID id, User user) {
        Journey journey = journeyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Yolculuk bulunamadı."));
        if (!journey.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bu yolculuğa erişim yetkiniz yok.");
        }
        return journeyMapper.toResponse(journey);
    }

    @Transactional(readOnly = true)
    public List<JourneyPlanResponse> getJourneyPlans(UUID journeyId, User user) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new IllegalArgumentException("Yolculuk bulunamadı."));
        if (!journey.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bu yolculuğa erişim yetkiniz yok.");
        }
        return journey.getPlans().stream()
                .map(journeyMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public JourneyPlanResponse selectPlan(UUID journeyId, UUID planId, User user) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new IllegalArgumentException("Yolculuk bulunamadı."));
        if (!journey.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bu yolculuğa erişim yetkiniz yok.");
        }

        JourneyPlan selected = null;
        for (JourneyPlan plan : journey.getPlans()) {
            if (plan.getId().equals(planId)) {
                plan.setIsSelected(true);
                selected = plan;
            } else {
                plan.setIsSelected(false);
            }
        }

        if (selected == null) {
            throw new IllegalArgumentException("Plan bulunamadı.");
        }

        journeyRepository.save(journey);
        return journeyMapper.toResponse(selected);
    }

    @Transactional
    public JourneyResponse optimizeJourney(UUID id, OptimizeRequest request, User user) {
        Journey journey = journeyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Yolculuk bulunamadı."));
        if (!journey.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bu yolculuğa erişim yetkiniz yok.");
        }

        // 1. If payload contains updated startLocation and stops, save them first
        if (request.getStartLocation() != null) {
            journey.setStartLat(request.getStartLocation().getLat());
            journey.setStartLng(request.getStartLocation().getLng());
        }

        if (request.getStops() != null && !request.getStops().isEmpty()) {
            journey.getStops().clear();
            int seq = 1;
            for (JourneyStopRequest stopReq : request.getStops()) {
                JourneyStop stop = new JourneyStop();
                stop.setJourney(journey);
                stop.setSequenceOrder(seq++);
                stop.setPlaceName(stopReq.getPlaceName());
                stop.setLat(stopReq.getLat());
                stop.setLng(stopReq.getLng());
                stop.setVisitDurationMinutes(stopReq.getVisitDurationMinutes() != null ? stopReq.getVisitDurationMinutes() : 15);
                stop.setTimeWindowStart(stopReq.getTimeWindowStart());
                stop.setTimeWindowEnd(stopReq.getTimeWindowEnd());
                stop.setPriority(stopReq.getPriority() != null ? stopReq.getPriority() : "normal");
                stop.setStopType(stopReq.getStopType() != null ? stopReq.getStopType() : "errand");
                journey.getStops().add(stop);
            }
        }

        journey.setStatus("optimizing");
        journeyRepository.saveAndFlush(journey);

        // 2. Validations
        if (journey.getStops().isEmpty()) {
            throw new IllegalArgumentException("En az bir durak bulunmalıdır.");
        }
        validateStopsAndCoordinates(journey);

        // 3. Build Origins/Destinations list for Distance Matrix
        List<GeoPoint> points = new ArrayList<>();
        points.add(new GeoPoint(journey.getStartLat(), journey.getStartLng()));
        for (JourneyStop stop : journey.getStops()) {
            points.add(new GeoPoint(stop.getLat(), stop.getLng()));
        }

        // 4. Fetch Matrix
        DistanceMatrixResult matrix = routingProvider.computeMatrix(points, points);

        // 5. Run Optimization Engine
        List<OptimizationEngine.CandidatePath> feasiblePaths = optimizationEngine.findFeasiblePaths(
                journey.getStops(),
                matrix,
                journey.getPlannedDepartureTime(),
                request.isReturnToStart()
        );

        // Clean previous plans
        journey.getPlans().clear();

        // 6. Generate detailed routes for each profile candidate
        String userProfile = (request.getPreferences() != null && request.getPreferences().getProfileType() != null)
                ? request.getPreferences().getProfileType() : "balanced";

        List<String> profilesToCompute = List.of("recommended", "fastest", "cheapest");
        Map<String, String> profileToEngineProfile = Map.of(
                "recommended", userProfile,
                "fastest", "fast",
                "cheapest", "economic"
        );

        for (String profileLabel : profilesToCompute) {
            String engineProfile = profileToEngineProfile.get(profileLabel);
            List<Integer> bestPerm = optimizationEngine.findBestPermutationForProfile(feasiblePaths, engineProfile);

            // Compute exact routes leg-by-leg
            JourneyPlan plan = buildDetailedPlan(journey, bestPerm, request, profileLabel);
            journey.getPlans().add(plan);
        }

        // 7. Explanations
        explainabilityService.populateExplanations(journey.getPlans());

        // Set default selected (recommended plan)
        for (JourneyPlan plan : journey.getPlans()) {
            if ("recommended".equalsIgnoreCase(plan.getPlanLabel())) {
                plan.setIsSelected(true);
            }
        }

        // Update stop optimized orders based on recommended plan
        JourneyPlan recommended = journey.getPlans().stream()
                .filter(p -> "recommended".equalsIgnoreCase(p.getPlanLabel()))
                .findFirst()
                .orElse(journey.getPlans().get(0));

        for (int i = 0; i < recommended.getLegs().size(); i++) {
            PlanLeg leg = recommended.getLegs().get(i);
            JourneyStop toStop = leg.getToStop();
            if (toStop != null) {
                toStop.setOptimizedOrder(i + 1);
            }
        }

        journey.setStatus("planned");
        Journey savedJourney = journeyRepository.save(journey);
        return journeyMapper.toResponse(savedJourney);
    }

    private JourneyPlan buildDetailedPlan(Journey journey, List<Integer> stopIndices, OptimizeRequest request, String planLabel) {
        JourneyPlan plan = new JourneyPlan();
        plan.setJourney(journey);
        plan.setPlanLabel(planLabel);

        int legOrder = 1;
        int totalDistance = 0;
        int totalDuration = 0;
        BigDecimal totalTollCost = BigDecimal.ZERO;

        int currentNodeIndex = 0;
        JourneyStop prevStop = null;

        boolean avoidTolls = request.getPreferences() != null && request.getPreferences().isAvoidTolls();
        boolean avoidHighways = request.getPreferences() != null && request.getPreferences().isAvoidHighways();
        String vehicleType = request.getVehicleType() != null ? request.getVehicleType() : "gasoline";

        RouteOptions options = new RouteOptions();
        options.setAvoidTolls(avoidTolls);
        options.setAvoidHighways(avoidHighways);
        options.setVehicleType(vehicleType);
        options.setDepartureTime(journey.getPlannedDepartureTime());

        for (int nextStopIndex : stopIndices) {
            JourneyStop nextStop = journey.getStops().get(nextStopIndex - 1);

            GeoPoint from = (currentNodeIndex == 0)
                    ? new GeoPoint(journey.getStartLat(), journey.getStartLng())
                    : new GeoPoint(prevStop.getLat(), prevStop.getLng());

            GeoPoint to = new GeoPoint(nextStop.getLat(), nextStop.getLng());

            List<RouteCandidate> routeCandidates = routingProvider.computeRoute(from, to, options);
            if (routeCandidates.isEmpty()) {
                throw new InfeasiblePlanException("Rota hesaplanamadı.");
            }

            RouteCandidate route = routeCandidates.get(0);

            PlanLeg leg = new PlanLeg();
            leg.setPlan(plan);
            leg.setFromStop(prevStop);
            leg.setToStop(nextStop);
            leg.setLegOrder(legOrder++);
            leg.setDistanceMeters(route.getDistanceMeters());
            leg.setDurationSeconds(route.getDurationSeconds());
            leg.setPolylineEncoded(route.getPolylineEncoded());
            leg.setTollCost(route.getTollCost());

            plan.getLegs().add(leg);

            totalDistance += route.getDistanceMeters();
            totalDuration += route.getDurationSeconds() + nextStop.getVisitDurationMinutes() * 60;
            totalTollCost = totalTollCost.add(route.getTollCost());

            currentNodeIndex = nextStopIndex;
            prevStop = nextStop;
        }

        // Return to start
        if (request.isReturnToStart()) {
            GeoPoint from = new GeoPoint(prevStop.getLat(), prevStop.getLng());
            GeoPoint to = new GeoPoint(journey.getStartLat(), journey.getStartLng());

            List<RouteCandidate> routeCandidates = routingProvider.computeRoute(from, to, options);
            if (routeCandidates.isEmpty()) {
                throw new InfeasiblePlanException("Başlangıç noktasına geri dönüş rotası hesaplanamadı.");
            }

            RouteCandidate route = routeCandidates.get(0);

            // We create a special return leg where toStop is the start location (which we model as null or we map to first stop / start)
            // In our database definition, toStop is NOT NULL. So let's make toStop point to the first visited stop or keep it consistent.
            // Wait, our schema says to_stop_id is NOT NULL! How do we represent returning to start in a leg?
            // Since the user is returning to start, and we must satisfy the NOT NULL constraint, we can set toStop as the last stop or the first stop,
            // or we can design the return leg to point to the first stop, or we can make fromStop as the last stop and toStop as the first stop,
            // or even better, we can modify the migration so to_stop_id is nullable if we want, but since to_stop_id is NOT NULL, we can set toStop as the first stop (or the start stop if we represented it as a stop, but start is not a stop).
            // Let's set toStop as the first stop in the permutation (since it's a loop, it makes sense conceptually) or we can make a dummy stop or just point to the first stop. Let's point to the first stop in the sequence (index 0 stop, i.e. stops.get(stopIndices.get(0) - 1)).
            // This is clean and satisfies the DB constraints without changing schema!
            JourneyStop firstStop = journey.getStops().get(stopIndices.get(0) - 1);

            PlanLeg leg = new PlanLeg();
            leg.setPlan(plan);
            leg.setFromStop(prevStop);
            leg.setToStop(firstStop); // Points to the first stop to complete the loop
            leg.setLegOrder(legOrder++);
            leg.setDistanceMeters(route.getDistanceMeters());
            leg.setDurationSeconds(route.getDurationSeconds());
            leg.setPolylineEncoded(route.getPolylineEncoded());
            leg.setTollCost(route.getTollCost());

            plan.getLegs().add(leg);

            totalDistance += route.getDistanceMeters();
            totalDuration += route.getDurationSeconds();
            totalTollCost = totalTollCost.add(route.getTollCost());
        }

        plan.setTotalDistanceMeters(totalDistance);
        plan.setTotalDurationSeconds(totalDuration);
        plan.setTotalTollCost(totalTollCost);

        // Fuel calculation: default L/100km is 7.0, default fuel price is 40.0 TL
        BigDecimal distanceKm = BigDecimal.valueOf(totalDistance).divide(BigDecimal.valueOf(1000), 4, java.math.RoundingMode.HALF_UP);
        BigDecimal fuelCost = distanceKm.multiply(BigDecimal.valueOf(7.0).divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP))
                .multiply(BigDecimal.valueOf(40.0));
        plan.setTotalFuelCostEstimate(fuelCost.setScale(2, java.math.RoundingMode.HALF_UP));

        // Mock traffic risk score and overall score computation
        plan.setTrafficRiskScore(0.15); // Default proxy
        plan.setOverallScore(0.85);

        return plan;
    }

    private void validateJourneyRequest(JourneyRequest request) {
        if (request.getStartLat() == null || request.getStartLat() < -90 || request.getStartLat() > 90) {
            throw new IllegalArgumentException("Geçersiz başlangıç enlemi.");
        }
        if (request.getStartLng() == null || request.getStartLng() < -180 || request.getStartLng() > 180) {
            throw new IllegalArgumentException("Geçersiz başlangıç boylamı.");
        }
        if (request.getStops() != null) {
            for (JourneyStopRequest stop : request.getStops()) {
                if (stop.getLat() == null || stop.getLat() < -90 || stop.getLat() > 90) {
                    throw new IllegalArgumentException("Geçersiz durak enlemi.");
                }
                if (stop.getLng() == null || stop.getLng() < -180 || stop.getLng() > 180) {
                    throw new IllegalArgumentException("Geçersiz durak boylamı.");
                }
                if (stop.getTimeWindowStart() != null && stop.getTimeWindowEnd() != null) {
                    if (stop.getTimeWindowStart().isAfter(stop.getTimeWindowEnd())) {
                        throw new IllegalArgumentException("Zaman penceresi başlangıcı bitişinden sonra olamaz.");
                    }
                }
                if (stop.getTimeWindowEnd() != null && stop.getTimeWindowEnd().isBefore(LocalDateTime.now())) {
                    throw new IllegalArgumentException("Zaman penceresi geçmişte kalamaz.");
                }
            }
        }
    }

    private void validateStopsAndCoordinates(Journey journey) {
        if (journey.getStartLat() < -90 || journey.getStartLat() > 90 || journey.getStartLng() < -180 || journey.getStartLng() > 180) {
            throw new IllegalArgumentException("Geçersiz başlangıç koordinatları.");
        }
        for (JourneyStop stop : journey.getStops()) {
            if (stop.getLat() < -90 || stop.getLat() > 90 || stop.getLng() < -180 || stop.getLng() > 180) {
                throw new IllegalArgumentException("Geçersiz durak koordinatları.");
            }
            if (stop.getTimeWindowStart() != null && stop.getTimeWindowEnd() != null) {
                if (stop.getTimeWindowStart().isAfter(stop.getTimeWindowEnd())) {
                    throw new IllegalArgumentException("Zaman penceresi başlangıcı bitişinden sonra olamaz.");
                }
            }
            if (stop.getTimeWindowEnd() != null && stop.getTimeWindowEnd().isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("Zaman penceresi geçmişte kalamaz.");
            }
        }
    }
}
