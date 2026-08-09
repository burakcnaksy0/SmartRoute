package com.smartroute.service.journey;

import com.smartroute.domain.JourneyStop;
import com.smartroute.exception.InfeasiblePlanException;
import com.smartroute.service.routing.DistanceMatrixResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for OptimizationEngine — covers all scenarios from Sections 26.2 and 26.5.
 *
 * Tests are organized into:
 *  - Pre-filter / Infeasibility detection (Bölüm 25.2)
 *  - Brute-force correctness (≤8 stops)
 *  - Heuristic correctness (9+ stops, Nearest Neighbor + 2-opt)
 *  - Scoring function (Section 26.5 — monotonicity, profile differentiation)
 *  - Algorithm regression (Section 26.5 — known hand-computed optimal)
 *  - Performance (SLA: 9-20 stops < 3 seconds)
 */
class OptimizationEngineTest {

    private OptimizationEngine engine;

    @BeforeEach
    void setUp() {
        engine = new OptimizationEngine();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    /** Creates a stop with no time window and given visit duration. */
    private JourneyStop stop(String name, int visitMinutes, String priority) {
        JourneyStop s = new JourneyStop();
        s.setPlaceName(name);
        s.setVisitDurationMinutes(visitMinutes);
        s.setPriority(priority);
        return s;
    }

    /** Creates a stop with an open-ended time window (only end bound). */
    private JourneyStop stopWithEnd(String name, int visitMinutes, String priority, LocalDateTime end) {
        JourneyStop s = stop(name, visitMinutes, priority);
        s.setTimeWindowEnd(end);
        return s;
    }

    /** Creates a stop with both time window bounds. */
    private JourneyStop stopWithWindow(String name, int visitMin, String priority, LocalDateTime start, LocalDateTime end) {
        JourneyStop s = stop(name, visitMin, priority);
        s.setTimeWindowStart(start);
        s.setTimeWindowEnd(end);
        return s;
    }

    /**
     * Builds a "linear" NxN distance/duration matrix where moving from node i to
     * node j costs |i-j| * unitCost (symmetric, zero diagonal).
     * Index 0 = depot/start.  Indices 1..n = stops.
     */
    private DistanceMatrixResult linearMatrix(int n, long unitCost) {
        int size = n + 1;
        long[][] dur = new long[size][size];
        long[][] dist = new long[size][size];
        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                long d = Math.abs(i - j) * unitCost;
                dur[i][j] = d;
                dist[i][j] = d;
            }
        }
        return new DistanceMatrixResult(dur, dist);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Pre-filter / Infeasibility detection
    // ──────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Pre-filter: critical stop conflict detection (Section 25.2)")
    class PreFilter {

        @Test
        @DisplayName("Two critical stops whose time windows are physically impossible → InfeasiblePlanException naming both stops")
        void impossibleCriticalPair_throws() {
            LocalDateTime now = LocalDateTime.of(2026, 8, 9, 10, 0);

            // Both stops close at 10:30, but travel between them takes 2h (7200s)
            JourneyStop s1 = stopWithEnd("Kargo Şubesi", 10, "critical", now.plusMinutes(30));
            JourneyStop s2 = stopWithEnd("Eczane", 10, "critical", now.plusMinutes(30));

            long[][] dur = {
                {0, 100, 100},
                {100, 0, 7200},
                {100, 7200, 0}
            };
            long[][] dist = new long[3][3];
            DistanceMatrixResult matrix = new DistanceMatrixResult(dur, dist);

            InfeasiblePlanException ex = assertThrows(InfeasiblePlanException.class,
                    () -> engine.findFeasiblePaths(List.of(s1, s2), matrix, now, false));

            // API must name both conflicting stops
            assertFalse(ex.getConflictingStops().isEmpty(), "Conflicting stop names must be populated");
            assertTrue(ex.getConflictingStops().contains("Kargo Şubesi"));
            assertTrue(ex.getConflictingStops().contains("Eczane"));
        }

