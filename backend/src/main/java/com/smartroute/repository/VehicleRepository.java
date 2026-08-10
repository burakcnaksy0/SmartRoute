package com.smartroute.repository;

import com.smartroute.domain.User;
import com.smartroute.domain.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {
    List<Vehicle> findAllByUser(User user);
    Optional<Vehicle> findByUserAndIsDefaultTrue(User user);
}
