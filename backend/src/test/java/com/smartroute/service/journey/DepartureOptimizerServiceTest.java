package com.smartroute.service.journey;

import com.smartroute.domain.*;
import com.smartroute.dto.DepartureSuggestionResponse;
import com.smartroute.dto.DepartureSuggestionsRequest;
import com.smartroute.repository.JourneyRepository;
import com.smartroute.service.routing.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepartureOptimizerServiceTest {

    @Mock
    private JourneyRepository journeyRepository;

    @Mock
    private RoutingProvider routingProvider;

    @InjectMocks
    private DepartureOptimizerService departureOptimizerService;

    private User testUser;
    private Journey testJourney;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("test@example.com");

        JourneyStop stop1 = new JourneyStop();
        stop1.setId(UUID.randomUUID());
        stop1.setPlaceName("Kadıköy");
        stop1.setLat(40.99);
        stop1.setLng(29.03);
        stop1.setVisitDurationMinutes(30);
        stop1.setSequenceOrder(1);

        PlanLeg leg1 = new PlanLeg();
        leg1.setId(UUID.randomUUID());
        leg1.setLegOrder(1);
        leg1.setFromStop(null); // from start
        leg1.setToStop(stop1);
        leg1.setDistanceMeters(10000);
        leg1.setDurationSeconds(900);
        leg1.setPolylineEncoded("abc");
        leg1.setTollCost(BigDecimal.ZERO);

        JourneyPlan plan = new JourneyPlan();
        plan.setId(UUID.randomUUID());
        plan.setPlanLabel("recommended");
        plan.setIsSelected(true);
        plan.setTotalDurationSeconds(900);
        plan.setTotalDistanceMeters(10000);
        plan.setTotalTollCost(BigDecimal.ZERO);
        plan.setTotalFuelCostEstimate(BigDecimal.valueOf(28.0));
        plan.setTrafficRiskScore(0.15);
        plan.setOverallScore(0.85);
        leg1.setPlan(plan);

        List<PlanLeg> legs = new ArrayList<>();
        legs.add(leg1);
        plan.setLegs(legs);

        testJourney = new Journey();
        testJourney.setId(UUID.randomUUID());
        testJourney.setUser(testUser);
        testJourney.setStartLat(41.01);
        testJourney.setStartLng(28.97);
        testJourney.setStatus("planned");
        testJourney.setPlannedDepartureTime(LocalDateTime.now().plusHours(1));

        List<JourneyStop> stops = new ArrayList<>();
        stops.add(stop1);
        testJourney.setStops(stops);

        List<JourneyPlan> plans = new ArrayList<>();
        plans.add(plan);
        testJourney.setPlans(plans);
    }

    @Test
    void getDepartureSuggestions_success() {
        LocalDateTime targetArrival = LocalDateTime.now().plusHours(2);
        DepartureSuggestionsRequest request = new DepartureSuggestionsRequest(targetArrival);

        when(journeyRepository.findById(testJourney.getId())).thenReturn(Optional.of(testJourney));

        RouteCandidate mockCandidate = new RouteCandidate();
        mockCandidate.setDurationSeconds(900);
        mockCandidate.setDistanceMeters(10000);
        mockCandidate.setPolylineEncoded("abc");
        mockCandidate.setTollCost(BigDecimal.ZERO);

        when(routingProvider.computeRoute(any(GeoPoint.class), any(GeoPoint.class), any(RouteOptions.class)))
                .thenReturn(List.of(mockCandidate));

        List<DepartureSuggestionResponse> suggestions =
                departureOptimizerService.getDepartureSuggestions(testJourney.getId(), request, testUser);

        assertNotNull(suggestions);
        assertFalse(suggestions.isEmpty());
        // All confidence values should be in [0, 1] range
        for (DepartureSuggestionResponse s : suggestions) {
            assertTrue(s.getArrivalConfidence() >= 0.0 && s.getArrivalConfidence() <= 1.0,
                    "Confidence out of range: " + s.getArrivalConfidence());
            assertTrue(s.getDepartureTime().isBefore(targetArrival),
                    "Departure time must be before target arrival");
        }
    }

    @Test
    void getDepartureSuggestions_closerDepartureTimes_haveHigherConfidence() {
        LocalDateTime targetArrival = LocalDateTime.now().plusHours(3);
        DepartureSuggestionsRequest request = new DepartureSuggestionsRequest(targetArrival);

        when(journeyRepository.findById(testJourney.getId())).thenReturn(Optional.of(testJourney));

        RouteCandidate candidate = new RouteCandidate();
        candidate.setDurationSeconds(3600); // 60 min travel
        candidate.setDistanceMeters(20000);
        candidate.setPolylineEncoded("abc");
        candidate.setTollCost(BigDecimal.ZERO);

        when(routingProvider.computeRoute(any(), any(), any())).thenReturn(List.of(candidate));

        List<DepartureSuggestionResponse> suggestions =
                departureOptimizerService.getDepartureSuggestions(testJourney.getId(), request, testUser);

        // Earlier departure = more buffer = higher confidence
        // Later departure = less buffer = lower confidence
        if (suggestions.size() >= 2) {
            double firstConf = suggestions.get(0).getArrivalConfidence();  // earliest
            double lastConf = suggestions.get(suggestions.size() - 1).getArrivalConfidence(); // latest
            assertTrue(firstConf >= lastConf,
                    "Earlier departure should have >= confidence than later: " + firstConf + " vs " + lastConf);
        }
    }

    @Test
    void getDepartureSuggestions_pastTargetTime_throwsException() {
        LocalDateTime pastTarget = LocalDateTime.now().minusHours(1);
        DepartureSuggestionsRequest request = new DepartureSuggestionsRequest(pastTarget);

        // No stubbing needed — validation fires before repository lookup
        assertThrows(IllegalArgumentException.class, () ->
                departureOptimizerService.getDepartureSuggestions(testJourney.getId(), request, testUser)
        );
    }

    @Test
    void getDepartureSuggestions_noPlan_throwsException() {
        testJourney.getPlans().clear();
        LocalDateTime targetArrival = LocalDateTime.now().plusHours(2);
        DepartureSuggestionsRequest request = new DepartureSuggestionsRequest(targetArrival);

        when(journeyRepository.findById(testJourney.getId())).thenReturn(Optional.of(testJourney));

        assertThrows(IllegalArgumentException.class, () ->
                departureOptimizerService.getDepartureSuggestions(testJourney.getId(), request, testUser)
        );
    }

    @Test
    void getDepartureSuggestions_wrongUser_throwsException() {
        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());

        LocalDateTime targetArrival = LocalDateTime.now().plusHours(2);
        DepartureSuggestionsRequest request = new DepartureSuggestionsRequest(targetArrival);

        when(journeyRepository.findById(testJourney.getId())).thenReturn(Optional.of(testJourney));

        assertThrows(IllegalArgumentException.class, () ->
                departureOptimizerService.getDepartureSuggestions(testJourney.getId(), request, otherUser)
        );
    }
}
