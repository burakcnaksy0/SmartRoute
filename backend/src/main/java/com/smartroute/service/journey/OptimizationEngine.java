package com.smartroute.service.journey;

import com.smartroute.domain.JourneyStop;
import com.smartroute.exception.InfeasiblePlanException;
import com.smartroute.service.routing.DistanceMatrixResult;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Core optimization algorithm — VRPTW (Vehicle Routing Problem with Time Windows).
 *
 * Strategy (Section 11.2):
 *   Phase 1 — Pre-filter:  Detect physically impossible pairs of critical stops before any search.
 *   Phase 2 — Candidate Generation:
 *              ≤ 8 stops  → full permutation (brute-force, filtered by time window feasibility)
 *              9+ stops   → Nearest Neighbor heuristic + 2-opt local search (Section 11.2, Faz 5)
 *   Phase 3 — Multi-objective scoring (Section 11.3).
 *
 * Performance target: 9-20 stops in < 3 seconds (Section 11.6).
 *
 * IMPORTANT: This engine is a pure algorithm — it never calls any external API directly.
 * Google Routes API is intentionally NOT used for waypoint ordering (Section 12.2 constraint).
 */
@Service
public class OptimizationEngine {

    /** Threshold above which the NN + 2-opt heuristic is used instead of brute-force. */
    static final int HEURISTIC_THRESHOLD = 9;

    // ──────────────────────────────────────────────────────────────────────────
    // Inner types
    // ──────────────────────────────────────────────────────────────────────────

    public static class CandidatePath {
        private final List<Integer> permutation;
        private final long totalDurationSeconds;
        private final long totalDistanceMeters;

        public CandidatePath(List<Integer> permutation, long totalDurationSeconds, long totalDistanceMeters) {
            this.permutation = permutation;
            this.totalDurationSeconds = totalDurationSeconds;
            this.totalDistanceMeters = totalDistanceMeters;
        }

        public List<Integer> getPermutation() { return permutation; }
        public long getTotalDurationSeconds() { return totalDurationSeconds; }
        public long getTotalDistanceMeters() { return totalDistanceMeters; }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Public API
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Entry point.  Returns a list of feasible candidate paths.
     *
     * @throws InfeasiblePlanException if critical stop time windows are physically impossible
     *                                 to satisfy in any ordering, or if no valid ordering exists.
     */
    public List<CandidatePath> findFeasiblePaths(
            List<JourneyStop> stops,
            DistanceMatrixResult matrix,
            LocalDateTime plannedDepartureTime,
            boolean returnToStart) {

        int n = stops.size();
        if (n == 0) return Collections.emptyList();

        // ── Phase 1: Pre-filter impossible critical-stop pairs (Section 25.2) ───
        preCheckCriticalStopConflicts(stops, matrix, plannedDepartureTime);

        // ── Phase 2: Generate candidates ─────────────────────────────────────
        List<CandidatePath> feasiblePaths;
        if (n < HEURISTIC_THRESHOLD) {
            // Brute-force: all permutations of indices 1..n
            feasiblePaths = bruteForce(stops, matrix, plannedDepartureTime, returnToStart, n);
        } else {
            // Heuristic: NN + 2-opt
            feasiblePaths = nearestNeighborWith2Opt(stops, matrix, plannedDepartureTime, returnToStart, n);
        }

        if (feasiblePaths.isEmpty()) {
            throw new InfeasiblePlanException(
                    "Verilen zaman penceresi kısıtlarıyla uyumlu bir rota bulunamadı. Lütfen kısıtları gevşetin veya bazı durakların önceliğini düşürün.");
        }

        return feasiblePaths;
    }

    /**
     * From the list of feasible paths, find the best single permutation for a given profile.
     * Uses the multi-objective scoring function described in Section 11.3.
     */
    public List<Integer> findBestPermutationForProfile(List<CandidatePath> feasiblePaths, String profileType) {
        return findBestPermutationForProfile(feasiblePaths, profileType, null, null);
    }

