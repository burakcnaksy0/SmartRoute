package com.smartroute.repository;

import com.smartroute.domain.ChargingStop;
import com.smartroute.domain.JourneyPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChargingStopRepository extends JpaRepository<ChargingStop, UUID> {
    List<ChargingStop> findAllByPlan(JourneyPlan plan);
}
