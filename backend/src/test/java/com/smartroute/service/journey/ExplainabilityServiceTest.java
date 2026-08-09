package com.smartroute.service.journey;

import com.smartroute.domain.JourneyPlan;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExplainabilityServiceTest {

    private ExplainabilityService explainabilityService;

    @BeforeEach
    void setUp() {
        explainabilityService = new ExplainabilityService();
    }

    @Test
    void generateExplanation_onlyDurationDifference() {
        JourneyPlan planA = new JourneyPlan();
        planA.setTotalDurationSeconds(3600); // 60 minutes
        planA.setTotalFuelCostEstimate(BigDecimal.valueOf(100.0));

        JourneyPlan planB = new JourneyPlan();
        planB.setTotalDurationSeconds(4800); // 80 minutes
        planB.setTotalFuelCostEstimate(BigDecimal.valueOf(100.0));

        String explanation = explainabilityService.generateExplanation(planA, planB);
        assertTrue(explanation.contains("20 dakika daha hızlı"), "Should highlight duration difference: " + explanation);
    }

    @Test
    void generateExplanation_verySimilarPlans_returnsNeutralMessage() {
        JourneyPlan planA = new JourneyPlan();
        planA.setTotalDurationSeconds(3600);
        planA.setTotalFuelCostEstimate(BigDecimal.valueOf(100.0));

        JourneyPlan planB = new JourneyPlan();
        planB.setTotalDurationSeconds(3630); // 30 seconds slower
        planB.setTotalFuelCostEstimate(BigDecimal.valueOf(100.5)); // 0.5 TL difference

        String explanation = explainabilityService.generateExplanation(planA, planB);
        assertEquals("Rotalar oldukça benzer, herhangi birini seçebilirsiniz.", explanation);
    }
}
