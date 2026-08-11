package com.smartroute.controller;

import com.smartroute.dto.CalculateRouteRequest;
import com.smartroute.dto.CalculateRouteResponse;
import com.smartroute.service.routing.DistanceMatrixResult;
import com.smartroute.service.routing.GeoPoint;
import com.smartroute.service.routing.RouteCandidate;
import com.smartroute.service.routing.RouteOptions;
import com.smartroute.service.routing.RoutingProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping({"/api", "/api/v1"})
public class RouteController {

    private final RoutingProvider routingProvider;

    public RouteController(RoutingProvider routingProvider) {
        this.routingProvider = routingProvider;
    }

    @PostMapping("/routes/calculate")
    public ResponseEntity<CalculateRouteResponse> calculateRoute(@RequestBody CalculateRouteRequest request) {
        if (request.getOrigin() == null || request.getDestination() == null) {
            return ResponseEntity.badRequest().build();
        }

        CalculateRouteRequest.Coordinate origin = request.getOrigin();
        CalculateRouteRequest.Coordinate destination = request.getDestination();
        List<CalculateRouteRequest.Coordinate> waypoints = request.getWaypoints();
        if (waypoints == null) {
            waypoints = Collections.emptyList();
        }

        CalculateRouteRequest.Options options = request.getOptions();
        if (options == null) {
            options = new CalculateRouteRequest.Options();
            options.setPreferredRouteType("BALANCED");
        }

        int n = waypoints.size();

        // Build list of all points
        List<GeoPoint> allPoints = new ArrayList<>();
        allPoints.add(new GeoPoint(origin.getLatitude(), origin.getLongitude()));
        for (CalculateRouteRequest.Coordinate wp : waypoints) {
            allPoints.add(new GeoPoint(wp.getLatitude(), wp.getLongitude()));
        }
        allPoints.add(new GeoPoint(destination.getLatitude(), destination.getLongitude()));

        // Fetch Distance Matrix
        DistanceMatrixResult matrix = routingProvider.computeMatrix(allPoints, allPoints);

        // Find the best waypoint ordering
        List<Integer> bestPerm = new ArrayList<>();
        if (options.isPreserveStopOrder() || n <= 1) {
            // Keep original order: 1, 2, ..., n
            for (int i = 1; i <= n; i++) {
                bestPerm.add(i);
            }
        } else {
            // Generate all permutations of waypoints (indices 1 to n)
            List<List<Integer>> permutations = new ArrayList<>();
            List<Integer> initialList = new ArrayList<>();
            for (int i = 1; i <= n; i++) {
                initialList.add(i);
            }
            generatePermutations(initialList, 0, permutations);

            // Evaluate permutations and find the best one according to profile
            String profile = options.getPreferredRouteType() != null ? options.getPreferredRouteType().toUpperCase(Locale.ROOT) : "BALANCED";
            bestPerm = findBestPermutation(permutations, matrix, n, profile);
        }

        // Reconstruct the point sequence: origin -> permuted waypoints -> destination
        List<GeoPoint> finalSequence = new ArrayList<>();
        finalSequence.add(new GeoPoint(origin.getLatitude(), origin.getLongitude()));
        for (int idx : bestPerm) {
            CalculateRouteRequest.Coordinate wp = waypoints.get(idx - 1);
            finalSequence.add(new GeoPoint(wp.getLatitude(), wp.getLongitude()));
        }
        finalSequence.add(new GeoPoint(destination.getLatitude(), destination.getLongitude()));

        // Calculate segment routing leg-by-leg
        RouteOptions routingOptions = new RouteOptions();
        routingOptions.setAvoidTolls(options.isAvoidTolls());
        routingOptions.setAvoidHighways(options.isAvoidHighways());
        routingOptions.setDepartureTime(LocalDateTime.now());

        int totalDistanceMeters = 0;
        int totalDurationSeconds = 0;
        List<double[]> allPathCoords = new ArrayList<>();

        for (int i = 0; i < finalSequence.size() - 1; i++) {
            GeoPoint from = finalSequence.get(i);
            GeoPoint to = finalSequence.get(i + 1);

            List<RouteCandidate> candidates = routingProvider.computeRoute(from, to, routingOptions);
            if (!candidates.isEmpty()) {
                RouteCandidate bestCandidate = candidates.get(0);
                totalDistanceMeters += bestCandidate.getDistanceMeters();
                totalDurationSeconds += bestCandidate.getDurationSeconds();
                if (bestCandidate.getPolylineEncoded() != null && !bestCandidate.getPolylineEncoded().isEmpty()) {
                    allPathCoords.addAll(decodePolyline(bestCandidate.getPolylineEncoded()));
                }
            } else {
                // If route calculation fails for a segment, use matrix estimates
                totalDistanceMeters += matrix.getDistances()[i][i + 1];
                totalDurationSeconds += matrix.getDurations()[i][i + 1];
            }
        }

        // Calculate fuel cost estimate
        double distanceKm = totalDistanceMeters / 1000.0;
        BigDecimal fuelCost = BigDecimal.valueOf((distanceKm / 100.0) * options.getFuelConsumption() * options.getFuelPrice())
                .setScale(2, RoundingMode.HALF_UP);

        String combinedPolyline = encodePolyline(allPathCoords);
        String explanation = String.format("Seçilen rota tercih ettiğiniz %s kriterine göre optimize edilmiştir. Toplam %.1f km mesafe ve %d dakika seyahat süresi öngörülmektedir.",
                options.getPreferredRouteType() != null ? options.getPreferredRouteType().toLowerCase(Locale.ROOT) : "balanced",
                distanceKm, totalDurationSeconds / 60);

        CalculateRouteResponse response = new CalculateRouteResponse(
                totalDistanceMeters,
                totalDurationSeconds,
                BigDecimal.ZERO,
                fuelCost,
                bestPerm,
                combinedPolyline,
                explanation
        );

        return ResponseEntity.ok(response);
    }