    /**
     * From the list of feasible paths, find the best single permutation for a given profile.
     * Uses the multi-objective scoring function described in Section 11.3.
     */
    public List<Integer> findBestPermutationForProfile(
            List<CandidatePath> feasiblePaths,
            String profileType,
            double[] stopParkingDifficulties,
            double[] stopTrafficRisks) {

        if (feasiblePaths.isEmpty()) return Collections.emptyList();
        if (feasiblePaths.size() == 1) return feasiblePaths.get(0).getPermutation();

        int n = feasiblePaths.get(0).getPermutation().size();
        double[] parkingDiffs = stopParkingDifficulties != null ? stopParkingDifficulties : new double[n];
        double[] trafficRisks = stopTrafficRisks != null ? stopTrafficRisks : new double[n];

        // Min-max normalization bounds
        long minD = Long.MAX_VALUE, maxD = Long.MIN_VALUE;
        long minT = Long.MAX_VALUE, maxT = Long.MIN_VALUE;
        double minP = Double.MAX_VALUE, maxP = -Double.MAX_VALUE;
        double minTR = Double.MAX_VALUE, maxTR = -Double.MAX_VALUE;

        // Calculate path totals and find bounds
        List<Double> pathParkingDiffs = new ArrayList<>();
        List<Double> pathTrafficRisks = new ArrayList<>();

        for (CandidatePath p : feasiblePaths) {
            if (p.getTotalDistanceMeters() < minD) minD = p.getTotalDistanceMeters();
            if (p.getTotalDistanceMeters() > maxD) maxD = p.getTotalDistanceMeters();
            if (p.getTotalDurationSeconds() < minT) minT = p.getTotalDurationSeconds();
            if (p.getTotalDurationSeconds() > maxT) maxT = p.getTotalDurationSeconds();

            double pDiff = 0.0;
            double trRisk = 0.0;
            for (int node : p.getPermutation()) {
                if (node - 1 < parkingDiffs.length) pDiff += parkingDiffs[node - 1];
                if (node - 1 < trafficRisks.length) trRisk += trafficRisks[node - 1];
            }
            pathParkingDiffs.add(pDiff);
            pathTrafficRisks.add(trRisk);

            if (pDiff < minP) minP = pDiff;
            if (pDiff > maxP) maxP = pDiff;
            if (trRisk < minTR) minTR = trRisk;
            if (trRisk > maxTR) maxTR = trRisk;
        }

        // Profile weights (Section 11.3 table)
        double wTime;
        double wCost;
        double wTraffic;
        double wParking;
        double wDistance;

        switch (profileType == null ? "balanced" : profileType.toLowerCase()) {
            case "fast"        -> { wTime = 0.55; wCost = 0.10; wTraffic = 0.20; wParking = 0.05; wDistance = 0.10; }
            case "economic"    -> { wTime = 0.20; wCost = 0.50; wTraffic = 0.15; wParking = 0.05; wDistance = 0.10; }
            case "stress_free" -> { wTime = 0.20; wCost = 0.10; wTraffic = 0.50; wParking = 0.15; wDistance = 0.05; }
            case "comfortable" -> { wTime = 0.25; wCost = 0.10; wTraffic = 0.30; wParking = 0.25; wDistance = 0.10; }
            case "eco"         -> { wTime = 0.15; wCost = 0.35; wTraffic = 0.10; wParking = 0.05; wDistance = 0.35; }
            default            -> { wTime = 0.30; wCost = 0.20; wTraffic = 0.25; wParking = 0.15; wDistance = 0.10; } // balanced
        }

        double bestScore = Double.MAX_VALUE;
        CandidatePath bestPath = feasiblePaths.get(0);

        for (int i = 0; i < feasiblePaths.size(); i++) {
            CandidatePath p = feasiblePaths.get(i);
            double normD = (maxD == minD) ? 0.0 : (double)(p.getTotalDistanceMeters() - minD) / (maxD - minD);
            double normT = (maxT == minT) ? 0.0 : (double)(p.getTotalDurationSeconds() - minT) / (maxT - minT);
            double normP = (maxP == minP) ? 0.0 : (pathParkingDiffs.get(i) - minP) / (maxP - minP);
            double normTR = (maxTR == minTR) ? 0.0 : (pathTrafficRisks.get(i) - minTR) / (maxTR - minTR);

            // Lower is better (cost function)
            double score = wTime * normT + (wCost + wDistance) * normD + wTraffic * normTR + wParking * normP;
            if (score < bestScore) {
                bestScore = score;
                bestPath = p;
            }
        }

        return bestPath.getPermutation();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Phase 1 — Critical stop conflict detection
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Checks all pairs of critical stops with time windows.
     * If neither A→B nor B→A ordering can satisfy both windows given the travel time between them,
     * throws InfeasiblePlanException naming the two conflicting stops.
     */
    private void preCheckCriticalStopConflicts(
            List<JourneyStop> stops,
            DistanceMatrixResult matrix,
            LocalDateTime departureTime) {

        int n = stops.size();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                JourneyStop si = stops.get(i);
                JourneyStop sj = stops.get(j);

                // Only critical-critical pairs with both having a time window end
                if (!isCritical(si) || !isCritical(sj)) continue;
                if (si.getTimeWindowEnd() == null || sj.getTimeWindowEnd() == null) continue;

                // Matrix indices: 0 = start, 1..n = stops (i+1 and j+1)
                long durItoJ = matrix.getDurations()[i + 1][j + 1];
                long durJtoI = matrix.getDurations()[j + 1][i + 1];

                // Earliest we can *depart* from si after completing its visit
                LocalDateTime earliestDepFromSi = earliestDeparture(si, departureTime);
                // Earliest we can *depart* from sj after completing its visit
                LocalDateTime earliestDepFromSj = earliestDeparture(sj, departureTime);

                boolean okItoJ = earliestDepFromSi.plusSeconds(durItoJ).isBefore(sj.getTimeWindowEnd())
                        || earliestDepFromSi.plusSeconds(durItoJ).isEqual(sj.getTimeWindowEnd());
                boolean okJtoI = earliestDepFromSj.plusSeconds(durJtoI).isBefore(si.getTimeWindowEnd())
                        || earliestDepFromSj.plusSeconds(durJtoI).isEqual(si.getTimeWindowEnd());

                if (!okItoJ && !okJtoI) {
                    throw new InfeasiblePlanException(
                            "Kritik duraklar '" + si.getPlaceName() + "' ve '" + sj.getPlaceName()
                                    + "' arasındaki seyahat süresi, her iki durağın zaman pencerelerini aynı planda karşılamayı fiziksel olarak imkânsız kılıyor.",
                            si.getPlaceName(),
                            sj.getPlaceName());
                }
            }
        }
    }

