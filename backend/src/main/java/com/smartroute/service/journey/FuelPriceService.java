package com.smartroute.service.journey;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fetches live fuel prices from the self-hosted Python fuel microservice
 * and provides cheapest-distributor recommendations for Smart Refuel.
 *
 * Microservice API: http://localhost:8000/api/v1/prices?city={city}
 *
 * Response structure:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "fuel_type": "benzin",
 *       "price": 42.50,
 *       "currency": "TRY",
 *       "company": "shell",
 *       "city": "İstanbul",
 *       "district": "Kadıköy",
 *       "last_updated": "2026-08-24T12:00:00"
 *     },
 *     ...
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

    /**
     * Holds per-distributor pricing for comparison / Smart Refuel.
     */
    public static class DistributorPrice {
        private final String distributor;
        private final double benzin95;
        private final double motorin;
        private final double lpg;

        public DistributorPrice(String distributor, double benzin95, double motorin, double lpg) {
            this.distributor = distributor;
            this.benzin95 = benzin95;
            this.motorin = motorin;
            this.lpg = lpg;
        }

        public String getDistributor() { return distributor; }
        public double getBenzin95() { return benzin95; }
        public double getMotorin() { return motorin; }
        public double getLpg() { return lpg; }
    }

    private static final Logger log = LoggerFactory.getLogger(FuelPriceService.class);

    // Realistic fallback prices
    private static final double DEFAULT_GASOLINE = 43.50;
    private static final double DEFAULT_DIESEL = 44.00;
    private static final double DEFAULT_LPG = 22.50;
    private static final double DEFAULT_ELECTRIC = 7.50; // TL per kWh (public charger avg)

    // Cache: cheapest price per fuel type
    private final Map<String, FuelPriceResult> priceCache = new ConcurrentHashMap<>();
    // Cache: all distributor prices for Smart Refuel comparison
    private final List<DistributorPrice> distributorPrices = new ArrayList<>();
    private LocalDateTime lastFetchTime = null;
    private boolean lastFetchSuccess = false;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${fuel.api.url:http://localhost:8000}")
    private String fuelApiUrl;

    @Value("${fuel.api.city:İstanbul}")
    private String defaultCity;

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

    /**
     * Returns the cheapest price for the given vehicle fuel type,
     * along with the distributor name offering that price.
     */
    public FuelPriceResult getPriceForVehicleType(String vehicleType) {
        refreshPricesIfNeeded();

        if ("diesel".equalsIgnoreCase(vehicleType)) {
            return priceCache.getOrDefault("motorin", new FuelPriceResult(DEFAULT_DIESEL, "Genel"));
        } else if ("lpg".equalsIgnoreCase(vehicleType)) {
            return priceCache.getOrDefault("lpg", new FuelPriceResult(DEFAULT_LPG, "Genel"));
        } else if ("electric".equalsIgnoreCase(vehicleType)) {
            return new FuelPriceResult(DEFAULT_ELECTRIC, "Şarj İstasyonu");
        } else if ("hybrid".equalsIgnoreCase(vehicleType)) {
            // Hybrid uses gasoline prices but lower consumption
            return priceCache.getOrDefault("benzin95", new FuelPriceResult(DEFAULT_GASOLINE, "Genel"));
        } else {
            // Default: gasoline
            return priceCache.getOrDefault("benzin95", new FuelPriceResult(DEFAULT_GASOLINE, "Genel"));
        }
    }

    /**
     * Returns all distributor prices for Smart Refuel comparison.
     * Enables finding cheapest station on a given route.
     */
    public List<DistributorPrice> getAllDistributorPrices() {
        refreshPricesIfNeeded();
        return new ArrayList<>(distributorPrices);
    }

    /**
     * Whether the last API fetch was successful (vs fallback).
     */
    public boolean isLivePriceAvailable() {
        return lastFetchSuccess;
    }

    /**
     * Returns a human-readable price source label for UI display.
     */
    public String getPriceSourceLabel() {
        if (lastFetchSuccess && lastFetchTime != null) {
            return "Gerçek Zamanlı İstasyon Fiyatları (" + defaultCity + ")";
        }
        return "Ortalama Tahmini Fiyat";
    }

    private synchronized void refreshPricesIfNeeded() {
        // Refresh every 6 hours (fuel prices change ~daily)
        if (lastFetchTime != null && LocalDateTime.now().minusHours(6).isBefore(lastFetchTime)) {
            return;
        }

        try {
            log.info("🔄 Fetching fuel prices from local API for city={} using URL={}...", defaultCity, fuelApiUrl);
            String apiUrl = fuelApiUrl + "/api/v1/prices?city=" + defaultCity;
            
            String response = restClient.get()
                    .uri(apiUrl)
                    .header("accept", "application/json")
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            if (root != null && root.has("success") && root.get("success").asBoolean()
                    && root.has("data") && root.get("data").isArray()) {

                double minBenzin = Double.MAX_VALUE;
                double minMotorin = Double.MAX_VALUE;
                double minLpg = Double.MAX_VALUE;

                String bestBenzinDist = "Genel";
                String bestMotorinDist = "Genel";
                String bestLpgDist = "Genel";

                Map<String, DistributorPrice> distMap = new ConcurrentHashMap<>();

                for (JsonNode priceNode : root.get("data")) {
                    String fuelType = priceNode.has("fuel_type") ? priceNode.get("fuel_type").asText() : "";
                    String distName = priceNode.has("company") ? priceNode.get("company").asText() : "Bilinmeyen";
                    double price = priceNode.has("price") ? priceNode.get("price").asDouble(0) : 0;
                    
                    if (price <= 0) continue;
                    
                    // Format distributor name nicely (e.g. "petrol_ofisi" -> "Petrol Ofisi")
                    if ("petrol_ofisi".equalsIgnoreCase(distName)) {
                        distName = "Petrol Ofisi";
                    } else if (distName != null && distName.length() > 0) {
                        distName = distName.substring(0, 1).toUpperCase() + distName.substring(1).toLowerCase();
                    }

                    DistributorPrice dp = distMap.getOrDefault(distName, new DistributorPrice(distName, 0, 0, 0));
                    
                    if ("benzin".equalsIgnoreCase(fuelType) || "benzin95".equalsIgnoreCase(fuelType)) {
                        dp = new DistributorPrice(distName, price, dp.getMotorin(), dp.getLpg());
                        if (price < minBenzin) {
                            minBenzin = price;
                            bestBenzinDist = distName;
                        }
                    } else if ("motorin".equalsIgnoreCase(fuelType) || "motorin_pro".equalsIgnoreCase(fuelType)) {
                        dp = new DistributorPrice(distName, dp.getBenzin95(), price, dp.getLpg());
                        if (price < minMotorin) {
                            minMotorin = price;
                            bestMotorinDist = distName;
                        }
                    } else if ("lpg".equalsIgnoreCase(fuelType)) {
                        dp = new DistributorPrice(distName, dp.getBenzin95(), dp.getMotorin(), price);
                        if (price < minLpg) {
                            minLpg = price;
                            bestLpgDist = distName;
                        }
                    }
                    
                    distMap.put(distName, dp);
                }

                // Update cache with cheapest prices
                if (minBenzin != Double.MAX_VALUE) {
                    priceCache.put("benzin95", new FuelPriceResult(minBenzin, bestBenzinDist));
                    log.info("⛽ Benzin en ucuz: {} — ₺{}", bestBenzinDist, String.format("%.2f", minBenzin));
                }
                if (minMotorin != Double.MAX_VALUE) {
                    priceCache.put("motorin", new FuelPriceResult(minMotorin, bestMotorinDist));
                    log.info("⛽ Motorin en ucuz: {} — ₺{}", bestMotorinDist, String.format("%.2f", minMotorin));
                }
                if (minLpg != Double.MAX_VALUE) {
                    priceCache.put("lpg", new FuelPriceResult(minLpg, bestLpgDist));
                    log.info("⛽ LPG en ucuz: {} — ₺{}", bestLpgDist, String.format("%.2f", minLpg));
                }

                // Update distributor prices list
                synchronized (distributorPrices) {
                    distributorPrices.clear();
                    distributorPrices.addAll(distMap.values());
                }

                if (!distributorPrices.isEmpty()) {
                    lastFetchTime = LocalDateTime.now();
                    lastFetchSuccess = true;
                    log.info("✅ Fuel prices updated successfully. {} distributors loaded.", distMap.size());
                    return;
                } else {
                    log.warn("⚠️ API returned success but no usable fuel data found.");
                }
            } else {
                log.warn("⚠️ API returned unexpected structure: {}", response);
            }
        } catch (Exception e) {
            log.error("❌ Failed to fetch fuel prices from local API: {}", e.getMessage());
        }

        // Populate defaults if cache is empty (first-time failure)
        lastFetchSuccess = false;
        if (priceCache.isEmpty()) {
            priceCache.put("benzin95", new FuelPriceResult(DEFAULT_GASOLINE, "Genel"));
            priceCache.put("motorin", new FuelPriceResult(DEFAULT_DIESEL, "Genel"));
            priceCache.put("lpg", new FuelPriceResult(DEFAULT_LPG, "Genel"));
            lastFetchTime = LocalDateTime.now();
            log.info("📌 Using fallback fuel prices (API unavailable).");
        }
    }
}
