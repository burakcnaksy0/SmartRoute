package com.smartroute.service.journey;

import com.smartroute.domain.JourneyStop;
import com.smartroute.exception.InfeasiblePlanException;
import com.smartroute.service.routing.DistanceMatrixResult;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class OptimizationEngine {

    public static class CandidatePath {
        private final List<Integer> permutation;
        private final long totalDurationSeconds;
        private final long totalDistanceMeters;

        public CandidatePath(List<Integer> permutation, long totalDurationSeconds, long totalDistanceMeters) {
            this.permutation = permutation;
            this.totalDurationSeconds = totalDurationSeconds;
            this.totalDistanceMeters = totalDistanceMeters;
        }

        public List<Integer> getPermutation() {
            return permutation;
        }

        public long getTotalDurationSeconds() {
            return totalDurationSeconds;
        }

        public long getTotalDistanceMeters() {
            return totalDistanceMeters;
        }
    }

    public List<CandidatePath> findFeasiblePaths(List<JourneyStop> stops, DistanceMatrixResult matrix, LocalDateTime plannedDepartureTime, boolean returnToStart) {
        int n = stops.size();
        if (n == 0) {
            return Collections.emptyList();
        }

        // Section 25.2 Pre-check: Physical impossibility between two critical stops
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                JourneyStop stopI = stops.get(i);
                JourneyStop stopJ = stops.get(j);

                if ("critical".equalsIgnoreCase(stopI.getPriority()) && "critical".equalsIgnoreCase(stopJ.getPriority())) {
                    if (stopI.getTimeWindowEnd() != null && stopJ.getTimeWindowEnd() != null) {
                        // Check i -> j
                        boolean okItoJ = true;
                        long durationItoJ = matrix.getDurations()[i + 1][j + 1];
                        LocalDateTime earliestDepI = (stopI.getTimeWindowStart() != null ? stopI.getTimeWindowStart() : plannedDepartureTime)
                                .plusMinutes(stopI.getVisitDurationMinutes());
                        if (earliestDepI.plusSeconds(durationItoJ).isAfter(stopJ.getTimeWindowEnd())) {
                            okItoJ = false;
                        }

                        // Check j -> i
                        boolean okJtoI = true;
                        long durationJtoI = matrix.getDurations()[j + 1][i + 1];
                        LocalDateTime earliestDepJ = (stopJ.getTimeWindowStart() != null ? stopJ.getTimeWindowStart() : plannedDepartureTime)
                                .plusMinutes(stopJ.getVisitDurationMinutes());
                        if (earliestDepJ.plusSeconds(durationJtoI).isAfter(stopI.getTimeWindowEnd())) {
                            okJtoI = false;
                        }

                        if (!okItoJ && !okJtoI) {
                            throw new InfeasiblePlanException("Kritik duraklar olan '" + stopI.getPlaceName() + "' ve '" + stopJ.getPlaceName() + "' pencereleri fiziksel olarak çakışıyor ve aynı planda karşılanamaz.");
                        }
                    }
                }
            }
        }

        // Generate all permutations of indices 1..n
        List<List<Integer>> permutations = new ArrayList<>();
        List<Integer> initial = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            initial.add(i);
        }
        generatePermutationsRecursive(initial, 0, permutations);

        List<CandidatePath> feasiblePaths = new ArrayList<>();

        for (List<Integer> perm : permutations) {
            LocalDateTime currentTime = plannedDepartureTime;
            int currentNode = 0;
            long totalDistance = 0;
            boolean valid = true;

            for (int nextNode : perm) {
                long travelTime = matrix.getDurations()[currentNode][nextNode];
                long travelDist = matrix.getDistances()[currentNode][nextNode];

                LocalDateTime arrivalTime = currentTime.plusSeconds(travelTime);
                JourneyStop stop = stops.get(nextNode - 1);

                // Check time window
                if (stop.getTimeWindowStart() != null && arrivalTime.isBefore(stop.getTimeWindowStart())) {
                    // Arrived early, must wait
                    currentTime = stop.getTimeWindowStart();
                } else {
                    currentTime = arrivalTime;
                }

                if (stop.getTimeWindowEnd() != null && currentTime.isAfter(stop.getTimeWindowEnd())) {
                    // Time window violation
                    valid = false;
                    break;
                }

                // Perform visit
                currentTime = currentTime.plusMinutes(stop.getVisitDurationMinutes());
                totalDistance += travelDist;
                currentNode = nextNode;
            }

            if (!valid) {
                continue;
            }

            // Return to start if requested
            if (returnToStart) {
                long travelTime = matrix.getDurations()[currentNode][0];
                long travelDist = matrix.getDistances()[currentNode][0];
                currentTime = currentTime.plusSeconds(travelTime);
                totalDistance += travelDist;
            }

            long totalDuration = java.time.Duration.between(plannedDepartureTime, currentTime).getSeconds();
            feasiblePaths.add(new CandidatePath(perm, totalDuration, totalDistance));
        }

        if (feasiblePaths.isEmpty()) {
            throw new InfeasiblePlanException("Zaman pencereleriyle uyumlu bir rota bulunamadı.");
        }

        return feasiblePaths;
    }

    private void generatePermutationsRecursive(List<Integer> arr, int k, List<List<Integer>> result) {
        for (int i = k; i < arr.size(); i++) {
            Collections.swap(arr, i, k);
            generatePermutationsRecursive(arr, k + 1, result);
            Collections.swap(arr, k, i);
        }
        if (k == arr.size() - 1) {
            result.add(new ArrayList<>(arr));
        }
    }

    public List<Integer> findBestPermutationForProfile(List<CandidatePath> feasiblePaths, String profileType) {
        if (feasiblePaths.isEmpty()) {
            return Collections.emptyList();
        }

        // Simple case: only one path
        if (feasiblePaths.size() == 1) {
            return feasiblePaths.get(0).getPermutation();
        }

        // Find min/max values
        long minD = Long.MAX_VALUE, maxD = Long.MIN_VALUE;
        long minT = Long.MAX_VALUE, maxT = Long.MIN_VALUE;

        for (CandidatePath path : feasiblePaths) {
            if (path.getTotalDistanceMeters() < minD) minD = path.getTotalDistanceMeters();
            if (path.getTotalDistanceMeters() > maxD) maxD = path.getTotalDistanceMeters();
            if (path.getTotalDurationSeconds() < minT) minT = path.getTotalDurationSeconds();
            if (path.getTotalDurationSeconds() > maxT) maxT = path.getTotalDurationSeconds();
        }

        // Set weights
        double wTime = 0.30;
        double wCost = 0.20;
        double wDistance = 0.10;

        if ("fast".equalsIgnoreCase(profileType)) {
            wTime = 0.55;
            wCost = 0.10;
            wDistance = 0.10;
        } else if ("economic".equalsIgnoreCase(profileType)) {
            wTime = 0.20;
            wCost = 0.50;
            wDistance = 0.10;
        }

        double bestScore = Double.MAX_VALUE;
        CandidatePath bestPath = feasiblePaths.get(0);

        for (CandidatePath path : feasiblePaths) {
            double normD = (maxD == minD) ? 0.0 : (double) (path.getTotalDistanceMeters() - minD) / (maxD - minD);
            double normT = (maxT == minT) ? 0.0 : (double) (path.getTotalDurationSeconds() - minT) / (maxT - minT);

            // Cost score is proportional to distance since we assume constant fuel consumption offline
            double score = wTime * normT + (wCost + wDistance) * normD;

            if (score < bestScore) {
                bestScore = score;
                bestPath = path;
            }
        }

        return bestPath.getPermutation();
    }
}
