package com.smartroute.routeplanning.domain.port.out;

import com.smartroute.routeplanning.domain.model.RoutePlan;
import java.util.Optional;
import java.util.UUID;

/**
 * Outbound port for persisting and retrieving RoutePlan aggregates.
 * Implemented by the infrastructure layer (e.g., JPA adapter).
 */
public interface RoutePlanRepository {
    
    Optional<RoutePlan> findById(UUID id);
    
    RoutePlan save(RoutePlan routePlan);
    
    void deleteById(UUID id);
}
