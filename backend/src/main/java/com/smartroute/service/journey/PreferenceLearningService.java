package com.smartroute.service.journey;

import com.smartroute.domain.RouteFeedback;
import com.smartroute.domain.User;
import com.smartroute.repository.RouteFeedbackRepository;
import com.smartroute.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class PreferenceLearningService {

    private final RouteFeedbackRepository routeFeedbackRepository;
    private final UserRepository userRepository;

    public PreferenceLearningService(
            RouteFeedbackRepository routeFeedbackRepository,
            UserRepository userRepository) {
        this.routeFeedbackRepository = routeFeedbackRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void learnPreferences(User user) {
        List<RouteFeedback> feedbacks = routeFeedbackRepository.findAllByUserOrderByCreatedAtDesc(user);
        
        // Section 17.2: If insufficient data (< 5 journeys), keep default balanced profile (learning is disabled)
        if (feedbacks.size() < 5) {
            return;
        }

        // Apply Exponential Moving Average (EMA) on the feedback list (newest first)
        double alpha = 0.20; // smoothing factor
        double currentWeightTime = user.getWeightTime() != null ? user.getWeightTime().doubleValue() : 0.50;
        double currentWeightCost = user.getWeightCost() != null ? user.getWeightCost().doubleValue() : 0.50;

        // Process from oldest to newest to follow temporal order of selections
        for (int i = feedbacks.size() - 1; i >= 0; i--) {
            RouteFeedback fb = feedbacks.get(i);
            double sampleTime = 0.50;
            double sampleCost = 0.50;

            if ("fastest".equalsIgnoreCase(fb.getSelectedPlanLabel())) {
                sampleTime = 0.80;
                sampleCost = 0.20;
            } else if ("cheapest".equalsIgnoreCase(fb.getSelectedPlanLabel())) {
                sampleTime = 0.20;
                sampleCost = 0.80;
            }

            currentWeightTime = (1 - alpha) * currentWeightTime + alpha * sampleTime;
            currentWeightCost = (1 - alpha) * currentWeightCost + alpha * sampleCost;
        }

        // Keep values bounded between 0.10 and 0.90 for stability
        currentWeightTime = Math.max(0.10, Math.min(0.90, currentWeightTime));
        currentWeightCost = Math.max(0.10, Math.min(0.90, currentWeightCost));

        user.setWeightTime(BigDecimal.valueOf(currentWeightTime).setScale(2, RoundingMode.HALF_UP));
        user.setWeightCost(BigDecimal.valueOf(currentWeightCost).setScale(2, RoundingMode.HALF_UP));

        userRepository.save(user);
    }

    /**
     * Periodic weekly batch job (runs every Sunday at midnight)
     * Calibrates weights for all users based on their selections
     */
    @Scheduled(cron = "0 0 0 * * SUN")
    @Transactional
    public void runWeeklyBatchJob() {
        List<User> allUsers = userRepository.findAll();
        for (User user : allUsers) {
            try {
                learnPreferences(user);
            } catch (Exception e) {
                // Log and continue to prevent failures on single user from stopping the entire batch
                System.err.println("Failed to calibrate preferences for user: " + user.getId() + " - " + e.getMessage());
            }
        }
    }
}
