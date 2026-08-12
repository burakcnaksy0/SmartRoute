package com.smartroute.repository;

import com.smartroute.domain.SavedLocation;
import com.smartroute.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SavedLocationRepository extends JpaRepository<SavedLocation, UUID> {
    List<SavedLocation> findByUserOrderByCreatedAtDesc(User user);
}