    private boolean isCritical(JourneyStop stop) {
        return "critical".equalsIgnoreCase(stop.getPriority());
    }

    /**
     * Returns the earliest LocalDateTime at which we could *depart* from a stop,
     * accounting for the time window start (we wait if we arrive early) and visit duration.
     */
    private LocalDateTime earliestDeparture(JourneyStop stop, LocalDateTime globalDeparture) {
        LocalDateTime base = (stop.getTimeWindowStart() != null)
                ? stop.getTimeWindowStart()
                : globalDeparture;
        return base.plusMinutes(stop.getVisitDurationMinutes());
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Phase 2a — Brute-force (≤ 8 stops)
    // ──────────────────────────────────────────────────────────────────────────

    private List<CandidatePath> bruteForce(
            List<JourneyStop> stops,
            DistanceMatrixResult matrix,
            LocalDateTime departure,
            boolean returnToStart,
            int n) {

        List<List<Integer>> perms = new ArrayList<>();
        List<Integer> initial = new ArrayList<>();
        for (int i = 1; i <= n; i++) initial.add(i);
        generatePermutations(initial, 0, perms);

        List<CandidatePath> result = new ArrayList<>();
        for (List<Integer> perm : perms) {
            evaluateAndAdd(perm, stops, matrix, departure, returnToStart, result);
        }
        return result;
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

    // ──────────────────────────────────────────────────────────────────────────
    // Phase 2b — Nearest Neighbor + 2-opt (9+ stops, Section 11.2 Faz 5)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Nearest Neighbor construction heuristic followed by 2-opt local search.
     *
     * The NN heuristic is run from node 0 (start) using travel *duration* as proximity metric,
     * respecting time window feasibility at each step.  Then 2-opt iteratively swaps edge pairs
     * to reduce total duration until no improvement is found.
     *
     * Returns a list with a single (near-optimal) CandidatePath so the scoring phase works
     * identically to the brute-force case.  For very large inputs (15-20 stops) this is
     * fast enough to stay within the < 3 second SLA.
     */
    private List<CandidatePath> nearestNeighborWith2Opt(
            List<JourneyStop> stops,
            DistanceMatrixResult matrix,
            LocalDateTime departure,
            boolean returnToStart,
            int n) {

        // ─── Nearest Neighbor construction ───────────────────────────────────
        List<Integer> tour = nearestNeighborTour(stops, matrix, departure, n);

        // If NN couldn't build a valid tour, return empty (caller throws)
        if (tour.isEmpty()) return Collections.emptyList();

        // ─── 2-opt local search ──────────────────────────────────────────────
        tour = twoOpt(tour, stops, matrix, departure);

        // Build the single CandidatePath from the final tour
        List<CandidatePath> result = new ArrayList<>();
        evaluateAndAdd(tour, stops, matrix, departure, returnToStart, result);

        // Also try a few random restarts to escape local optima for large sets
        if (n >= 15) {
            Random rng = new Random(42);
            for (int attempt = 0; attempt < 3; attempt++) {
                List<Integer> shuffled = new ArrayList<>(tour);
                Collections.shuffle(shuffled, rng);
                shuffled = twoOpt(shuffled, stops, matrix, departure);
                evaluateAndAdd(shuffled, stops, matrix, departure, returnToStart, result);
            }
        }

        return result;
    }

    /**
     * Greedy nearest-neighbor construction starting from the depot (index 0).
     * At each step, the unvisited stop with the shortest travel time that also
     * satisfies its time window is selected next.
     */
    private List<Integer> nearestNeighborTour(
            List<JourneyStop> stops,
            DistanceMatrixResult matrix,
            LocalDateTime departure,
            int n) {

        boolean[] visited = new boolean[n + 1]; // index 0 = start (depot)
        List<Integer> tour = new ArrayList<>();
        LocalDateTime currentTime = departure;
        int currentNode = 0;

        for (int step = 0; step < n; step++) {
            int nearest = -1;
            long nearestDuration = Long.MAX_VALUE;
            LocalDateTime nearestArrival = null;

            for (int candidate = 1; candidate <= n; candidate++) {
                if (visited[candidate]) continue;
                JourneyStop stop = stops.get(candidate - 1);
                long travelTime = matrix.getDurations()[currentNode][candidate];
                LocalDateTime arrival = currentTime.plusSeconds(travelTime);

                // Enforce time window end for all stops (not only critical)
                if (stop.getTimeWindowEnd() != null && arrival.isAfter(stop.getTimeWindowEnd())) {
                    continue; // Cannot arrive in time — skip
                }

                if (travelTime < nearestDuration) {
                    nearestDuration = travelTime;
                    nearest = candidate;
                    nearestArrival = arrival;
                }
            }

            if (nearest == -1) {
                // No feasible neighbor found; tour is incomplete — return what we have
                // (the caller will check for empty/infeasibility)
                return tour.isEmpty() ? Collections.emptyList() : tour;
            }

            visited[nearest] = true;
            tour.add(nearest);

            // Advance time: wait if arrived before window start, then visit
            JourneyStop nextStop = stops.get(nearest - 1);
            if (nextStop.getTimeWindowStart() != null && nearestArrival.isBefore(nextStop.getTimeWindowStart())) {
                currentTime = nextStop.getTimeWindowStart().plusMinutes(nextStop.getVisitDurationMinutes());
            } else {
                currentTime = nearestArrival.plusMinutes(nextStop.getVisitDurationMinutes());
            }
            currentNode = nearest;
        }

        return tour;
    }

    /**
     * 2-opt improvement.  Iterates over all (i, k) edge-swap pairs.
     * A swap is accepted if the reversed segment reduces total travel duration
     * AND the resulting tour remains time-window feasible.
     * Terminates when no improvement is found in a full pass (local optimum).
     */
    private List<Integer> twoOpt(
            List<Integer> tour,
            List<JourneyStop> stops,
            DistanceMatrixResult matrix,
            LocalDateTime departure) {

        int n = tour.size();
        boolean improved = true;

        while (improved) {
            improved = false;
            for (int i = 0; i < n - 1; i++) {
                for (int k = i + 1; k < n; k++) {
                    List<Integer> newTour = twoOptSwap(tour, i, k);
                    if (tourDuration(newTour, matrix) < tourDuration(tour, matrix)
                            && isTourFeasible(newTour, stops, matrix, departure)) {
                        tour = newTour;
                        improved = true;
                    }
                }
            }
        }
        return tour;
    }

    /** Reverse the segment [i+1 .. k] in the tour (standard 2-opt swap). */
    private List<Integer> twoOptSwap(List<Integer> tour, int i, int k) {
        List<Integer> newTour = new ArrayList<>(tour.subList(0, i + 1));
        List<Integer> reversed = new ArrayList<>(tour.subList(i + 1, k + 1));
        Collections.reverse(reversed);
        newTour.addAll(reversed);
        newTour.addAll(tour.subList(k + 1, tour.size()));
        return newTour;
    }

    /**
     * Total travel duration for a tour (ignoring visit durations for 2-opt cost comparison,
     * since they are constant regardless of ordering).
     */
    private long tourDuration(List<Integer> tour, DistanceMatrixResult matrix) {
        long total = matrix.getDurations()[0][tour.get(0)];
        for (int i = 0; i < tour.size() - 1; i++) {
            total += matrix.getDurations()[tour.get(i)][tour.get(i + 1)];
        }
        return total;
    }

    /** Returns true if every stop in the tour can be reached before its time window end. */
    private boolean isTourFeasible(
            List<Integer> tour,
            List<JourneyStop> stops,
            DistanceMatrixResult matrix,
            LocalDateTime departure) {

        LocalDateTime currentTime = departure;
        int currentNode = 0;

        for (int nextNode : tour) {
            long travelTime = matrix.getDurations()[currentNode][nextNode];
            LocalDateTime arrival = currentTime.plusSeconds(travelTime);
            JourneyStop stop = stops.get(nextNode - 1);

            if (stop.getTimeWindowEnd() != null && arrival.isAfter(stop.getTimeWindowEnd())) {
                return false;
            }

            // Wait if early
            if (stop.getTimeWindowStart() != null && arrival.isBefore(stop.getTimeWindowStart())) {
                currentTime = stop.getTimeWindowStart().plusMinutes(stop.getVisitDurationMinutes());
            } else {
                currentTime = arrival.plusMinutes(stop.getVisitDurationMinutes());
            }
            currentNode = nextNode;
        }
        return true;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Shared helper: evaluate a permutation and add to result if feasible
    // ──────────────────────────────────────────────────────────────────────────

    private void evaluateAndAdd(
            List<Integer> perm,
            List<JourneyStop> stops,
            DistanceMatrixResult matrix,
            LocalDateTime departure,
            boolean returnToStart,
            List<CandidatePath> result) {

        LocalDateTime currentTime = departure;
        int currentNode = 0;
        long totalDistance = 0;

        for (int nextNode : perm) {
            long travelTime = matrix.getDurations()[currentNode][nextNode];
            long travelDist = matrix.getDistances()[currentNode][nextNode];
            LocalDateTime arrival = currentTime.plusSeconds(travelTime);
            JourneyStop stop = stops.get(nextNode - 1);

            // Wait if arrived before window opens
            if (stop.getTimeWindowStart() != null && arrival.isBefore(stop.getTimeWindowStart())) {
                currentTime = stop.getTimeWindowStart();
            } else {
                currentTime = arrival;
            }

            // Time window violation → discard
            if (stop.getTimeWindowEnd() != null && currentTime.isAfter(stop.getTimeWindowEnd())) {
                return;
            }

            currentTime = currentTime.plusMinutes(stop.getVisitDurationMinutes());
            totalDistance += travelDist;
            currentNode = nextNode;
        }

        if (returnToStart) {
            long travelTime = matrix.getDurations()[currentNode][0];
            long travelDist = matrix.getDistances()[currentNode][0];
            currentTime = currentTime.plusSeconds(travelTime);
            totalDistance += travelDist;
        }

        long totalDuration = java.time.Duration.between(departure, currentTime).getSeconds();
        result.add(new CandidatePath(perm, totalDuration, totalDistance));
    }
}
