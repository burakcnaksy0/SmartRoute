package com.smartroute.service.journey;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fetches live fuel prices from national API (ucuzyakitbul.com.tr).
 * 
 * Response structure:
 * {
 *   "prices": [
 *     { "fuelType": "LPG", "price": 33.65, ... },
 *     { "fuelType": "Motorin", "price": 44.05, ... },
 *     { "fuelType": "Benzin", "price": 42.09, ... }
 *   ]
 * }
 */
@Service
public class FuelPriceService {

    public static class FuelPriceResult {
        private final double price;
        private final String distributorName;

        public FuelPriceResult(double price, String distributorName) {
            this.price = price;
            this.distributorName = distributorName;
        }

        public double getPrice() { return price; }
        public String getDistributorName() { return distributorName; }
    }

    private static final Logger log = LoggerFactory.getLogger(FuelPriceService.class);

    // Realistic fallback prices
    private static final double DEFAULT_GASOLINE = 43.50;
    private static final double DEFAULT_DIESEL = 44.00;
    private static final double DEFAULT_LPG = 22.50;
    private static final double DEFAULT_ELECTRIC = 7.50;

    // Cache: cheapest price per fuel type
    private final Map<String, FuelPriceResult> priceCache = new ConcurrentHashMap<>();
    private LocalDateTime lastFetchTime = null;
    private boolean lastFetchSuccess = false;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    
    private final String fuelApiUrl = "https://ucuzyakitbul.com.tr/api/prices/national";

    public FuelPriceService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        // Configure timeouts to avoid hanging on network issues
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .version(java.net.http.HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = RestClient.builder()
                .requestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory(httpClient))
                .build();
    }

    public FuelPriceResult getPriceForVehicleType(String vehicleType) {
        refreshPricesIfNeeded();

        if ("diesel".equalsIgnoreCase(vehicleType)) {
            return priceCache.getOrDefault("motorin", new FuelPriceResult(DEFAULT_DIESEL, "Genel"));
        } else if ("lpg".equalsIgnoreCase(vehicleType)) {
            return priceCache.getOrDefault("lpg", new FuelPriceResult(DEFAULT_LPG, "Genel"));
        } else if ("electric".equalsIgnoreCase(vehicleType)) {
            return new FuelPriceResult(DEFAULT_ELECTRIC, "Şarj İstasyonu");
        } else if ("hybrid".equalsIgnoreCase(vehicleType)) {
            return priceCache.getOrDefault("benzin", new FuelPriceResult(DEFAULT_GASOLINE, "Genel"));
        } else {
            return priceCache.getOrDefault("benzin", new FuelPriceResult(DEFAULT_GASOLINE, "Genel"));
        }
    }

    public boolean isLivePriceAvailable() {
        return lastFetchSuccess;
    }

    public String getPriceSourceLabel() {
        if (lastFetchSuccess && lastFetchTime != null) {
            return "Ucuz Yakıt Bul Ulusal Ortalama";
        }
        return "Ortalama Tahmini Fiyat";
    }

    private synchronized void refreshPricesIfNeeded() {
        // Refresh every 6 hours
        if (lastFetchTime != null && LocalDateTime.now().minusHours(6).isBefore(lastFetchTime)) {
            return;
        }

        try {
            log.info("🔄 Fetching fuel prices from national API...");
            
            String response = restClient.get()
                    .uri(fuelApiUrl)
                    .header("accept", "application/json")
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            if (root != null && root.has("prices") && root.get("prices").isArray()) {

                double minBenzin = Double.MAX_VALUE;
                double minMotorin = Double.MAX_VALUE;
                double minLpg = Double.MAX_VALUE;

                for (JsonNode priceNode : root.get("prices")) {
                    String fuelType = priceNode.has("fuelType") ? priceNode.get("fuelType").asText() : "";
                    double price = priceNode.has("price") ? priceNode.get("price").asDouble(0) : 0;
                    
                    if (price <= 0) continue;
                    
                    if ("benzin".equalsIgnoreCase(fuelType)) {
                        if (price < minBenzin) minBenzin = price;
                    } else if ("motorin".equalsIgnoreCase(fuelType)) {
                        if (price < minMotorin) minMotorin = price;
                    } else if ("lpg".equalsIgnoreCase(fuelType)) {
                        if (price < minLpg) minLpg = price;
                    }
                }

                if (minBenzin != Double.MAX_VALUE) {
                    priceCache.put("benzin", new FuelPriceResult(minBenzin, "Türkiye Geneli"));
                    log.info("⛽ Benzin (Ulusal): ₺{}", String.format("%.2f", minBenzin));
                }
                if (minMotorin != Double.MAX_VALUE) {
                    priceCache.put("motorin", new FuelPriceResult(minMotorin, "Türkiye Geneli"));
                    log.info("⛽ Motorin (Ulusal): ₺{}", String.format("%.2f", minMotorin));
                }
                if (minLpg != Double.MAX_VALUE) {
                    priceCache.put("lpg", new FuelPriceResult(minLpg, "Türkiye Geneli"));
                    log.info("⛽ LPG (Ulusal): ₺{}", String.format("%.2f", minLpg));
                }

                lastFetchTime = LocalDateTime.now();
                lastFetchSuccess = true;
                log.info("✅ Fuel prices updated successfully.");
                return;
            } else {
                log.warn("⚠️ API returned unexpected structure: {}", response);
            }
        } catch (Exception e) {
            log.error("❌ Failed to fetch fuel prices from national API: {}", e.getMessage());
        }

        // Populate defaults if cache is empty (first-time failure)
        lastFetchSuccess = false;
        if (priceCache.isEmpty()) {
            priceCache.put("benzin", new FuelPriceResult(DEFAULT_GASOLINE, "Genel"));
            priceCache.put("motorin", new FuelPriceResult(DEFAULT_DIESEL, "Genel"));
            priceCache.put("lpg", new FuelPriceResult(DEFAULT_LPG, "Genel"));
            lastFetchTime = LocalDateTime.now();
            log.info("📌 Using fallback fuel prices (API unavailable).");
        }
    }
}
