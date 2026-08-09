package com.smartroute.service.journey;

import com.smartroute.domain.JourneyPlan;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ExplainabilityService {

    public String generateExplanation(JourneyPlan current, JourneyPlan other) {
        if (current == null || other == null) {
            return "Tercihlerinize en uygun rota.";
        }

        long durationDiff = (long) current.getTotalDurationSeconds() - other.getTotalDurationSeconds();
        double costDiff = current.getTotalFuelCostEstimate().doubleValue() - other.getTotalFuelCostEstimate().doubleValue();

        // Check if differences are below threshold (e.g. less than 1 minute and less than 1 TL)
        if (Math.abs(durationDiff) < 60 && Math.abs(costDiff) < 1.0) {
            return "Rotalar oldukça benzer, herhangi birini seçebilirsiniz.";
        }

        if (Math.abs(costDiff) < 1.0) {
            // Only duration difference is significant
            long minutes = Math.abs(durationDiff) / 60;
            if (durationDiff < 0) {
                return "Diğer alternatife göre " + minutes + " dakika daha hızlı.";
            } else {
                return "Diğer alternatife göre " + minutes + " dakika daha yavaş.";
            }
        }

        if (Math.abs(durationDiff) < 60) {
            // Only cost difference is significant
            double diffVal = Math.abs(costDiff);
            if (costDiff < 0) {
                return "Diğer alternatife göre ₺" + String.format("%.0f", diffVal) + " daha ucuz.";
            } else {
                return "Diğer alternatife göre ₺" + String.format("%.0f", diffVal) + " daha pahalı.";
            }
        }

        // Both duration and cost differences are significant
        if (durationDiff > 0 && costDiff < 0) {
            long minutes = durationDiff / 60;
            double diffVal = Math.abs(costDiff);
            return minutes + " dakika daha yavaş ama ₺" + String.format("%.0f", diffVal) + " daha ucuz.";
        } else if (durationDiff < 0 && costDiff > 0) {
            long minutes = Math.abs(durationDiff) / 60;
            double diffVal = costDiff;
            return minutes + " dakika daha hızlı ama ₺" + String.format("%.0f", diffVal) + " daha pahalı.";
        }

        return "Tercihlerinize göre optimize edilmiş dengeli rota.";
    }

    public void populateExplanations(List<JourneyPlan> plans) {
        if (plans == null || plans.isEmpty()) {
            return;
        }

        if (plans.size() == 1) {
            plans.get(0).setExplanationText("Tercihlerinize en uygun rota.");
            return;
        }

        // Find reference plan (normally 'recommended' or 'balanced' or just the first plan)
        JourneyPlan recommended = plans.stream()
                .filter(p -> "recommended".equalsIgnoreCase(p.getPlanLabel()))
                .findFirst()
                .orElse(plans.get(0));

        for (JourneyPlan plan : plans) {
            if (plan == recommended) {
                // Compare recommended against the fastest or cheapest
                JourneyPlan alternative = plans.stream()
                        .filter(p -> p != recommended)
                        .findFirst()
                        .orElse(null);
                plan.setExplanationText(generateExplanation(plan, alternative));
            } else {
                // Compare alternative plan against recommended
                plan.setExplanationText(generateExplanation(plan, recommended));
            }
        }
    }
}
