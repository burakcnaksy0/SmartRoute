package com.smartroute.routeplanning.infrastructure.adapter.out.routing;

import com.smartroute.routeplanning.domain.model.Location;
import com.smartroute.routeplanning.domain.port.out.RoutingProvider;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Infrastructure Adapter that implements the Outbound Port for Routing.
 * Connects to an external service (e.g., OpenRouteService) via HTTP.
 */
@Service
public class OrsRoutingAdapter implements RoutingProvider {

    // Normally you would inject a RestTemplate, WebClient, or FeignClient here.
    // private final RestTemplate restTemplate;
    //
    // public OrsRoutingAdapter(RestTemplate restTemplate) {
    //     this.restTemplate = restTemplate;
    // }

    @Override
    public DistanceMatrix getDistanceMatrix(List<Location> locations) {
        // Construct external API request payload from locations
        // e.g. OpenRouteService Matrix API
        
        int size = locations.size();
        
        // Dummy data for demonstration of the Architecture pattern
        int[][] durations = new int[size][size];
        int[][] distances = new int[size][size];
        
        // Populate dummy matrix (in a real scenario, this is the JSON response from ORS)
        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                if (i != j) {
                    durations[i][j] = 600; // 10 mins
                    distances[i][j] = 5000; // 5 km
                } else {
                    durations[i][j] = 0;
                    distances[i][j] = 0;
                }
            }
        }
        
        return new DistanceMatrix(durations, distances);
    }
}
