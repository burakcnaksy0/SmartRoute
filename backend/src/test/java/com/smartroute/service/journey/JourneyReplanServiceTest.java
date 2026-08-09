package com.smartroute.service.journey;

import com.smartroute.domain.*;
import com.smartroute.dto.*;
import com.smartroute.repository.*;
import com.smartroute.service.routing.*;
import com.smartroute.mapper.JourneyMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JourneyReplanServiceTest {

    @Mock
    private JourneyRepository journeyRepository;

    @Mock
    private RoutingProvider routingProvider;

    @Mock
    private OptimizationEngine optimizationEngine;

    @Mock
    private com.smartroute.service.places.PlacesService placesService;

    @Spy
    private JourneyMapper journeyMapper = new JourneyMapper();

    @InjectMocks
    private JourneyPlanningService journeyPlanningService;

    private User testUser;
    private Journey testJourney;
    private JourneyStop stop1;
    private JourneyStop stop2;
    private JourneyPlan plan;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("test@example.com");

        stop1 = new JourneyStop();
        stop1.setId(UUID.randomUUID());
        stop1.setPlaceName("Kadıköy");
        stop1.setLat(40.99);
        stop1.setLng(29.03);
        stop1.setVisitDurationMinutes(30);
        stop1.setSequenceOrder(1);
        stop1.setOptimizedOrder(1);
        stop1.setPriority("normal");
        stop1.setStopType("errand");

        stop2 = new JourneyStop();
        stop2.setId(UUID.randomUUID());
        stop2.setPlaceName("Beşiktaş");
        stop2.setLat(41.04);
        stop2.setLng(29.00);
        stop2.setVisitDurationMinutes(30);
        stop2.setSequenceOrder(2);
        stop2.setOptimizedOrder(2);
        stop2.setPriority("critical");
        stop2.setStopType("meeting");
        stop2.setTimeWindowEnd(LocalDateTime.now().plusHours(3));

        PlanLeg leg1 = new PlanLeg();
        leg1.setId(UUID.randomUUID());
        leg1.setLegOrder(1);
        leg1.setFromStop(null);
        leg1.setToStop(stop1);
        leg1.setDistanceMeters(10000);
        leg1.setDurationSeconds(900); // 15 mins

        PlanLeg leg2 = new PlanLeg();
        leg2.setId(UUID.randomUUID());
        leg2.setLegOrder(2);
        leg2.setFromStop(stop1);
        leg2.setToStop(stop2);
        leg2.setDistanceMeters(10000);
        leg2.setDurationSeconds(900); // 15 mins

        plan = new JourneyPlan();
        plan.setId(UUID.randomUUID());
        plan.setPlanLabel("recommended");
        plan.setIsSelected(true);
        plan.setTotalDurationSeconds(1800);
        plan.setTotalDistanceMeters(20000);
        plan.setTotalTollCost(BigDecimal.ZERO);
        plan.setTotalFuelCostEstimate(BigDecimal.valueOf(50.0));
        plan.setTrafficRiskScore(0.15);
        plan.setOverallScore(0.85);

        leg1.setPlan(plan);
        leg2.setPlan(plan);
        plan.setLegs(List.of(leg1, leg2));

        testJourney = new Journey();
        testJourney.setId(UUID.randomUUID());
        testJourney.setUser(testUser);
        testJourney.setStartLat(41.01);
        testJourney.setStartLng(28.97);
        testJourney.setStatus("planned");
        testJourney.setPlannedDepartureTime(LocalDateTime.now().plusHours(1));

        testJourney.setStops(List.of(stop1, stop2));
        testJourney.setPlans(new ArrayList<>(List.of(plan)));
    }

    @Test
    void replanJourney_noTrafficChange() {
        ReplanRequest request = new ReplanRequest();
        request.setCurrentLat(41.01);
        request.setCurrentLng(28.97);
        request.setCompletedStopIds(Collections.emptyList());

        when(journeyRepository.findById(testJourney.getId())).thenReturn(Optional.of(testJourney));

        DistanceMatrixResult matrix = new DistanceMatrixResult();
        matrix.setDistances(new long[][]{{0, 10000, 20000}, {10000, 0, 10000}, {20000, 10000, 0}});
        matrix.setDurations(new long[][]{{0, 900, 1800}, {900, 0, 900}, {1800, 900, 0}});

        when(routingProvider.computeMatrix(anyList(), anyList())).thenReturn(matrix);

        ReplanResponse response = journeyPlanningService.replanJourney(testJourney.getId(), request, testUser, false);

        assertNotNull(response);
        assertFalse(response.isReplanSuggested());
        assertEquals("Trafik durumunda önemli bir değişiklik yok. Mevcut plan ile devam edebilirsiniz.", response.getMessage());
    }

    @Test
    void replanJourney_suggestsReplan_whenTrafficDelaySignificant() {
        ReplanRequest request = new ReplanRequest();
        request.setCurrentLat(41.01);
        request.setCurrentLng(28.97);
        request.setCompletedStopIds(Collections.emptyList());

        when(journeyRepository.findById(testJourney.getId())).thenReturn(Optional.of(testJourney));

        // High delay in original sequence: 0 -> 1 takes 30 mins (1800s), 1 -> 2 takes 30 mins (1800s). Total travel 3600s vs original 1800s. Delay is 1800s (>600s).
        DistanceMatrixResult matrix = new DistanceMatrixResult();
        matrix.setDistances(new long[][]{{0, 10000, 20000}, {10000, 0, 10000}, {20000, 10000, 0}});
        matrix.setDurations(new long[][]{{0, 1800, 1000}, {1800, 0, 1800}, {1000, 1800, 0}});

        when(routingProvider.computeMatrix(anyList(), anyList())).thenReturn(matrix);

        // Optimization engine returns a better sequence: 0 -> 2 (Beşiktaş) -> 1 (Kadıköy)
        // 0 -> 2: 1000s, 2 -> 1: 1800s. Total: 2800s, saving 800s (>300s).
        OptimizationEngine.CandidatePath path1 = mock(OptimizationEngine.CandidatePath.class);
        when(path1.getPermutation()).thenReturn(List.of(2, 1));
        when(path1.getTotalDurationSeconds()).thenReturn(2800L);

        when(optimizationEngine.findFeasiblePaths(anyList(), any(), any(), anyBoolean()))
                .thenReturn(List.of(path1));
        when(optimizationEngine.findBestPermutationForProfile(anyList(), anyString(), any(), any()))
                .thenReturn(List.of(2, 1));

        RouteCandidate mockCandidate1 = new RouteCandidate();
        mockCandidate1.setDurationSeconds(1000);
        mockCandidate1.setDistanceMeters(10000);
        mockCandidate1.setPolylineEncoded("poly1");
        mockCandidate1.setTollCost(BigDecimal.ZERO);

        RouteCandidate mockCandidate2 = new RouteCandidate();
        mockCandidate2.setDurationSeconds(1800);
        mockCandidate2.setDistanceMeters(10000);
        mockCandidate2.setPolylineEncoded("poly2");
        mockCandidate2.setTollCost(BigDecimal.ZERO);

        when(routingProvider.computeRoute(any(GeoPoint.class), any(GeoPoint.class), any(RouteOptions.class)))
                .thenReturn(List.of(mockCandidate1), List.of(mockCandidate2));

        ReplanResponse response = journeyPlanningService.replanJourney(testJourney.getId(), request, testUser, false);

        assertNotNull(response);
        assertTrue(response.isReplanSuggested());
        assertTrue(response.getMessage().contains("Önünüzde 30 dk gecikme var. Beşiktaş durağını önce ziyaret etmek toplam süreyi"));
        assertNotNull(response.getProposedPlan());
    }
}
