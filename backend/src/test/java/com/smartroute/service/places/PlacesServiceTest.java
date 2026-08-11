package com.smartroute.service.places;

import com.smartroute.domain.*;
import com.smartroute.dto.*;
import com.smartroute.repository.JourneyRepository;
import com.smartroute.repository.JourneyStopRepository;
import com.smartroute.service.routing.GeoPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PlacesServiceTest {

    @Mock
    private JourneyRepository journeyRepository;

    @Mock
    private JourneyStopRepository journeyStopRepository;

    @Mock
    private OsmPlacesProvider osmPlacesProvider;

    @Mock
    private GeocodingProvider geocodingProvider;

    @Mock
    private ParkingProvider parkingProvider;

    @InjectMocks
    private PlacesService placesService;

    private User user;
    private Journey journey;
    private JourneyStop stop;
    private JourneyPlan plan;
    private PlanLeg leg;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");

        journey = new Journey();
        journey.setId(UUID.randomUUID());
        journey.setUser(user);
        journey.setPlannedDepartureTime(LocalDateTime.of(2026, 8, 9, 12, 0));

        stop = new JourneyStop();
        stop.setId(UUID.randomUUID());
        stop.setJourney(journey);
        stop.setLat(41.01);
        stop.setLng(28.97);
        stop.setVisitDurationMinutes(30);

        leg = new PlanLeg();
        leg.setId(UUID.randomUUID());
        leg.setFromStop(null);
        leg.setToStop(stop);
        leg.setDurationSeconds(600);
        // Encoded polyline representing coordinates (38.5, -120.2) -> (38.5412, -120.2324)
        leg.setPolylineEncoded("_p~iF~ps|U_cidP_cidP");

        plan = new JourneyPlan();
        plan.setId(UUID.randomUUID());
        plan.setIsSelected(true);
        plan.setLegs(List.of(leg));

        journey.setPlans(List.of(plan));
        journey.setStops(List.of(stop));
    }

    @Test
    void testGetAlongRoutePoi() {
        when(journeyRepository.findById(journey.getId())).thenReturn(Optional.of(journey));

        GooglePlaceResult poi = new GooglePlaceResult();
        poi.setPlaceId("poi1");
        poi.setName("Test Pharmacy");
        poi.setVicinity("Istanbul");
        poi.setLat(38.501);
        poi.setLng(-120.201);
        poi.setRating(4.5);
        poi.setUserRatingsTotal(100);

        when(osmPlacesProvider.searchNearby(anyDouble(), anyDouble(), anyInt(), eq("pharmacy")))
                .thenReturn(List.of(poi));

        List<AlongRoutePoiResponse> result = placesService.getAlongRoutePoi(
                journey.getId(), "pharmacy", 15.0, 3.0, user);

        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertEquals("poi1", result.get(0).getPlaceId());
        assertEquals("Test Pharmacy", result.get(0).getName());
    }

    @Test
    void testGetParkingOptions() {
        when(journeyStopRepository.findById(stop.getId())).thenReturn(Optional.of(stop));

        ParkingResult lot = new ParkingResult(
                "lot1",
                "Otopark",
                41.011,
                28.971,
                100,
                50,
                true,
                "public"
        );

        when(parkingProvider.findNearby(any(GeoPoint.class), anyInt()))
                .thenReturn(List.of(lot));

        List<ParkingOptionResponse> result = placesService.getParkingOptions(stop.getId(), user);

        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertEquals("lot1", result.get(0).getPlaceId());
        assertNotNull(result.get(0).getEffectiveArrivalTime());
    }
}
