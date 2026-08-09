package com.smartroute.service.routing;

import java.util.List;

public interface RoutingProvider {
    DistanceMatrixResult computeMatrix(List<GeoPoint> origins, List<GeoPoint> destinations);
    List<RouteCandidate> computeRoute(GeoPoint origin, GeoPoint destination, RouteOptions options);
}
