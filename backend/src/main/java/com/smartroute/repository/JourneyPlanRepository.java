package com.smartroute.repository;

import com.smartroute.domain.JourneyPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JourneyPlanRepository extends JpaRepository<JourneyPlan, UUID> {
    List<JourneyPlan> findByJourneyId(UUID journeyId);
}
