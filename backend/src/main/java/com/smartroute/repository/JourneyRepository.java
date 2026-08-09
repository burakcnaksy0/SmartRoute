package com.smartroute.repository;

import com.smartroute.domain.Journey;
import com.smartroute.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JourneyRepository extends JpaRepository<Journey, UUID> {
    List<Journey> findByUserOrderByCreatedAtDesc(User user);
}
