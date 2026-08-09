package com.smartroute.repository;

import com.smartroute.domain.User;
import com.smartroute.domain.UserNlpUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserNlpUsageRepository extends JpaRepository<UserNlpUsage, UUID> {
    Optional<UserNlpUsage> findByUserAndUsageDate(User user, LocalDate usageDate);
}
