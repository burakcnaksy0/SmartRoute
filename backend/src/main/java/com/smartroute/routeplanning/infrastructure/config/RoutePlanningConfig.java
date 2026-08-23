package com.smartroute.routeplanning.infrastructure.config;

import com.smartroute.routeplanning.application.port.in.OptimizeRoutePlanUseCase;
import com.smartroute.routeplanning.application.service.RoutePlanOptimizerService;
import com.smartroute.routeplanning.domain.port.out.RoutePlanRepository;
import com.smartroute.routeplanning.domain.port.out.RoutingProvider;
import com.smartroute.routeplanning.domain.service.OptimizationEngine;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Configuration to wire the Domain and Application services.
 * This keeps the Domain Layer entirely free from Spring @Service annotations.
 */
@Configuration
public class RoutePlanningConfig {

    @Bean
    public OptimizationEngine optimizationEngine() {
        // OptimizationEngine has no dependencies, it's pure logic
        return new OptimizationEngine();
    }

    @Bean
    public OptimizeRoutePlanUseCase optimizeRoutePlanUseCase(
            RoutePlanRepository routePlanRepository,
            RoutingProvider routingProvider,
            OptimizationEngine optimizationEngine) {
        
        // Wire the Application Service with its Ports and Domain Services
        return new RoutePlanOptimizerService(
                routePlanRepository,
                routingProvider,
                optimizationEngine
        );
    }
}
