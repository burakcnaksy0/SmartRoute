package com.smartroute.service.journey;

import com.smartroute.domain.User;
import com.smartroute.domain.Vehicle;
import com.smartroute.dto.VehicleRequest;
import com.smartroute.dto.VehicleResponse;
import com.smartroute.repository.VehicleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    public VehicleService(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> listVehicles(User user) {
        return vehicleRepository.findAllByUser(user)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public VehicleResponse createVehicle(VehicleRequest request, User user) {
        // If this is set as default, unset all other defaults first
        if (Boolean.TRUE.equals(request.getIsDefault())) {
            vehicleRepository.findByUserAndIsDefaultTrue(user)
                    .ifPresent(existing -> {
                        existing.setIsDefault(false);
                        vehicleRepository.save(existing);
                    });
        }

        Vehicle vehicle = new Vehicle();
        vehicle.setUser(user);
        mapRequestToVehicle(request, vehicle);
        return toResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleResponse updateVehicle(UUID vehicleId, VehicleRequest request, User user) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new IllegalArgumentException("Araç bulunamadı."));

        if (!vehicle.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bu araca erişim yetkiniz yok.");
        }

        // If this is being set as default, unset previous default
        if (Boolean.TRUE.equals(request.getIsDefault()) && !Boolean.TRUE.equals(vehicle.getIsDefault())) {
            vehicleRepository.findByUserAndIsDefaultTrue(user)
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(vehicleId)) {
                            existing.setIsDefault(false);
                            vehicleRepository.save(existing);
                        }
                    });
        }

        mapRequestToVehicle(request, vehicle);
        return toResponse(vehicleRepository.save(vehicle));
    }

    @Transactional
    public void deleteVehicle(UUID vehicleId, User user) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new IllegalArgumentException("Araç bulunamadı."));

        if (!vehicle.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bu araca erişim yetkiniz yok.");
        }

        vehicleRepository.delete(vehicle);
    }

    private void mapRequestToVehicle(VehicleRequest req, Vehicle vehicle) {
        vehicle.setNickname(req.getNickname());
        vehicle.setBrand(req.getBrand());
        vehicle.setModel(req.getModel());
        vehicle.setModelYear(req.getModelYear());
        vehicle.setFuelType(req.getFuelType());
        vehicle.setFuelConsumptionLPer100km(req.getFuelConsumptionLPer100km());
        vehicle.setEnergyConsumptionKwhPer100km(req.getEnergyConsumptionKwhPer100km());
        vehicle.setTankCapacityLiters(req.getTankCapacityLiters());
        vehicle.setBatteryCapacityKwh(req.getBatteryCapacityKwh());
        vehicle.setUsableRangeKm(req.getUsableRangeKm());
        vehicle.setChargingConnectorType(req.getChargingConnectorType());
        vehicle.setAverageChargingSpeedKw(req.getAverageChargingSpeedKw());
        vehicle.setEmissionClass(req.getEmissionClass());
        vehicle.setTollClass(req.getTollClass());
        vehicle.setHeightCm(req.getHeightCm());
        vehicle.setWidthCm(req.getWidthCm());
        vehicle.setLengthCm(req.getLengthCm());
        vehicle.setWeightKg(req.getWeightKg());
        vehicle.setIsDefault(Boolean.TRUE.equals(req.getIsDefault()));
    }

    public VehicleResponse toResponse(Vehicle vehicle) {
        VehicleResponse response = new VehicleResponse();
        response.setId(vehicle.getId());
        response.setNickname(vehicle.getNickname());
        response.setBrand(vehicle.getBrand());
        response.setModel(vehicle.getModel());
        response.setModelYear(vehicle.getModelYear());
        response.setFuelType(vehicle.getFuelType());
        response.setFuelConsumptionLPer100km(vehicle.getFuelConsumptionLPer100km());
        response.setEnergyConsumptionKwhPer100km(vehicle.getEnergyConsumptionKwhPer100km());
        response.setTankCapacityLiters(vehicle.getTankCapacityLiters());
        response.setBatteryCapacityKwh(vehicle.getBatteryCapacityKwh());
        response.setUsableRangeKm(vehicle.getUsableRangeKm());
        response.setChargingConnectorType(vehicle.getChargingConnectorType());
        response.setAverageChargingSpeedKw(vehicle.getAverageChargingSpeedKw());
        response.setEmissionClass(vehicle.getEmissionClass());
        response.setTollClass(vehicle.getTollClass());
        response.setHeightCm(vehicle.getHeightCm());
        response.setWidthCm(vehicle.getWidthCm());
        response.setLengthCm(vehicle.getLengthCm());
        response.setWeightKg(vehicle.getWeightKg());
        response.setIsDefault(vehicle.getIsDefault());
        response.setCreatedAt(vehicle.getCreatedAt());
        return response;
    }
}
