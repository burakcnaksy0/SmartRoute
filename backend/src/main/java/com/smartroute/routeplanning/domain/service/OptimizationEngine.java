package com.smartroute.routeplanning.domain.service;

import com.smartroute.routeplanning.domain.model.Destination;
import com.smartroute.routeplanning.domain.model.OptimizationResult;
import com.smartroute.routeplanning.domain.model.RoutePlan;
import com.smartroute.routeplanning.domain.model.TimeWindow;
import com.smartroute.routeplanning.domain.port.out.RoutingProvider.DistanceMatrix;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Domain Service responsible for the core VRPTW algorithmic logic.
 * Solves the routing problem by considering Distance, Duration, and Time Windows.
 */
public class OptimizationEngine {

    /**
     * Calculates the best route permutation based on the provided distance matrix.
     * Uses a Brute-Force approach with Time Window pruning for accuracy.
     * 
     * @param routePlan The route plan containing origin and destinations.
     * @param matrix The pre-calculated distances and durations between all locations.
     * @return The optimized result containing ordered destinations and totals.
     */
    public OptimizationResult optimize(RoutePlan routePlan, DistanceMatrix matrix) {
        List<Destination> destinations = routePlan.getDestinations();
        if (destinations.isEmpty()) {
            return new OptimizationResult(new ArrayList<>(), 0, 0);
        }

        List<Integer> bestPermutation = new ArrayList<>();
        int[] minDuration = {Integer.MAX_VALUE};
        int[] minDistance = {Integer.MAX_VALUE};

        // We assume optimization starts 'now'. In a real app, this would be RoutePlan.plannedDepartureTime
        LocalDateTime departureTime = LocalDateTime.now(); 

        List<Integer> currentPermutation = new ArrayList<>();
        boolean[] visited = new boolean[destinations.size()];

        // Start recursive permutation generation
        generatePermutations(
                destinations, 
                visited, 
                currentPermutation, 
                bestPermutation, 
                minDuration, 
                minDistance, 
                0, // start at Origin (index 0)
                0, // current duration in seconds
                0, // current distance in meters
                departureTime,
                matrix,
                routePlan.getFinalDestination() != null
        );

        if (bestPermutation.isEmpty()) {
            throw new IllegalStateException("No feasible route found satisfying the time windows.");
        }

        // Map best indices back to Destination objects
        List<Destination> orderedDestinations = new ArrayList<>();
        for (Integer index : bestPermutation) {
            orderedDestinations.add(destinations.get(index - 1));
        }

        return new OptimizationResult(orderedDestinations, minDistance[0], minDuration[0]);
    }

    private void generatePermutations(
            List<Destination> destinations, 
            boolean[] visited, 
            List<Integer> currentPermutation,
            List<Integer> bestPermutation, 
            int[] minDuration, 
            int[] minDistance, 
            int currentIndex, 
            int currentDuration, 
            int currentDistance, 
            LocalDateTime currentTime,
            DistanceMatrix matrix,
            boolean hasFinalDestination) {

        // Base case: all destinations visited
        if (currentPermutation.size() == destinations.size()) {
            
            // Add journey to final destination if exists
            int finalTotalDuration = currentDuration;
            int finalTotalDistance = currentDistance;
            
            if (hasFinalDestination) {
                int finalDestIndex = destinations.size() + 1;
                finalTotalDuration += matrix.durationSeconds()[currentIndex][finalDestIndex];
                finalTotalDistance += matrix.distanceMeters()[currentIndex][finalDestIndex];
            }

            // Update best result if this permutation is faster
            if (finalTotalDuration < minDuration[0]) {
                minDuration[0] = finalTotalDuration;
                minDistance[0] = finalTotalDistance;
                bestPermutation.clear();
                bestPermutation.addAll(currentPermutation);
            }
            return;
        }

        // Try visiting each unvisited destination
        for (int i = 0; i < destinations.size(); i++) {
            if (!visited[i]) {
                int nextIndex = i + 1; // Origin is 0, dests are 1 to N
                
                int travelDuration = matrix.durationSeconds()[currentIndex][nextIndex];
                int travelDistance = matrix.distanceMeters()[currentIndex][nextIndex];
                
                LocalDateTime arrivalTime = currentTime.plusSeconds(travelDuration);
                Destination nextDest = destinations.get(i);
                TimeWindow timeWindow = nextDest.getTimeWindow();
                
                // 1. Time Window Check (Pruning)
                if (timeWindow != null) {
                    if (timeWindow.getLatestDeparture() != null && arrivalTime.isAfter(timeWindow.getLatestDeparture())) {
                        continue; // Prune this branch: we arrive too late
                    }
                    if (timeWindow.getEarliestArrival() != null && arrivalTime.isBefore(timeWindow.getEarliestArrival())) {
                        // We arrive too early, we must wait
                        arrivalTime = timeWindow.getEarliestArrival();
                    }
                }
                
                // Add Service Time (Duration spent at the location)
                LocalDateTime departureFromNext = arrivalTime.plusMinutes(nextDest.getEstimatedDurationInMinutes());
                
                // Calculate total accumulated duration (including wait times and service times)
                // Difference between original start time and new departure time
                int updatedDuration = currentDuration + travelDuration + (nextDest.getEstimatedDurationInMinutes() * 60);

                // Recurse
                visited[i] = true;
                currentPermutation.add(nextIndex);

                generatePermutations(
                        destinations, visited, currentPermutation, bestPermutation,
                        minDuration, minDistance,
                        nextIndex, updatedDuration, currentDistance + travelDistance,
                        departureFromNext, matrix, hasFinalDestination
                );

                // Backtrack
                visited[i] = false;
                currentPermutation.remove(currentPermutation.size() - 1);
            }
        }
    }
}
