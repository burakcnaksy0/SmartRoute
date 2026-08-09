package com.smartroute.service.journey;

import com.smartroute.domain.JourneyStop;
import com.smartroute.exception.InfeasiblePlanException;
import com.smartroute.service.routing.DistanceMatrixResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OptimizationEngineTest {

    private OptimizationEngine optimizationEngine;

    @BeforeEach
    void setUp() {
        optimizationEngine = new OptimizationEngine();
    }

    @Test
    void findBestPermutation_8StopsOptimality() {
        // Construct 8 stops
        List<JourneyStop> stops = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            JourneyStop stop = new JourneyStop();
            stop.setPlaceName("Stop " + i);
            stop.setVisitDurationMinutes(0); // Zero visit duration to simplify calculations
            stops.add(stop);
        }

        // Initialize a 9x9 matrix (0 is start, 1..8 are stops)
        // Set distances/durations such that visiting stops in order (1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8) is the shortest
        long[][] durations = new long[9][9];
        long[][] distances = new long[9][9];
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) {
                long diff = Math.abs(i - j);
                durations[i][j] = diff * 100;
                distances[i][j] = diff * 100;
            }
        }

        DistanceMatrixResult matrix = new DistanceMatrixResult(durations, distances);
        LocalDateTime departureTime = LocalDateTime.now();

        List<OptimizationEngine.CandidatePath> feasible = optimizationEngine.findFeasiblePaths(stops, matrix, departureTime, true);
        assertFalse(feasible.isEmpty());

        List<Integer> bestPerm = optimizationEngine.findBestPermutationForProfile(feasible, "fast");
        List<Integer> expectedPerm = List.of(1, 2, 3, 4, 5, 6, 7, 8);

        assertEquals(expectedPerm, bestPerm, "Should find the linear sequence as the optimal order");
    }

    @Test
    void findBestPermutation_impossibleTimeWindows_throwsInfeasiblePlanException() {
        List<JourneyStop> stops = new ArrayList<>();

        LocalDateTime now = LocalDateTime.of(2026, 8, 9, 10, 0);

        JourneyStop stop1 = new JourneyStop();
        stop1.setPlaceName("Stop 1");
        stop1.setVisitDurationMinutes(10);
        stop1.setTimeWindowStart(now.plusMinutes(5));
        stop1.setTimeWindowEnd(now.plusMinutes(30));
        stop1.setPriority("critical");
        stops.add(stop1);

        JourneyStop stop2 = new JourneyStop();
        stop2.setPlaceName("Stop 2");
        stop2.setVisitDurationMinutes(10);
        // time window requires reaching it before now + 30 mins
        stop2.setTimeWindowStart(now.plusMinutes(5));
        stop2.setTimeWindowEnd(now.plusMinutes(30));
        stop2.setPriority("critical");
        stops.add(stop2);

        // Distance between stop 1 and stop 2 is 2 hours (7200 seconds), making it impossible to visit both in 30 minutes
        long[][] durations = new long[3][3];
        long[][] distances = new long[3][3];

        // start to stop1/2 is fast, but stop1 to stop2 is 7200s
        durations[0][1] = 100;
        durations[0][2] = 100;
        durations[1][0] = 100;
        durations[2][0] = 100;
        durations[1][2] = 7200; // impossible!
        durations[2][1] = 7200; // impossible!

        DistanceMatrixResult matrix = new DistanceMatrixResult(durations, distances);

        assertThrows(InfeasiblePlanException.class, () ->
                optimizationEngine.findFeasiblePaths(stops, matrix, now, true)
        );
    }
}
