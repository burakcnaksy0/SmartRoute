package com.smartroute.routeplanning.infrastructure.adapter.out.persistence;

import com.smartroute.domain.Journey;
import com.smartroute.domain.JourneyStop;
import com.smartroute.routeplanning.domain.model.Coordinates;
import com.smartroute.routeplanning.domain.model.Destination;
import com.smartroute.routeplanning.domain.model.Location;
import com.smartroute.routeplanning.domain.model.RoutePlan;
import com.smartroute.routeplanning.domain.model.TimeWindow;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Maps between the core domain Aggregate (RoutePlan) and the JPA Entity (Journey).
 */
public class RoutePlanMapper {

    public RoutePlan toDomain(Journey journey) {
        if (journey == null) {
            return null;
        }

        Location origin = new Location(
                new Coordinates(journey.getStartLat(), journey.getStartLng()),
                journey.getStartAddressText()
        );

        RoutePlan routePlan = new RoutePlan(journey.getId(), journey.getUser().getId(), origin);

        if (journey.getDestinationLat() != null && journey.getDestinationLng() != null) {
            Location finalDest = new Location(
                    new Coordinates(journey.getDestinationLat(), journey.getDestinationLng()),
                    journey.getDestinationAddressText()
            );
            routePlan.setFinalDestination(finalDest);
        }

        // Map RoutePlanStatus based on Journey status
        if ("optimizing".equalsIgnoreCase(journey.getStatus())) {
            routePlan.markAsOptimizing();
        } else if ("planned".equalsIgnoreCase(journey.getStatus())) {
            routePlan.markAsOptimized();
        }

        for (JourneyStop stopEntity : journey.getStops()) {
            Location loc = new Location(
                    new Coordinates(stopEntity.getLatitude(), stopEntity.getLongitude()),
                    stopEntity.getAddressText()
            );
            TimeWindow tw = new TimeWindow(stopEntity.getTimeWindowStart(), stopEntity.getTimeWindowEnd());
            
            Destination dest = new Destination(
                    stopEntity.getId(),
                    loc,
                    tw,
                    stopEntity.getDurationMinutes() != null ? stopEntity.getDurationMinutes() : 0,
                    true
            );
            routePlan.addDestination(dest);
        }

        return routePlan;
    }

    public Journey toEntity(RoutePlan routePlan, Journey existingJourney) {
        // In a real application, you'd map fields back to the existing Journey entity.
        // We update status based on domain state.
        
        switch (routePlan.getStatus()) {
            case OPTIMIZING -> existingJourney.setStatus("optimizing");
            case OPTIMIZED -> existingJourney.setStatus("planned");
            case DRAFT -> existingJourney.setStatus("draft");
            case CANCELLED -> existingJourney.setStatus("cancelled");
        }

        // You would also map destinations back to stops, handling additions/removals
        // For brevity in this DDD demonstration, we focus on status and core mapping concept.
        
        return existingJourney;
    }
}
