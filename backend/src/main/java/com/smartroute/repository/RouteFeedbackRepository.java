package com.smartroute.repository;

import com.smartroute.domain.Journey;
import com.smartroute.domain.RouteFeedback;
import com.smartroute.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RouteFeedbackRepository extends JpaRepository<RouteFeedback, UUID> {
    List<RouteFeedback> findAllByUser(User user);
    List<RouteFeedback> findAllByUserOrderByCreatedAtDesc(User user);
    void deleteByJourney(Journey journey);
}
