package com.smartroute.service.journey;

import com.smartroute.domain.RouteFeedback;
import com.smartroute.domain.User;
import com.smartroute.repository.RouteFeedbackRepository;
import com.smartroute.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PreferenceLearningServiceTest {

    private RouteFeedbackRepository routeFeedbackRepository;
    private UserRepository userRepository;
    private PreferenceLearningService preferenceLearningService;

    @BeforeEach
    void setUp() {
        routeFeedbackRepository = mock(RouteFeedbackRepository.class);
        userRepository = mock(UserRepository.class);
        preferenceLearningService = new PreferenceLearningService(routeFeedbackRepository, userRepository);
    }

    @Test
    void learnPreferences_insufficientData_doesNotChangeWeights() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setWeightTime(BigDecimal.valueOf(0.50));
        user.setWeightCost(BigDecimal.valueOf(0.50));

        List<RouteFeedback> feedbacks = new ArrayList<>();
        // Only 3 feedbacks (less than 5)
        for (int i = 0; i < 3; i++) {
            RouteFeedback fb = new RouteFeedback();
            fb.setSelectedPlanLabel("cheapest");
            feedbacks.add(fb);
        }

        when(routeFeedbackRepository.findAllByUserOrderByCreatedAtDesc(user)).thenReturn(feedbacks);

        preferenceLearningService.learnPreferences(user);

        assertEquals(0.50, user.getWeightTime().doubleValue());
        assertEquals(0.50, user.getWeightCost().doubleValue());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void learnPreferences_prefersCheapest_increasesCostWeight() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setWeightTime(BigDecimal.valueOf(0.50));
        user.setWeightCost(BigDecimal.valueOf(0.50));

        List<RouteFeedback> feedbacks = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            RouteFeedback fb = new RouteFeedback();
            fb.setSelectedPlanLabel("cheapest");
            feedbacks.add(fb);
        }

        when(routeFeedbackRepository.findAllByUserOrderByCreatedAtDesc(user)).thenReturn(feedbacks);

        preferenceLearningService.learnPreferences(user);

        // Under cheapest preference, weightCost should increase and weightTime should decrease
        assertTrue(user.getWeightCost().doubleValue() > 0.50, "Weight cost should increase: " + user.getWeightCost());
        assertTrue(user.getWeightTime().doubleValue() < 0.50, "Weight time should decrease: " + user.getWeightTime());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void learnPreferences_prefersFastest_increasesTimeWeight() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setWeightTime(BigDecimal.valueOf(0.50));
        user.setWeightCost(BigDecimal.valueOf(0.50));

        List<RouteFeedback> feedbacks = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            RouteFeedback fb = new RouteFeedback();
            fb.setSelectedPlanLabel("fastest");
            feedbacks.add(fb);
        }

        when(routeFeedbackRepository.findAllByUserOrderByCreatedAtDesc(user)).thenReturn(feedbacks);

        preferenceLearningService.learnPreferences(user);

        // Under fastest preference, weightTime should increase and weightCost should decrease
        assertTrue(user.getWeightTime().doubleValue() > 0.50, "Weight time should increase: " + user.getWeightTime());
        assertTrue(user.getWeightCost().doubleValue() < 0.50, "Weight cost should decrease: " + user.getWeightCost());
        verify(userRepository, times(1)).save(user);
    }
}
