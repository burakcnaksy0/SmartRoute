package com.smartroute.controller;

import com.smartroute.dto.CalculateRouteRequest;
import com.smartroute.dto.CalculateRouteResponse;
import com.smartroute.service.routing.DistanceMatrixResult;
import com.smartroute.service.routing.GeoPoint;
import com.smartroute.service.routing.RouteCandidate;
import com.smartroute.service.routing.RoutingProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RouteControllerTest {

    @Mock
    private RoutingProvider routingProvider;

    private RouteController routeController;

    @BeforeEach
    void setUp() {
        routeController = new RouteController(routingProvider);
    }

    @Test
    void calculateRoute_nullOrigin_returnsBadRequest() {
        CalculateRouteRequest request = new CalculateRouteRequest();
        request.setDestination(new CalculateRouteRequest.Coordinate(41.01, 29.05));

        ResponseEntity<CalculateRouteResponse> response = routeController.calculateRoute(request);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void calculateRoute_success() {
        CalculateRouteRequest request = new CalculateRouteRequest();
        request.setOrigin(new CalculateRouteRequest.Coordinate(40.99, 29.03));
        request.setDestination(new CalculateRouteRequest.Coordinate(41.05, 29.10));
        request.setWaypoints(List.of(
                new CalculateRouteRequest.Coordinate(41.01, 29.05)
        ));

        CalculateRouteRequest.Options options = new CalculateRouteRequest.Options();
        options.setPreferredRouteType("FASTEST");
        options.setPreserveStopOrder(false);
        request.setOptions(options);

        // Matrix for 3 points: [0: origin, 1: wp1, 2: dest]
        long[][] durations = {
                {0, 600, 1800},
                {600, 0, 1200},
                {1800, 1200, 0}
        };
        long[][] distances = {
                {0, 5000, 15000},
                {5000, 0, 10000},
                {15000, 10000, 0}
        };
        when(routingProvider.computeMatrix(anyList(), anyList()))
                .thenReturn(new DistanceMatrixResult(durations, distances));

        when(routingProvider.computeRoute(any(GeoPoint.class), any(GeoPoint.class), any()))
                .thenReturn(List.of(new RouteCandidate(600, 5000, BigDecimal.ZERO, "encoded_polyline")));

        ResponseEntity<CalculateRouteResponse> response = routeController.calculateRoute(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        CalculateRouteResponse body = response.getBody();
        assertTrue(body.getTotalDurationSeconds() > 0);
        assertTrue(body.getTotalDistanceMeters() > 0);
        assertNotNull(body.getExplanation());
    }
}