        @Test
        @DisplayName("One critical, one high priority — no pre-filter conflict even if impossible")
        void criticalAndHighPriority_noPreFilterThrow() {
            // Pre-filter only triggers for critical-critical pairs
            LocalDateTime now = LocalDateTime.of(2026, 8, 9, 10, 0);
            JourneyStop s1 = stopWithEnd("Kritik Durak", 10, "critical", now.plusMinutes(30));
            JourneyStop s2 = stopWithEnd("Yüksek Öncelikli", 10, "high", now.plusMinutes(30));

            long[][] dur = {{0,100,100},{100,0,7200},{100,7200,0}};
            long[][] dist = new long[3][3];
            DistanceMatrixResult matrix = new DistanceMatrixResult(dur, dist);

            // Should NOT throw in pre-filter (non-critical pairs are filtered at permutation level)
            // It may still throw InfeasiblePlanException at the end if no valid perm exists, that's fine
            try {
                engine.findFeasiblePaths(List.of(s1, s2), matrix, now, false);
            } catch (InfeasiblePlanException ex) {
                // Acceptable — but the exception must NOT name both (since only critical-critical triggers naming)
                assertTrue(ex.getConflictingStops().isEmpty() || ex.getConflictingStops().size() < 2
                        || !ex.getConflictingStops().contains("Yüksek Öncelikli"),
                        "Non-critical stop should not be named as conflicting");
            }
        }

        @Test
        @DisplayName("Two critical stops that CAN be visited in order → no exception")
        void feasibleCriticalPair_noException() {
            LocalDateTime now = LocalDateTime.of(2026, 8, 9, 10, 0);
            // s1 window: until 10:30; s2 window: until 11:00; travel s1→s2 = 10 min
            JourneyStop s1 = stopWithEnd("Stop A", 5, "critical", now.plusMinutes(30));
            JourneyStop s2 = stopWithEnd("Stop B", 5, "critical", now.plusMinutes(60));

            long[][] dur = {{0,60,600},{60,0,600},{600,600,0}}; // s1→s2 = 600s = 10 min
            long[][] dist = new long[3][3];
            DistanceMatrixResult matrix = new DistanceMatrixResult(dur, dist);

            assertDoesNotThrow(() -> engine.findFeasiblePaths(List.of(s1, s2), matrix, now, false));
        }

