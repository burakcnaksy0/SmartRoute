package com.smartroute.repository;

import com.smartroute.domain.Journey;
import com.smartroute.domain.TripExpense;
import com.smartroute.domain.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TripExpenseRepository extends JpaRepository<TripExpense, UUID> {
    Optional<TripExpense> findByJourney(Journey journey);
    List<TripExpense> findAllByVehicle(Vehicle vehicle);
    void deleteByJourney(Journey journey);
}
