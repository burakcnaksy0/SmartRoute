package com.smartroute.routeplanning.infrastructure.adapter.in.web;

import com.smartroute.routeplanning.application.port.in.OptimizeRoutePlanUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Inbound Web Adapter (REST Controller).
 * Translates HTTP requests into calls to the Application Use Case.
 */
@RestController
@RequestMapping("/api/v2/route-plans")
public class RoutePlanController {

    private final OptimizeRoutePlanUseCase optimizeRoutePlanUseCase;

    public RoutePlanController(OptimizeRoutePlanUseCase optimizeRoutePlanUseCase) {
        this.optimizeRoutePlanUseCase = optimizeRoutePlanUseCase;
    }

    /**
     * Endpoint to trigger the optimization of a specific Route Plan.
     * 
     * @param id The UUID of the route plan to optimize.
     * @return 202 Accepted if the process starts successfully.
     */
    @PostMapping("/{id}/optimize")
    public ResponseEntity<Void> optimizeRoute(@PathVariable UUID id) {
        try {
            optimizeRoutePlanUseCase.optimizeRoutePlan(id);
            // HTTP 202 Accepted is suitable for operations that might take time.
            // Alternatively, 200 OK could return the optimization result immediately.
            return ResponseEntity.accepted().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