        @Test
        @DisplayName("No time windows at all → no exception, results returned")
        void noTimeWindows_noProblem() {
            LocalDateTime now = LocalDateTime.of(2026, 8, 9, 10, 0);
            List<JourneyStop> stops = List.of(
                    stop("A", 10, "normal"),
                    stop("B", 10, "normal"),
                    stop("C", 10, "normal")
            );
            DistanceMatrixResult matrix = linearMatrix(3, 100);
            List<OptimizationEngine.CandidatePath> paths = engine.findFeasiblePaths(stops, matrix, now, false);
            assertFalse(paths.isEmpty());
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Determinism — all same priority, no time constraints → distance-only
    // ──────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Determinism: same priority + no time windows → distance/time based only")
    class Determinism {

        @Test
        @DisplayName("All normal priority, no constraints → same input always produces same output")
        void sameInputSameOutput() {
            LocalDateTime dep = LocalDateTime.of(2026, 8, 9, 10, 0);
            List<JourneyStop> stops = List.of(
                    stop("A", 0, "normal"),
                    stop("B", 0, "normal"),
                    stop("C", 0, "normal"),
                    stop("D", 0, "normal")
            );
            DistanceMatrixResult matrix = linearMatrix(4, 100);

            List<Integer> perm1 = engine.findBestPermutationForProfile(
                    engine.findFeasiblePaths(stops, matrix, dep, false), "balanced");
            List<Integer> perm2 = engine.findBestPermutationForProfile(
                    engine.findFeasiblePaths(stops, matrix, dep, false), "balanced");

            assertEquals(perm1, perm2, "Same input must produce identical output (determinism)");
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Algorithm Regression — hand-computed optimal (Section 26.5)
    // ──────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Algorithm regression: hand-computed known-optimal (Section 26.5)")
    class AlgorithmRegression {

        /**
         * 4-stop problem on a number line where stops are at positions 1, 2, 3, 4.
         * Depot is at position 0.  Cost = position distance.
         * Hand-computed optimal: 0→1→2→3→4 (sequential) = cost 4, any reversal costs more.
         */
        @Test
        @DisplayName("Linear 4-stop: optimal is sequential order (hand-computed)")
        void linearFourStop_optimalIsSequential() {
            LocalDateTime dep = LocalDateTime.of(2026, 8, 9, 10, 0);
            List<JourneyStop> stops = List.of(
                    stop("Stop1", 0, "normal"),
                    stop("Stop2", 0, "normal"),
                    stop("Stop3", 0, "normal"),
                    stop("Stop4", 0, "normal")
            );
            // Distances: |pos_i - pos_j| * 100s  (positions: depot=0, stops 1..4)
            DistanceMatrixResult matrix = linearMatrix(4, 100);

            List<OptimizationEngine.CandidatePath> paths = engine.findFeasiblePaths(stops, matrix, dep, false);
            List<Integer> best = engine.findBestPermutationForProfile(paths, "fast");

            // Hand-computed: the sequential path [1,2,3,4] has minimum total travel time
            assertEquals(List.of(1, 2, 3, 4), best,
                    "Optimal order for linear arrangement is sequential [1,2,3,4]");
        }

        /**
         * 3-stop TSP with known asymmetric costs.
         * Distances (hand-crafted): A→B=10, B→A=10, A→C=50, C→A=50, B→C=10, C→B=10
         * Depot→A=5, Depot→B=15, Depot→C=5.
         * Two tours: [A,B,C] costs 5+10+10=25; [A,C,B] costs 5+50+10=65.
         * Optimal: [A,B,C] = permutation [1,2,3].
         */
        @Test
        @DisplayName("Asymmetric 3-stop: optimal is [A,B,C] not [A,C,B] (hand-computed)")
        void asymmetricThreeStop_optimalIsABC() {
            LocalDateTime dep = LocalDateTime.of(2026, 8, 9, 10, 0);
            List<JourneyStop> stops = List.of(
                    stop("A", 0, "normal"),
                    stop("B", 0, "normal"),
                    stop("C", 0, "normal")
            );
            // 4x4 matrix: [depot, A, B, C]
            long[][] dur = {
                {0,   5,  15,  5},   // depot → X
                {5,   0,  10, 50},   // A → X
                {15, 10,   0, 10},   // B → X
                {5,  50,  10,  0}    // C → X
            };
            long[][] dist = dur;
            DistanceMatrixResult matrix = new DistanceMatrixResult(dur, dist);

            List<OptimizationEngine.CandidatePath> paths = engine.findFeasiblePaths(stops, matrix, dep, false);
            List<Integer> best = engine.findBestPermutationForProfile(paths, "fast");

            assertEquals(List.of(1, 2, 3), best, "Optimal tour is [A,B,C] with cost 5+10+10=25");
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Scoring Monotonicity (Section 26.5)
    // ──────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Score function monotonicity (Section 26.5)")
    class ScoreMonotonicity {

        /**
         * If we artificially inflate the duration of one candidate, the 'fast' profile
         * must prefer the other (shorter) candidate — proving score decreases monotonically
         * with increased duration.
         */
        @Test
        @DisplayName("Fast profile: inflating one path's duration causes it to be ranked worse")
        void fastProfile_longerDurationGetsWorseScore() {
            // Two candidates: short (1000s) and long (9999s)
            List<OptimizationEngine.CandidatePath> paths = new ArrayList<>();
            paths.add(new OptimizationEngine.CandidatePath(List.of(1, 2), 1000L, 5000L)); // short
            paths.add(new OptimizationEngine.CandidatePath(List.of(2, 1), 9999L, 5000L)); // long (inflated)

            List<Integer> best = engine.findBestPermutationForProfile(paths, "fast");

            assertEquals(List.of(1, 2), best,
                    "Fast profile must select the path with lower duration (monotonicity check)");
        }

        @Test
        @DisplayName("Economic profile: longer but cheaper path should rank better")
        void economicProfile_lowerCostGetsHigherRank() {
            // Economic profile heavily weights cost (distance as proxy)
            // Path A: fast (1000s) but expensive (dist 50000m)
            // Path B: slow (5000s) but cheap (dist 1000m)
            List<OptimizationEngine.CandidatePath> paths = new ArrayList<>();
            paths.add(new OptimizationEngine.CandidatePath(List.of(1, 2), 1000L, 50000L)); // fast, expensive
            paths.add(new OptimizationEngine.CandidatePath(List.of(2, 1), 5000L, 1000L));  // slow, cheap

            List<Integer> best = engine.findBestPermutationForProfile(paths, "economic");

            assertEquals(List.of(2, 1), best,
                    "Economic profile must prefer low-distance (cheap) path even if slower");
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Profile differentiation
    // ──────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Profile differentiation: different profiles → different best paths")
    class ProfileDifferentiation {

        @Test
        @DisplayName("Fast vs economic profile pick different paths when tradeoff is clear")
        void fastVsEconomicPickDifferentPaths() {
            // Path "speed": 500s duration, 30000m distance
            // Path "cheap": 3000s duration, 500m distance
            List<OptimizationEngine.CandidatePath> paths = new ArrayList<>();
            paths.add(new OptimizationEngine.CandidatePath(List.of(1, 2), 500L, 30000L));  // fast
            paths.add(new OptimizationEngine.CandidatePath(List.of(2, 1), 3000L, 500L));   // cheap

            List<Integer> fastBest     = engine.findBestPermutationForProfile(paths, "fast");
            List<Integer> economicBest = engine.findBestPermutationForProfile(paths, "economic");

            assertNotEquals(fastBest, economicBest,
                    "Fast and economic profiles must choose different paths when there is a clear cost/time tradeoff");
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. 8-stop brute-force correctness (existing test, kept + verified)
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("8 stops, linear matrix → optimal is sequential [1..8] (brute-force range)")
    void eightStops_linearMatrix_optimalIsSequential() {
        List<JourneyStop> stops = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            stops.add(stop("Stop" + i, 0, "normal"));
        }
        DistanceMatrixResult matrix = linearMatrix(8, 100);
        LocalDateTime dep = LocalDateTime.of(2026, 8, 9, 10, 0);

        List<OptimizationEngine.CandidatePath> feasible = engine.findFeasiblePaths(stops, matrix, dep, true);
        assertFalse(feasible.isEmpty());

        List<Integer> best = engine.findBestPermutationForProfile(feasible, "fast");
        assertEquals(List.of(1, 2, 3, 4, 5, 6, 7, 8), best);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. NN+2-opt heuristic correctness (9+ stops)
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("9 stops, linear matrix → heuristic finds sequential order (optimal for linear)")
    void nineStops_heuristicRange_linearMatrix() {
        List<JourneyStop> stops = new ArrayList<>();
        for (int i = 1; i <= 9; i++) {
            stops.add(stop("Stop" + i, 0, "normal"));
        }
        DistanceMatrixResult matrix = linearMatrix(9, 100);
        LocalDateTime dep = LocalDateTime.of(2026, 8, 9, 10, 0);

        List<OptimizationEngine.CandidatePath> feasible = engine.findFeasiblePaths(stops, matrix, dep, false);
        assertFalse(feasible.isEmpty(), "Heuristic must produce at least one candidate path for 9 stops");

        // For a linear matrix the best path is sequential
        List<Integer> best = engine.findBestPermutationForProfile(feasible, "fast");
        assertEquals(List.of(1, 2, 3, 4, 5, 6, 7, 8, 9), best,
                "NN+2-opt should find the optimal sequential order for a linear matrix");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. Performance test — SLA: 9-20 stops < 3 seconds (Section 11.6 / 26.5)
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Performance: 20 stops with heuristic finishes in < 3 seconds (SLA check)")
    void twentyStops_performance_under3Seconds() {
        int n = 20;
        List<JourneyStop> stops = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            stops.add(stop("Stop" + i, 5, "normal"));
        }
        DistanceMatrixResult matrix = linearMatrix(n, 100);
        LocalDateTime dep = LocalDateTime.of(2026, 8, 9, 10, 0);

        long start = System.currentTimeMillis();
        List<OptimizationEngine.CandidatePath> result = engine.findFeasiblePaths(stops, matrix, dep, false);
        long elapsed = System.currentTimeMillis() - start;

        assertFalse(result.isEmpty(), "Must produce at least one path for 20 stops");
        assertTrue(elapsed < 3000,
                "Heuristic must finish within 3 seconds for 20 stops (SLA). Took: " + elapsed + "ms");
    }

    @Test
    @DisplayName("Performance: 15 stops with heuristic finishes in < 3 seconds (SLA check)")
    void fifteenStops_performance_under3Seconds() {
        int n = 15;
        List<JourneyStop> stops = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            stops.add(stop("Stop" + i, 10, "normal"));
        }
        DistanceMatrixResult matrix = linearMatrix(n, 200);
        LocalDateTime dep = LocalDateTime.of(2026, 8, 9, 10, 0);

        long start = System.currentTimeMillis();
        engine.findFeasiblePaths(stops, matrix, dep, true);
        long elapsed = System.currentTimeMillis() - start;

        assertTrue(elapsed < 3000,
                "Heuristic must finish within 3 seconds for 15 stops. Took: " + elapsed + "ms");
    }
}
