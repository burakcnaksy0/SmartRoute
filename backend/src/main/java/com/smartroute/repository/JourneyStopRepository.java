package com.smartroute.repository;

import com.smartroute.domain.JourneyStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface JourneyStopRepository extends JpaRepository<JourneyStop, UUID> {
}
