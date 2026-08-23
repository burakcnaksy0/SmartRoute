package com.smartroute.routeplanning.application.port.in;

import java.util.UUID;

/**
 * Inbound port (Use Case) for optimizing a Route Plan.
 * Application services implement this interface.
 */
public interface OptimizeRoutePlanUseCase {

    /**
     * Optimizes the specified route plan.
     * @param routePlanId The ID of the route plan to optimize.
     */
    void optimizeRoutePlan(UUID routePlanId);
}
