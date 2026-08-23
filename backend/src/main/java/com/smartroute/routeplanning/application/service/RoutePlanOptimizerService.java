package com.smartroute.routeplanning.application.service;

import com.smartroute.routeplanning.application.port.in.OptimizeRoutePlanUseCase;
import com.smartroute.routeplanning.domain.model.Location;
import com.smartroute.routeplanning.domain.model.OptimizationResult;
import com.smartroute.routeplanning.domain.model.RoutePlan;
import com.smartroute.routeplanning.domain.port.out.RoutePlanRepository;
import com.smartroute.routeplanning.domain.port.out.RoutingProvider;
import com.smartroute.routeplanning.domain.port.out.RoutingProvider.DistanceMatrix;
import com.smartroute.routeplanning.domain.service.OptimizationEngine;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Application Service implementing the OptimizeRoutePlan Use Case.
 * Coordinates between Domain objects and Infrastructure ports.
 */
public class RoutePlanOptimizerService implements OptimizeRoutePlanUseCase {

    private final RoutePlanRepository routePlanRepository;
    private final RoutingProvider routingProvider;
    private final OptimizationEngine optimizationEngine;

    public RoutePlanOptimizerService(
            RoutePlanRepository routePlanRepository,
            RoutingProvider routingProvider,
            OptimizationEngine optimizationEngine) {
        this.routePlanRepository = routePlanRepository;
        this.routingProvider = routingProvider;
        this.optimizationEngine = optimizationEngine;
    }

    @Override
    public void optimizeRoutePlan(UUID routePlanId) {
        // 1. Fetch Aggregate Root
        RoutePlan routePlan = routePlanRepository.findById(routePlanId)
                .orElseThrow(() -> new IllegalArgumentException("RoutePlan not found with ID: " + routePlanId));

        // 2. Change state (Domain Rule)
        routePlan.markAsOptimizing();
        routePlanRepository.save(routePlan);

        try {
            // 3. Gather Locations for Matrix
            List<Location> locations = new ArrayList<>();
            locations.add(routePlan.getOrigin());
            routePlan.getDestinations().forEach(d -> locations.add(d.getLocation()));
            if (routePlan.getFinalDestination() != null) {
                locations.add(routePlan.getFinalDestination());
            }

            // 4. Fetch Matrix via Outbound Port
            DistanceMatrix matrix = routingProvider.getDistanceMatrix(locations);

            // 5. Run Domain Business Logic (VRPTW Algorithm)
            OptimizationResult result = optimizationEngine.optimize(routePlan, matrix);

            // 6. Update Aggregate and save
            routePlan.markAsOptimized();
            
            // In a full implementation, you would attach the OptimizationResult to the RoutePlan
            // e.g. routePlan.addOptimizationResult(result);
            
            routePlanRepository.save(routePlan);

        } catch (Exception e) {
            // Rollback state if external service fails or algorithm throws InfeasiblePlanException
            // e.g., routePlan.markAsFailed(e.getMessage());
            // routePlanRepository.save(routePlan);
            throw new RuntimeException("Optimization failed", e);
        }
    }
}