    private void generatePermutations(List<Integer> arr, int k, List<List<Integer>> result) {
        if (k == arr.size() - 1) {
            result.add(new ArrayList<>(arr));
            return;
        }
        for (int i = k; i < arr.size(); i++) {
            Collections.swap(arr, i, k);
            generatePermutations(arr, k + 1, result);
            Collections.swap(arr, k, i);
        }
    }

    private List<Integer> findBestPermutation(List<List<Integer>> perms, DistanceMatrixResult matrix, int n, String profile) {
        if (perms.isEmpty()) return Collections.emptyList();
        if (perms.size() == 1) return perms.get(0);

        List<Integer> best = perms.get(0);
        double bestVal = Double.MAX_VALUE;

        long minD = Long.MAX_VALUE, maxD = Long.MIN_VALUE;
        long minT = Long.MAX_VALUE, maxT = Long.MIN_VALUE;

        // Calculate paths totals
        long[] distances = new long[perms.size()];
        long[] durations = new long[perms.size()];

        for (int i = 0; i < perms.size(); i++) {
            List<Integer> p = perms.get(i);
            long dist = matrix.getDistances()[0][p.get(0)];
            long dur = matrix.getDurations()[0][p.get(0)];

            for (int j = 0; j < p.size() - 1; j++) {
                dist += matrix.getDistances()[p.get(j)][p.get(j + 1)];
                dur += matrix.getDurations()[p.get(j)][p.get(j + 1)];
            }
            dist += matrix.getDistances()[p.get(p.size() - 1)][n + 1];
            dur += matrix.getDurations()[p.get(p.size() - 1)][n + 1];

            distances[i] = dist;
            durations[i] = dur;

            if (dist < minD) minD = dist;
            if (dist > maxD) maxD = dist;
            if (dur < minT) minT = dur;
            if (dur > maxT) maxT = dur;
        }

        for (int i = 0; i < perms.size(); i++) {
            double normD = (maxD == minD) ? 0.0 : (double) (distances[i] - minD) / (maxD - minD);
            double normT = (maxT == minT) ? 0.0 : (double) (durations[i] - minT) / (maxT - minT);

            double score;
            switch (profile) {
                case "FASTEST", "FAST" -> score = normT * 0.8 + normD * 0.2;
                case "SHORTEST", "SHORT" -> score = normD * 0.8 + normT * 0.2;
                case "CHEAPEST", "ECONOMIC" -> score = normD * 0.7 + normT * 0.3;
                default -> score = normT * 0.5 + normD * 0.5; // Balanced
            }

            if (score < bestVal) {
                bestVal = score;
                best = perms.get(i);
            }
        }

        return best;
    }

    private List<double[]> decodePolyline(String encoded) {
        List<double[]> track = new ArrayList<>();
        if (encoded == null || encoded.isEmpty()) {
            return track;
        }
        try {
            int index = 0;
            int len = encoded.length();
            int lat = 0, lng = 0;

            while (index < len) {
                int b, shift = 0, result = 0;
                do {
                    if (index >= len) break;
                    b = encoded.charAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
                lat += dlat;

                shift = 0;
                result = 0;
                do {
                    if (index >= len) break;
                    b = encoded.charAt(index++) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
                lng += dlng;

                track.add(new double[]{lat / 1e5, lng / 1e5});
            }
        } catch (Exception ignored) {
        }
        return track;
    }

    private String encodePolyline(List<double[]> points) {
        StringBuilder encodedString = new StringBuilder();
        int lastLat = 0;
        int lastLng = 0;
        for (double[] point : points) {
            int lat = (int) Math.round(point[0] * 1e5);
            int lng = (int) Math.round(point[1] * 1e5);
            int dLat = lat - lastLat;
            int dLng = lng - lastLng;
            encodeValue(dLat, encodedString);
            encodeValue(dLng, encodedString);
            lastLat = lat;
            lastLng = lng;
        }
        return encodedString.toString();
    }

    private void encodeValue(int value, StringBuilder sb) {
        int val = value < 0 ? ~(value << 1) : (value << 1);
        while (val >= 0x20) {
            sb.append((char) ((0x20 | (val & 0x1f)) + 63));
            val >>= 5;
        }
        sb.append((char) (val + 63));
    }
}
