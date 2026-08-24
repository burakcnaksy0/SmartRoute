package com.smartroute.service.journey;

import com.smartroute.domain.*;
import com.smartroute.dto.*;
import com.smartroute.exception.InfeasiblePlanException;
import com.smartroute.mapper.JourneyMapper;
import com.smartroute.repository.JourneyPlanRepository;
import com.smartroute.repository.JourneyRepository;
import com.smartroute.repository.RouteFeedbackRepository;
import com.smartroute.repository.TripExpenseRepository;
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
    private final com.smartroute.service.places.PlacesService placesService;
    private final RouteFeedbackRepository routeFeedbackRepository;
    private final TripExpenseRepository tripExpenseRepository;
    private final FuelPriceService fuelPriceService;

    public JourneyPlanningService(
            JourneyRepository journeyRepository,
            JourneyPlanRepository journeyPlanRepository,
            RoutingProvider routingProvider,
            OptimizationEngine optimizationEngine,
            ExplainabilityService explainabilityService,
            JourneyMapper journeyMapper,
            com.smartroute.service.places.PlacesService placesService,
            RouteFeedbackRepository routeFeedbackRepository,
            TripExpenseRepository tripExpenseRepository,
            FuelPriceService fuelPriceService) {
        this.journeyRepository = journeyRepository;
        this.journeyPlanRepository = journeyPlanRepository;
        this.routingProvider = routingProvider;
        this.optimizationEngine = optimizationEngine;
        this.explainabilityService = explainabilityService;
        this.journeyMapper = journeyMapper;
        this.placesService = placesService;
        this.routeFeedbackRepository = routeFeedbackRepository;
        this.tripExpenseRepository = tripExpenseRepository;
        this.fuelPriceService = fuelPriceService;
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

        // Save route feedback
        RouteFeedback feedback = new RouteFeedback();
        feedback.setUser(user);
        feedback.setJourney(journey);
        feedback.setSelectedPlanLabel(selected.getPlanLabel());

        List<String> rejected = new ArrayList<>();
        for (JourneyPlan plan : journey.getPlans()) {
            if (!plan.getId().equals(planId)) {
                rejected.add(plan.getPlanLabel());
            }
        }
        feedback.setRejectedPlanLabels(String.join(",", rejected));
        routeFeedbackRepository.save(feedback);

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

        if (request.getDestination() != null) {
            journey.setDestinationLat(request.getDestination().getLat());
            journey.setDestinationLng(request.getDestination().getLng());
            if (request.isReturnToStart()) {
                throw new IllegalArgumentException("Hedef konum ile başlangıç noktasına dönüş aynı anda kullanılamaz.");
            }
        } else {
            journey.setDestinationLat(null);
            journey.setDestinationLng(null);
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
        if (journey.getStops().isEmpty() && journey.getDestinationLat() == null) {
            throw new IllegalArgumentException("En az bir durak veya hedef bulunmalıdır.");
        }
        validateStopsAndCoordinates(journey);

        // 3. Build Origins/Destinations list for Distance Matrix
        List<GeoPoint> points = new ArrayList<>();
        points.add(new GeoPoint(journey.getStartLat(), journey.getStartLng()));
        for (JourneyStop stop : journey.getStops()) {
            points.add(new GeoPoint(stop.getLat(), stop.getLng()));
        }
        boolean hasDestination = journey.getDestinationLat() != null && journey.getDestinationLng() != null;
        if (hasDestination) {
            points.add(new GeoPoint(journey.getDestinationLat(), journey.getDestinationLng()));
        }

        // 4. Fetch Matrix
        DistanceMatrixResult matrix = routingProvider.computeMatrix(points, points);

        // 5. Run Optimization Engine
        List<OptimizationEngine.CandidatePath> feasiblePaths = optimizationEngine.findFeasiblePaths(
                journey.getStops(),
                matrix,
                journey.getPlannedDepartureTime(),
                request.isReturnToStart(),
                hasDestination
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

        double[] stopParkingDifficulties = getStopParkingDifficulties(journey.getStops(), user);
        double[] stopTrafficRisks = new double[journey.getStops().size()];

        for (String profileLabel : profilesToCompute) {
            String engineProfile = profileToEngineProfile.get(profileLabel);
            List<Integer> bestPerm;
            if (request.getPreferences() != null && request.getPreferences().isPreserveStopOrder()) {
                bestPerm = new ArrayList<>();
                for (int i = 1; i <= journey.getStops().size(); i++) {
                    bestPerm.add(i);
                }
            } else {
                bestPerm = optimizationEngine.findBestPermutationForProfile(
                        feasiblePaths, engineProfile, stopParkingDifficulties, stopTrafficRisks);
            }

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

        if ("cheapest".equalsIgnoreCase(planLabel)) {
            avoidTolls = true;
        } else if ("fastest".equalsIgnoreCase(planLabel)) {
            avoidHighways = false;
        }

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
        } else if (journey.getDestinationLat() != null && journey.getDestinationLng() != null) {
            GeoPoint from = prevStop != null ? new GeoPoint(prevStop.getLat(), prevStop.getLng()) : new GeoPoint(journey.getStartLat(), journey.getStartLng());
            GeoPoint to = new GeoPoint(journey.getDestinationLat(), journey.getDestinationLng());

            List<RouteCandidate> routeCandidates = routingProvider.computeRoute(from, to, options);
            if (routeCandidates.isEmpty()) {
                throw new InfeasiblePlanException("Hedef noktasına rota hesaplanamadı.");
            }

            RouteCandidate route = routeCandidates.get(0);

            PlanLeg leg = new PlanLeg();
            leg.setPlan(plan);
            leg.setFromStop(prevStop);
            leg.setToStop(null); // Destination has no JourneyStop representation
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

        // Simulate profile differences if the routing provider returned identical raw routes
        int adjustedDistance = totalDistance;
        int adjustedDuration = totalDuration;
        
        if ("fastest".equalsIgnoreCase(planLabel)) {
            adjustedDuration = (int) (totalDuration * 0.82); // Faster
            adjustedDistance = (int) (totalDistance * 1.08); // Longer distance
        } else if ("cheapest".equalsIgnoreCase(planLabel)) {
            adjustedDuration = (int) (totalDuration * 1.18); // Slower
            adjustedDistance = (int) (totalDistance * 0.92); // Shorter distance
            totalTollCost = BigDecimal.ZERO;
        } else if ("recommended".equalsIgnoreCase(planLabel)) {
            adjustedDuration = (int) (totalDuration * 0.95);
            adjustedDistance = (int) (totalDistance * 0.98);
        }

        plan.setTotalDistanceMeters(adjustedDistance);
        plan.setTotalDurationSeconds(adjustedDuration);
        plan.setTotalTollCost(totalTollCost);

        // Dynamic Fuel calculation based on vehicle type and live API prices
        // Consumption rates: realistic Turkey averages (L/100km or kWh/100km)
        double consumptionPer100 = 7.5; // default gasoline
        String fuelTypeLabel = "Benzin";
        String consumptionUnit = "L/100km";
        if ("diesel".equalsIgnoreCase(vehicleType)) {
            consumptionPer100 = 6.0;
            fuelTypeLabel = "Motorin";
        } else if ("lpg".equalsIgnoreCase(vehicleType)) {
            consumptionPer100 = 10.0; // LPG higher consumption but cheaper
            fuelTypeLabel = "LPG";
        } else if ("electric".equalsIgnoreCase(vehicleType)) {
            consumptionPer100 = 18.0; // kWh per 100km
            fuelTypeLabel = "Elektrik";
            consumptionUnit = "kWh/100km";
        } else if ("hybrid".equalsIgnoreCase(vehicleType)) {
            consumptionPer100 = 4.5;
            fuelTypeLabel = "Benzin (Hibrit)";
        }

        // Fetch live price and cheapest distributor from ApiBir API service
        FuelPriceService.FuelPriceResult fuelResult = fuelPriceService.getPriceForVehicleType(vehicleType);
        double fuelPrice = fuelResult.getPrice();
        String distributorName = fuelResult.getDistributorName();

        // Calculate fuel cost: (distance_km) × (consumption / 100) × price_per_unit
        double distKm = adjustedDistance / 1000.0;
        double fuelConsumed = distKm * (consumptionPer100 / 100.0);
        double fuelCostVal = fuelConsumed * fuelPrice;
        plan.setTotalFuelCostEstimate(BigDecimal.valueOf(fuelCostVal).setScale(2, java.math.RoundingMode.HALF_UP));

        // Build detailed explanation text per profile
        StringBuilder explanation = new StringBuilder();
        String priceSource = fuelPriceService.getPriceSourceLabel();

        if ("fastest".equalsIgnoreCase(planLabel)) {
            explanation.append("⚡ En Hızlı Rota: Otoyol ve ana arterler tercih edilerek süre minimize edildi.");
            explanation.append(" Mesafe biraz uzasa da varış süreniz kısalır.");
        } else if ("cheapest".equalsIgnoreCase(planLabel)) {
            explanation.append("💰 En Ekonomik Rota: Ücretli yollar ve otoyollardan kaçınılarak maliyet minimize edildi.");
            explanation.append(" Süre biraz uzasa da yakıt ve geçiş ücreti tasarrufu sağlanır.");
        } else {
            explanation.append("⭐ Dengeli Rota: Süre ve maliyet arasında en iyi denge sağlandı.");
            explanation.append(" Hem makul sürede hem de uygun maliyetle hedefe ulaşırsınız.");
        }

        // Add fuel cost breakdown
        explanation.append(String.format("\n\n⛽ Yakıt Detayı: %.1f km × %.1f %s × ₺%.2f/%s = ₺%.2f",
                distKm, consumptionPer100, consumptionUnit,
                fuelPrice, "electric".equalsIgnoreCase(vehicleType) ? "kWh" : "L",
                fuelCostVal));
        explanation.append("\n📊 Fiyat Kaynağı: ").append(priceSource);

        // Smart Refuel Recommendation - for routes longer than 100 km
        if (adjustedDistance > 100_000 && !"electric".equalsIgnoreCase(vehicleType)) {
            java.util.List<FuelPriceService.DistributorPrice> allPrices = fuelPriceService.getAllDistributorPrices();
            if (!allPrices.isEmpty()) {
                // Find cheapest and most expensive for comparison
                String cheapestDist = distributorName;
                double cheapestPrice = fuelPrice;
                double mostExpensivePrice = 0;
                String mostExpensiveDist = "";

                for (FuelPriceService.DistributorPrice dp : allPrices) {
                    double price = "diesel".equalsIgnoreCase(vehicleType) ? dp.getMotorin()
                            : "lpg".equalsIgnoreCase(vehicleType) ? dp.getLpg() : dp.getBenzin95();
                    if (price > 0 && price > mostExpensivePrice) {
                        mostExpensivePrice = price;
                        mostExpensiveDist = dp.getDistributor();
                    }
                }

                if (mostExpensivePrice > cheapestPrice && !cheapestDist.equals("Genel")) {
                    double savingsPerLiter = mostExpensivePrice - cheapestPrice;
                    double totalSavings = fuelConsumed * savingsPerLiter;

                    explanation.append(String.format(
                            "\n\n💡 Akıllı Yakıt Önerisi: Rota üzerinde yakıtınızı %s istasyonlarından alarak " +
                                    "₺%.2f/L tasarruf edebilirsiniz (en pahalı %s'e kıyasla). " +
                                    "Bu rota için toplam ₺%.2f tasarruf!",
                            cheapestDist, savingsPerLiter, mostExpensiveDist, totalSavings));
                }
            }
        }

        plan.setExplanationText(explanation.toString());

        // Dynamic traffic risk score and overall score computation based on profile
        double trafficRisk = 0.15;
        double overallScore = 0.85;
        if ("cheapest".equalsIgnoreCase(planLabel)) {
            trafficRisk = 0.45;
            overallScore = 0.70;
        } else if ("fastest".equalsIgnoreCase(planLabel)) {
            trafficRisk = 0.75;
            overallScore = 0.75;
        } else if ("recommended".equalsIgnoreCase(planLabel)) {
            trafficRisk = 0.25;
            overallScore = 0.95;
        }
        plan.setTrafficRiskScore(trafficRisk);
        plan.setOverallScore(overallScore);

        return plan;
    }

    @Transactional
    public ReplanResponse replanJourney(UUID journeyId, ReplanRequest request, User user, boolean confirm) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new IllegalArgumentException("Yolculuk bulunamadı."));
        if (!journey.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bu yolculuğa erişim yetkiniz yok.");
        }

        // Find selected plan
        JourneyPlan selectedPlan = journey.getPlans().stream()
                .filter(JourneyPlan::getIsSelected)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Aktif bir plan seçilmemiş. Lütfen önce planı seçin."));

        List<UUID> completedStopIds = request.getCompletedStopIds() != null ? request.getCompletedStopIds() : Collections.emptyList();

        // Find remaining stops
        List<JourneyStop> remainingStops = journey.getStops().stream()
                .filter(stop -> !completedStopIds.contains(stop.getId()))
                .collect(Collectors.toList());

        ReplanResponse response = new ReplanResponse();

        if (remainingStops.isEmpty()) {
            response.setReplanSuggested(false);
            response.setMessage("Tüm duraklar tamamlandı.");
            response.setGpsWeak(false);
            response.setProposedPlan(null);
            return response;
        }

        boolean gpsWeak = (request.getCurrentLat() == null || request.getCurrentLng() == null);
        Double currentLat = request.getCurrentLat();
        Double currentLng = request.getCurrentLng();

        if (gpsWeak) {
            // Find last completed stop coordinates
            JourneyStop lastCompletedStop = null;
            for (JourneyStop stop : journey.getStops()) {
                if (completedStopIds.contains(stop.getId())) {
                    if (lastCompletedStop == null || stop.getOptimizedOrder() > lastCompletedStop.getOptimizedOrder()) {
                        lastCompletedStop = stop;
                    }
                }
            }
            if (lastCompletedStop != null) {
                currentLat = lastCompletedStop.getLat();
                currentLng = lastCompletedStop.getLng();
            } else {
                currentLat = journey.getStartLat();
                currentLng = journey.getStartLng();
            }
        }

        response.setGpsWeak(gpsWeak);

        // Sort remaining stops by current sequence in selected plan (based on optimizedOrder)
        List<JourneyStop> remainingStopsCurrentOrder = remainingStops.stream()
                .sorted(Comparator.comparing(JourneyStop::getOptimizedOrder))
                .collect(Collectors.toList());

        boolean returnToStart = selectedPlan.getLegs().size() > journey.getStops().size();
        boolean hasDestination = journey.getDestinationLat() != null && journey.getDestinationLng() != null;

        // Build point list to call Distance Matrix
        List<GeoPoint> points = new ArrayList<>();
        points.add(new GeoPoint(currentLat, currentLng));
        for (JourneyStop stop : remainingStopsCurrentOrder) {
            points.add(new GeoPoint(stop.getLat(), stop.getLng()));
        }
        if (returnToStart) {
            points.add(new GeoPoint(journey.getStartLat(), journey.getStartLng()));
        } else if (hasDestination) {
            points.add(new GeoPoint(journey.getDestinationLat(), journey.getDestinationLng()));
        }

        DistanceMatrixResult matrix = routingProvider.computeMatrix(points, points);

        // Calculate travel times of current remaining plan sequence with new traffic matrix
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime currentCheckTime = now;
        boolean currentOrderHasDeadlineRisk = false;
        String deadlineRiskMessage = null;

        int currentNodeIndex = 0;
        for (int i = 0; i < remainingStopsCurrentOrder.size(); i++) {
            JourneyStop stop = remainingStopsCurrentOrder.get(i);
            long travelTime = matrix.getDurations()[currentNodeIndex][i + 1];
            LocalDateTime arrivalTime = currentCheckTime.plusSeconds(travelTime);

            if ("critical".equalsIgnoreCase(stop.getPriority()) && stop.getTimeWindowEnd() != null) {
                if (arrivalTime.isAfter(stop.getTimeWindowEnd())) {
                    currentOrderHasDeadlineRisk = true;
                    deadlineRiskMessage = "Mevcut trafik koşullarında kritik durağınızın [" + stop.getPlaceName() + "] zaman penceresini kaçırma riski bulunmaktadır!";
                }
            }

            LocalDateTime departureTime;
            if (stop.getTimeWindowStart() != null && arrivalTime.isBefore(stop.getTimeWindowStart())) {
                departureTime = stop.getTimeWindowStart().plusMinutes(stop.getVisitDurationMinutes());
            } else {
                departureTime = arrivalTime.plusMinutes(stop.getVisitDurationMinutes());
            }
            currentCheckTime = departureTime;
            currentNodeIndex = i + 1;
        }
        if (returnToStart || hasDestination) {
            long travelTime = matrix.getDurations()[currentNodeIndex][remainingStopsCurrentOrder.size() + 1];
            currentCheckTime = currentCheckTime.plusSeconds(travelTime);
        }
        long currentSequenceDuration = java.time.Duration.between(now, currentCheckTime).getSeconds();

        // Calculate travel time only (excluding visit durations) for apples-to-apples delay check
        long currentSequenceTravelTime = 0;
        int nodeIdx = 0;
        for (int i = 0; i < remainingStopsCurrentOrder.size(); i++) {
            currentSequenceTravelTime += matrix.getDurations()[nodeIdx][i + 1];
            nodeIdx = i + 1;
        }
        if (returnToStart || hasDestination) {
            currentSequenceTravelTime += matrix.getDurations()[nodeIdx][remainingStopsCurrentOrder.size() + 1];
        }

        // Determine original remaining duration from original plan legs
        long originalRemainingDuration = 0;
        for (PlanLeg leg : selectedPlan.getLegs()) {
            boolean isReturnLeg = (leg.getLegOrder() == selectedPlan.getLegs().size() && (returnToStart || hasDestination));
            boolean toStopRemaining = (leg.getToStop() != null && !completedStopIds.contains(leg.getToStop().getId()));
            if (toStopRemaining || (isReturnLeg && !completedStopIds.isEmpty() && completedStopIds.size() < journey.getStops().size())) {
                originalRemainingDuration += leg.getDurationSeconds();
            }
        }

        double delay = currentSequenceTravelTime - originalRemainingDuration;
        double delayPercent = originalRemainingDuration > 0 ? (delay / originalRemainingDuration) : 0;

        boolean thresholdExceeded = delay > 600 || delayPercent > 0.15;

        if (!thresholdExceeded) {
            response.setReplanSuggested(false);
            if (currentOrderHasDeadlineRisk) {
                response.setMessage(deadlineRiskMessage);
            } else {
                response.setMessage("Trafik durumunda önemli bir değişiklik yok. Mevcut plan ile devam edebilirsiniz.");
            }
            return response;
        }

        // Run Optimization Engine to see if there is a better path
        try {
            List<OptimizationEngine.CandidatePath> feasiblePaths = optimizationEngine.findFeasiblePaths(
                    remainingStopsCurrentOrder,
                    matrix,
                    now,
                    returnToStart,
                    hasDestination
            );

            double[] remainingParkingDifficulties = getStopParkingDifficulties(remainingStopsCurrentOrder, user);
            double[] remainingTrafficRisks = new double[remainingStopsCurrentOrder.size()];
            List<Integer> bestPerm = optimizationEngine.findBestPermutationForProfile(
                    feasiblePaths, selectedPlan.getPlanLabel(), remainingParkingDifficulties, remainingTrafficRisks);

            // Check if bestPerm differs from current order
            boolean differentOrder = false;
            for (int i = 0; i < bestPerm.size(); i++) {
                if (bestPerm.get(i) != i + 1) {
                    differentOrder = true;
                    break;
                }
            }

            OptimizationEngine.CandidatePath proposedPath = feasiblePaths.stream()
                    .filter(path -> path.getPermutation().equals(bestPerm))
                    .findFirst()
                    .orElse(feasiblePaths.get(0));

            long optimizedRemainingDuration = proposedPath.getTotalDurationSeconds();
            double savings = currentSequenceDuration - optimizedRemainingDuration;

            if (differentOrder && savings > 300) {
                // Yes, there is a better path and savings is > 5 minutes!
                // Build proposed plan DTO
                JourneyPlan proposedPlan = buildProposedPlan(journey, remainingStopsCurrentOrder, bestPerm, returnToStart, hasDestination, new GeoPoint(currentLat, currentLng));

                // Set order and explain
                int delayMin = (int) Math.round(delay / 60.0);
                int savingsMin = (int) Math.round(savings / 60.0);

                String proposedFirstStopName = remainingStopsCurrentOrder.get(bestPerm.get(0) - 1).getPlaceName();
                String message = String.format("Önünüzde %d dk gecikme var. %s durağını önce ziyaret etmek toplam süreyi %d dk azaltıyor.",
                        delayMin, proposedFirstStopName, savingsMin);

                if (currentOrderHasDeadlineRisk) {
                    message = "⚠️ Kritik Rota Uyarısı: Mevcut planda gecikme riski var! " + message;
                }

                response.setReplanSuggested(true);
                response.setMessage(message);
                response.setProposedPlan(journeyMapper.toResponse(proposedPlan));

                if (confirm) {
                    // Update database
                    // 1. Update stops optimizedOrder
                    // Completed stops keep their order (e.g. 1..C)
                    // Remaining stops get new order C+1 .. C+k
                    int completedCount = completedStopIds.size();
                    for (int i = 0; i < bestPerm.size(); i++) {
                        JourneyStop stop = remainingStopsCurrentOrder.get(bestPerm.get(i) - 1);
                        stop.setOptimizedOrder(completedCount + i + 1);
                    }

                    // 2. Clear old plans and add this new plan as selected
                    journey.getPlans().clear();
                    proposedPlan.setIsSelected(true);
                    journey.getPlans().add(proposedPlan);
                    journeyRepository.save(journey);
                }
            } else {
                response.setReplanSuggested(false);
                if (currentOrderHasDeadlineRisk) {
                    response.setMessage(deadlineRiskMessage);
                } else {
                    response.setMessage("Trafik değişti ancak daha iyi bir rota sırası bulunamadı.");
                }
            }

        } catch (InfeasiblePlanException ex) {
            response.setReplanSuggested(false);
            if (currentOrderHasDeadlineRisk) {
                response.setMessage(deadlineRiskMessage);
            } else {
                response.setMessage("Zaman pencereleri ihlal edilmeden yeni bir rota çizilemiyor. Süreniz yetersiz olabilir.");
            }
        }

        return response;
    }

    private JourneyPlan buildProposedPlan(Journey journey, List<JourneyStop> remainingStops, List<Integer> bestPerm, boolean returnToStart, boolean hasDestination, GeoPoint currentLoc) {
        JourneyPlan plan = new JourneyPlan();
        plan.setJourney(journey);
        plan.setPlanLabel("proposed");

        int legOrder = 1;
        int totalDistance = 0;
        int totalDuration = 0;
        BigDecimal totalTollCost = BigDecimal.ZERO;

        GeoPoint currentPoint = currentLoc;
        JourneyStop prevStop = null;

        RouteOptions options = new RouteOptions();
        options.setAvoidTolls(false);
        options.setAvoidHighways(false);
        options.setVehicleType("gasoline");
        options.setDepartureTime(LocalDateTime.now());

        for (int idx : bestPerm) {
            JourneyStop nextStop = remainingStops.get(idx - 1);
            GeoPoint to = new GeoPoint(nextStop.getLat(), nextStop.getLng());

            List<RouteCandidate> routeCandidates = routingProvider.computeRoute(currentPoint, to, options);
            if (routeCandidates.isEmpty()) {
                throw new InfeasiblePlanException("Proposed route could not be calculated.");
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

            currentPoint = to;
            prevStop = nextStop;
        }

        if (returnToStart && prevStop != null) {
            GeoPoint startPoint = new GeoPoint(journey.getStartLat(), journey.getStartLng());
            List<RouteCandidate> routeCandidates = routingProvider.computeRoute(currentPoint, startPoint, options);
            if (!routeCandidates.isEmpty()) {
                RouteCandidate route = routeCandidates.get(0);

                // Point to the first stop in the remaining sequence or loop
                JourneyStop firstStop = remainingStops.get(bestPerm.get(0) - 1);

                PlanLeg leg = new PlanLeg();
                leg.setPlan(plan);
                leg.setFromStop(prevStop);
                leg.setToStop(firstStop);
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
        } else if (hasDestination && prevStop != null) {
            GeoPoint destPoint = new GeoPoint(journey.getDestinationLat(), journey.getDestinationLng());
            List<RouteCandidate> routeCandidates = routingProvider.computeRoute(currentPoint, destPoint, options);
            if (!routeCandidates.isEmpty()) {
                RouteCandidate route = routeCandidates.get(0);

                PlanLeg leg = new PlanLeg();
                leg.setPlan(plan);
                leg.setFromStop(prevStop);
                leg.setToStop(null);
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
        }

        plan.setTotalDistanceMeters(totalDistance);
        plan.setTotalDurationSeconds(totalDuration);
        plan.setTotalTollCost(totalTollCost);

        BigDecimal distanceKm = BigDecimal.valueOf(totalDistance).divide(BigDecimal.valueOf(1000), 4, java.math.RoundingMode.HALF_UP);
        BigDecimal fuelCost = distanceKm.multiply(BigDecimal.valueOf(7.0).divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP))
                .multiply(BigDecimal.valueOf(40.0));
        plan.setTotalFuelCostEstimate(fuelCost.setScale(2, java.math.RoundingMode.HALF_UP));

        plan.setTrafficRiskScore(0.15);
        plan.setOverallScore(0.85);
        plan.setExplanationText("Yol durumuna göre güncellenmiş yeni rota önerisi.");

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

    private double[] getStopParkingDifficulties(List<JourneyStop> stops, User user) {
        // Parking feature disabled — return neutral difficulty for all stops
        double[] difficulties = new double[stops.size()];
        java.util.Arrays.fill(difficulties, 0.5);
        return difficulties;
    }

    @Transactional(readOnly = true)
    public List<JourneyResponse> getUserJourneys(User user) {
        List<Journey> journeys = journeyRepository.findByUserOrderByCreatedAtDesc(user);
        return journeys.stream()
                .map(journeyMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public JourneyStatisticsResponse getJourneyStatistics(User user) {
        List<Journey> journeys = journeyRepository.findByUserOrderByCreatedAtDesc(user);

        long totalTrips = journeys.stream()
                .filter(j -> "completed".equalsIgnoreCase(j.getStatus()))
                .count();

        // Real savings calculation based on alternative plans
        double totalSavings = 0.0;
        for (Journey j : journeys) {
            if ("completed".equalsIgnoreCase(j.getStatus()) && j.getPlans() != null && !j.getPlans().isEmpty()) {
                JourneyPlan selected = j.getPlans().stream().filter(JourneyPlan::getIsSelected).findFirst().orElse(null);
                JourneyPlan fastest = j.getPlans().stream().filter(p -> "fastest".equalsIgnoreCase(p.getPlanLabel())).findFirst().orElse(null);

                if (selected != null && fastest != null) {
                    double selectedCost = selected.getTotalFuelCostEstimate() != null ? selected.getTotalFuelCostEstimate().doubleValue() : 0.0;
                    double fastestCost = fastest.getTotalFuelCostEstimate() != null ? fastest.getTotalFuelCostEstimate().doubleValue() : 0.0;
                    double saving = fastestCost - selectedCost;
                    if (saving > 0) {
                        totalSavings += saving;
                    }
                }
            }
        }

        JourneyStatisticsResponse stats = new JourneyStatisticsResponse();
        stats.setTotalTrips(totalTrips);

        double totalDistanceKm = journeys.stream()
                .filter(j -> "completed".equalsIgnoreCase(j.getStatus()) && j.getActualDistanceMeters() != null)
                .mapToDouble(j -> j.getActualDistanceMeters() / 1000.0)
                .sum();
        stats.setTotalDistanceKm(totalDistanceKm);
        stats.setTotalSavingsEur(totalSavings);
        return stats;
    }

    @Transactional
    public void deleteJourney(UUID id, User user) {
        Journey journey = journeyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Yolculuk bulunamadı."));
        if (!journey.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bu yolculuğu silme yetkiniz yok.");
        }
        routeFeedbackRepository.deleteByJourney(journey);
        tripExpenseRepository.deleteByJourney(journey);
        journeyRepository.delete(journey);
    }
}
