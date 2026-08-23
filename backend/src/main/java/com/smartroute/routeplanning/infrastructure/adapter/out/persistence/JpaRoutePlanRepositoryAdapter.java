package com.smartroute.routeplanning.infrastructure.adapter.out.persistence;

import com.smartroute.domain.Journey;
import com.smartroute.repository.JourneyRepository;
import com.smartroute.routeplanning.domain.model.RoutePlan;
import com.smartroute.routeplanning.domain.port.out.RoutePlanRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Infrastructure Adapter that implements the Outbound Port.
 * This class translates Domain calls into Spring Data JPA operations.
 */
@Repository
public class JpaRoutePlanRepositoryAdapter implements RoutePlanRepository {

    private final JourneyRepository journeyRepository;
    private final RoutePlanMapper mapper;

    public JpaRoutePlanRepositoryAdapter(JourneyRepository journeyRepository) {
        this.journeyRepository = journeyRepository;
        this.mapper = new RoutePlanMapper();
    }

    @Override
    public Optional<RoutePlan> findById(UUID id) {
        return journeyRepository.findById(id)
                .map(mapper::toDomain);
    }

    @Override
    public RoutePlan save(RoutePlan routePlan) {
        // Fetch existing entity to update it
        Journey journey = journeyRepository.findById(routePlan.getId())
                .orElseThrow(() -> new IllegalStateException("Cannot save non-existent RoutePlan without a User context"));
                
        Journey updatedEntity = mapper.toEntity(routePlan, journey);
        Journey savedEntity = journeyRepository.save(updatedEntity);
        
        return mapper.toDomain(savedEntity);
    }

    @Override
    public void deleteById(UUID id) {
        journeyRepository.deleteById(id);
    }
}
