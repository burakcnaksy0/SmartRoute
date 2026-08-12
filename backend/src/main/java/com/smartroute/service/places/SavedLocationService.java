package com.smartroute.service.places;

import com.smartroute.domain.SavedLocation;
import com.smartroute.domain.User;
import com.smartroute.dto.SavedLocationDto;
import com.smartroute.repository.SavedLocationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SavedLocationService {

    private final SavedLocationRepository savedLocationRepository;

    public SavedLocationService(SavedLocationRepository savedLocationRepository) {
        this.savedLocationRepository = savedLocationRepository;
    }

    public List<SavedLocationDto> getSavedLocations(User user) {
        return savedLocationRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public SavedLocationDto saveLocation(User user, SavedLocationDto dto) {
        SavedLocation savedLocation = new SavedLocation(
                user,
                dto.getLabel() != null ? dto.getLabel() : "Kaydedilen Konum",
                dto.getLat(),
                dto.getLng(),
                dto.getAddress(),
                dto.getCategory()
        );
        savedLocation = savedLocationRepository.save(savedLocation);
        return toDto(savedLocation);
    }

    public void deleteLocation(User user, UUID id) {
        SavedLocation savedLocation = savedLocationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Kayıtlı konum bulunamadı."));
        
        if (!savedLocation.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Bu konumu silme yetkiniz yok.");
        }
        
        savedLocationRepository.delete(savedLocation);
    }

    private SavedLocationDto toDto(SavedLocation entity) {
        SavedLocationDto dto = new SavedLocationDto();
        dto.setId(entity.getId());
        dto.setLabel(entity.getLabel());
        dto.setLat(entity.getLat());
        dto.setLng(entity.getLng());
        dto.setAddress(entity.getAddress());
        dto.setCategory(entity.getCategory());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }
}
