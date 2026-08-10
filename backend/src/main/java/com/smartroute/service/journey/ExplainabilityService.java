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
        double currentCost = current.getTotalFuelCostEstimate().doubleValue() + current.getTotalTollCost().doubleValue();
        double otherCost = other.getTotalFuelCostEstimate().doubleValue() + other.getTotalTollCost().doubleValue();
        double costDiff = currentCost - otherCost;
        double trafficDiff = current.getTrafficRiskScore() - other.getTrafficRiskScore();

        // Check if differences are below threshold (e.g. less than 1 minute, less than 1 TL, less than 0.05 traffic risk)
        if (Math.abs(durationDiff) < 60 && Math.abs(costDiff) < 1.0 && Math.abs(trafficDiff) < 0.05) {
            return "Rotalar oldukça benzer, herhangi birini seçebilirsiniz.";
        }

        long minutesDiff = Math.abs(durationDiff) / 60;
        double costDiffAbs = Math.abs(costDiff);

        StringBuilder sb = new StringBuilder();
        if (durationDiff > 0) {
            sb.append(minutesDiff).append(" dakika daha yavaş");
        } else if (durationDiff < 0) {
            sb.append(minutesDiff).append(" dakika daha hızlı");
        } else {
            sb.append("aynı sürede");
        }

        if (costDiff < 0) {
            sb.append(" ama ₺").append(String.format("%.0f", costDiffAbs)).append(" daha ucuz");
        } else if (costDiff > 0) {
            sb.append(" ama ₺").append(String.format("%.0f", costDiffAbs)).append(" daha pahalı");
        } else {
            sb.append(" ve aynı maliyette");
        }

        // Identify most significant advantage component
        String advantageComponent = "genel dengeli yapı";
        if (durationDiff < 0 && costDiff <= 0) {
            advantageComponent = "süre";
        } else if (costDiff < 0 && durationDiff >= 0) {
            advantageComponent = "maliyet";
        } else if (trafficDiff < -0.05) {
            advantageComponent = "trafik yoğunluğu";
        } else if (durationDiff < 0) {
            advantageComponent = "süre";
        } else if (costDiff < 0) {
            advantageComponent = "maliyet";
        }

        sb.append(", ").append(advantageComponent).append(" bakımından daha avantajlı.");

        return sb.toString();
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

        // Check if all plans are very similar
        boolean allSimilar = true;
        for (JourneyPlan plan : plans) {
            if (plan != recommended) {
                long durationDiff = (long) recommended.getTotalDurationSeconds() - plan.getTotalDurationSeconds();
                double recCost = recommended.getTotalFuelCostEstimate().doubleValue() + recommended.getTotalTollCost().doubleValue();
                double planCost = plan.getTotalFuelCostEstimate().doubleValue() + plan.getTotalTollCost().doubleValue();
                double costDiff = recCost - planCost;
                double trafficDiff = recommended.getTrafficRiskScore() - plan.getTrafficRiskScore();
                if (Math.abs(durationDiff) >= 60 || Math.abs(costDiff) >= 1.0 || Math.abs(trafficDiff) >= 0.05) {
                    allSimilar = false;
                    break;
                }
            }
        }

        if (allSimilar) {
            for (JourneyPlan plan : plans) {
                plan.setExplanationText("Rotalar oldukça benzer, herhangi birini seçebilirsiniz.");
            }
            return;
        }

        for (JourneyPlan plan : plans) {
            if (plan == recommended) {
                // Compare recommended against the fastest or cheapest alternative
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
