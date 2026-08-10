package com.smartroute.service.journey;

import com.smartroute.domain.Journey;
import com.smartroute.domain.JourneyPlan;
import com.smartroute.domain.TripExpense;
import com.smartroute.domain.User;
import com.smartroute.dto.TripExpenseRequest;
import com.smartroute.dto.TripExpenseResponse;
import com.smartroute.repository.JourneyRepository;
import com.smartroute.repository.TripExpenseRepository;
import com.smartroute.repository.VehicleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
public class TripExpenseService {

    private final TripExpenseRepository tripExpenseRepository;
    private final JourneyRepository journeyRepository;
    private final VehicleRepository vehicleRepository;

    public TripExpenseService(
            TripExpenseRepository tripExpenseRepository,
            JourneyRepository journeyRepository,
            VehicleRepository vehicleRepository) {
        this.tripExpenseRepository = tripExpenseRepository;
        this.journeyRepository = journeyRepository;
        this.vehicleRepository = vehicleRepository;
    }

    @Transactional(readOnly = true)
    public TripExpenseResponse getExpenseForJourney(UUID journeyId, User user) {
        Journey journey = findAndValidateJourney(journeyId, user);
        TripExpense expense = tripExpenseRepository.findByJourney(journey)
                .orElseThrow(() -> new IllegalArgumentException("Bu yolculuk için gider kaydı bulunamadı."));
        return toResponse(expense);
    }

    @Transactional
    public TripExpenseResponse recordExpense(UUID journeyId, TripExpenseRequest request, User user) {
        Journey journey = findAndValidateJourney(journeyId, user);

        if (tripExpenseRepository.findByJourney(journey).isPresent()) {
            throw new IllegalArgumentException("Bu yolculuk için zaten bir gider kaydı mevcut. Güncelleme yapın.");
        }

        TripExpense expense = new TripExpense();
        expense.setJourney(journey);
        expense.setEntryMethod(request.getEntryMethod() != null ? request.getEntryMethod() : "manual_receipt");

        // Attach the default vehicle of user if journey doesn't have one
        if (journey.getVehicle() != null) {
            expense.setVehicle(journey.getVehicle());
        } else {
            vehicleRepository.findByUserAndIsDefaultTrue(user).ifPresent(expense::setVehicle);
        }

        expense.setOdometerStartKm(request.getOdometerStartKm());
        expense.setOdometerEndKm(request.getOdometerEndKm());
        expense.setActualFuelLiters(request.getActualFuelLiters());
        expense.setActualEnergyKwh(request.getActualEnergyKwh());
        expense.setActualFuelCost(request.getActualFuelCost() != null ? request.getActualFuelCost() : BigDecimal.ZERO);
        expense.setActualTollCost(request.getActualTollCost());
        expense.setReceiptPhotoUrl(request.getReceiptPhotoUrl());

        // Capture the estimated cost from the selected plan at time of recording
        BigDecimal estimatedCostAtPlanning = journey.getPlans().stream()
                .filter(JourneyPlan::getIsSelected)
                .map(JourneyPlan::getTotalFuelCostEstimate)
                .findFirst()
                .orElse(BigDecimal.ZERO);
        expense.setEstimatedFuelCostAtPlanning(estimatedCostAtPlanning);

        // Compute variance: ((actual - estimated) / estimated) * 100
        if (estimatedCostAtPlanning.compareTo(BigDecimal.ZERO) > 0 && expense.getActualFuelCost() != null) {
            BigDecimal actual = expense.getActualFuelCost();
            BigDecimal variance = actual.subtract(estimatedCostAtPlanning)
                    .divide(estimatedCostAtPlanning, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
            expense.setVariancePercent(variance);
        }

        return toResponse(tripExpenseRepository.save(expense));
    }

    @Transactional
    public TripExpenseResponse updateExpense(UUID journeyId, TripExpenseRequest request, User user) {
        Journey journey = findAndValidateJourney(journeyId, user);
        TripExpense expense = tripExpenseRepository.findByJourney(journey)
                .orElseThrow(() -> new IllegalArgumentException("Bu yolculuk için gider kaydı bulunamadı."));

        if (request.getEntryMethod() != null) expense.setEntryMethod(request.getEntryMethod());
        if (request.getOdometerStartKm() != null) expense.setOdometerStartKm(request.getOdometerStartKm());
        if (request.getOdometerEndKm() != null) expense.setOdometerEndKm(request.getOdometerEndKm());
        if (request.getActualFuelLiters() != null) expense.setActualFuelLiters(request.getActualFuelLiters());
        if (request.getActualEnergyKwh() != null) expense.setActualEnergyKwh(request.getActualEnergyKwh());
        if (request.getActualFuelCost() != null) expense.setActualFuelCost(request.getActualFuelCost());
        if (request.getActualTollCost() != null) expense.setActualTollCost(request.getActualTollCost());
        if (request.getReceiptPhotoUrl() != null) expense.setReceiptPhotoUrl(request.getReceiptPhotoUrl());

        // Recompute variance
        BigDecimal estimated = expense.getEstimatedFuelCostAtPlanning();
        if (estimated != null && estimated.compareTo(BigDecimal.ZERO) > 0 && expense.getActualFuelCost() != null) {
            BigDecimal variance = expense.getActualFuelCost().subtract(estimated)
                    .divide(estimated, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
            expense.setVariancePercent(variance);
        }

        return toResponse(tripExpenseRepository.save(expense));
    }

    private Journey findAndValidateJourney(UUID journeyId, User user) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new IllegalArgumentException("Yolculuk bulunamadı."));
        if (!journey.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bu yolculuğa erişim yetkiniz yok.");
        }
        return journey;
    }

    private TripExpenseResponse toResponse(TripExpense expense) {
        TripExpenseResponse r = new TripExpenseResponse();
        r.setId(expense.getId());
        r.setJourneyId(expense.getJourney().getId());
        r.setEntryMethod(expense.getEntryMethod());
        r.setOdometerStartKm(expense.getOdometerStartKm());
        r.setOdometerEndKm(expense.getOdometerEndKm());
        r.setActualFuelLiters(expense.getActualFuelLiters());
        r.setActualEnergyKwh(expense.getActualEnergyKwh());
        r.setActualFuelCost(expense.getActualFuelCost());
        r.setActualTollCost(expense.getActualTollCost());
        r.setEstimatedFuelCostAtPlanning(expense.getEstimatedFuelCostAtPlanning());
        r.setVariancePercent(expense.getVariancePercent());
        r.setReceiptPhotoUrl(expense.getReceiptPhotoUrl());
        r.setCreatedAt(expense.getCreatedAt());
        return r;
    }
}
