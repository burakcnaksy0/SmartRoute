# Route Planning & Optimization API Entegrasyon Dokümantasyonu

## 1. Amaç

Bu dokümanın amacı mevcut rota hesaplama backend + mobil uygulama sistemini aşağıdaki mimariye göre güncellemektir.

Sistem:

- Kullanıcının mevcut GPS konumunu almalı.
- Başlangıç, hedef ve durak adreslerini koordinatlara çevirmeli.
- Birden fazla durak içeren rotalar hesaplamalı.
- Durak sıralamasını gerektiğinde optimize etmeli.
- En hızlı, en kısa, en ekonomik ve dengeli rota seçenekleri oluşturmalı.
- Hedef veya rota çevresindeki otopark gibi POI'leri bulabilmeli.
- Harita üzerinde rotaları ve durakları gösterebilmeli.
- Dış API anahtarlarını frontend'e kesinlikle sızdırmamalı.
- API sağlayıcılarını abstraction/interface arkasında tutarak gelecekte sağlayıcı değişimine izin vermeli.
- Redis ile uygun sonuçları cache'lemeli.
- PostgreSQL + PostGIS ile konumsal veri işlemlerine hazır olmalı.

> Önemli: Bu dokümandaki API anahtarları placeholder olarak bırakılmıştır. Gerçek anahtarlar geliştirici tarafından doldurulacaktır. API key'ler source code içine hard-code edilmemeli ve React Native uygulamasına gönderilmemelidir.

---

# 2. Kararlaştırılan Teknoloji ve API'ler

| İhtiyaç | Çözüm |
|---|---|
| Cihaz GPS konumu | React Native / Expo Location |
| Adres → koordinat | Geoapify Geocoding API |
| Koordinat → adres | Geoapify Reverse Geocoding API |
| Rota hesaplama | OpenRouteService (ORS) |
| Multi-stop routing | OpenRouteService Directions |
| Mesafe/süre matrisi | OpenRouteService Matrix |
| Durak optimizasyonu | OpenRouteService Optimization + gerektiğinde backend scoring |
| Otopark / POI | Overpass API + OpenStreetMap |
| Harita verisi | OpenStreetMap tabanlı çözüm |
| Navigation handoff | Apple Maps / Google Maps |
| Cache | Redis |
| Database | PostgreSQL |
| Spatial database | PostGIS |
| Backend | Mevcut Spring Boot backend |
| Mobile | Mevcut React Native / Expo uygulaması |

---

# 3. Genel Mimari

```text
┌──────────────────────────────────────────────┐
│              React Native / Expo             │
│                                              │
│  • GPS / expo-location                       │
│  • Route UI                                  │
│  • Map UI                                    │
│  • Stop management                           │
│  • User preferences                          │
└──────────────────────┬───────────────────────┘
                       │
                       │ REST API
                       ▼
┌──────────────────────────────────────────────┐
│                Spring Boot Backend            │
│                                              │
│  Route Management                            │
│  Route Optimization                          │
│  Route Scoring                               │
│  Geocoding                                   │
│  Parking / POI                               │
│  User Preferences                             │
│  Provider Abstractions                        │
│  Validation                                  │
│  Caching                                     │
└───────────┬──────────────┬──────────────┬────┘
            │              │              │
            ▼              ▼              ▼
      ┌──────────┐   ┌───────────┐   ┌───────────┐
      │   ORS    │   │ Geoapify  │   │ Overpass  │
      │          │   │           │   │    API    │
      │ Routing  │   │ Geocoding │   │   + OSM   │
      │ Matrix   │   │ Reverse   │   │ Parking   │
      │ Optimize │   │ Geocoding │   │   / POI   │
      └──────────┘   └───────────┘   └───────────┘
            │              │              │
            └──────────────┼──────────────┘
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │    Cache    │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ PostgreSQL  │
                    │  + PostGIS  │
                    └─────────────┘
```

---

# 4. Kritik Mimari Kurallar

## 4.1 API key frontend'e gönderilmeyecek

Aşağıdaki yapı kesinlikle kullanılmayacak:

```text
React Native
     ↓
ORS API
```

veya:

```text
React Native
     ↓
Geoapify API
```

API key'ler yalnızca backend tarafında kullanılacak.

Doğru yapı:

```text
React Native
     ↓
Spring Boot
     ↓
External API
```

---

# 5. Environment Configuration

API key ve konfigürasyon değerleri environment variable üzerinden yönetilmelidir.

Örnek:

```env
# OpenRouteService
ORS_API_KEY=YOUR_ORS_API_KEY_HERE
ORS_BASE_URL=https://api.openrouteservice.org

# Geoapify
GEOAPIFY_API_KEY=YOUR_GEOAPIFY_API_KEY_HERE
GEOAPIFY_BASE_URL=https://api.geoapify.com

# Overpass
OVERPASS_BASE_URL=https://overpass-api.de/api/interpreter

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=route_app
POSTGRES_USERNAME=YOUR_USERNAME
POSTGRES_PASSWORD=YOUR_PASSWORD
```

Alternatif olarak `application.yml`:

```yaml
routing:
  ors:
    base-url: ${ORS_BASE_URL:https://api.openrouteservice.org}
    api-key: ${ORS_API_KEY:}

geocoding:
  geoapify:
    base-url: ${GEOAPIFY_BASE_URL:https://api.geoapify.com}
    api-key: ${GEOAPIFY_API_KEY:}

parking:
  overpass:
    base-url: ${OVERPASS_BASE_URL:https://overpass-api.de/api/interpreter}

spring:
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
```

Gerçek secret değerleri Git'e commit edilmeyecek.

`.gitignore` içinde aşağıdaki benzeri dosyalar bulunmalı:

```gitignore
.env
.env.*
application-local.yml
application-local.yaml
secrets/
```

---

# 6. Mobile GPS - Expo Location

Kullanıcının mevcut konumu harici API ile bulunmayacak.

Cihazın GPS sensörü kullanılacak.

React Native / Expo tarafında `expo-location` kullanılmalı.

Akış:

```text
User opens route screen
        ↓
Request location permission
        ↓
Get current location
        ↓
latitude / longitude
        ↓
Send coordinates to backend
```

Örnek payload:

```json
{
  "latitude": 40.8025,
  "longitude": 29.4307
}
```

Location permission düzgün yönetilmeli.

Konum alınamadığında kullanıcıya Türkçe ve anlaşılır hata mesajı gösterilmeli.

---

# 7. Geoapify - Geocoding

Geoapify yalnızca geocoding / reverse geocoding amacıyla kullanılacak.

## 7.1 Forward Geocoding

Kullanıcı:

```text
İstanbul Havalimanı
```

yazdığında:

```text
Address
   ↓
Geoapify
   ↓
Latitude / Longitude
```

elde edilecek.

Backend endpoint örneği:

```http
GET /api/locations/search?query=İstanbul Havalimanı
```

Response:

```json
[
  {
    "name": "İstanbul Havalimanı",
    "latitude": 41.2619,
    "longitude": 28.7419,
    "formattedAddress": "Tayakadın, Arnavutköy/İstanbul"
  }
]
```

---

## 7.2 Reverse Geocoding

```text
latitude + longitude
        ↓
Geoapify
        ↓
formatted address
```

Örnek:

```http
GET /api/locations/reverse?latitude=40.8025&longitude=29.4307
```

---

# 8. Geocoding Abstraction

Geoapify doğrudan business logic içine gömülmemeli.

Interface:

```java
public interface GeocodingProvider {

    List<LocationResult> search(String query);

    LocationResult reverseGeocode(
        double latitude,
        double longitude
    );
}
```

Implementation:

```java
@Component
public class GeoapifyGeocodingProvider
        implements GeocodingProvider {
}
```

Böylece ileride Geoapify yerine başka provider eklenebilir.

---

# 9. OpenRouteService - Routing

## 9.1 Ana routing provider

Rota hesaplamanın ana provider'ı:

**OpenRouteService (ORS)**

olacak.

Geoapify routing kullanılmayacak.

ORS:

- Directions
- Matrix
- Optimization

işlemlerinin ana sağlayıcısı olacak.

---

# 10. Multi-Stop Route

Örnek:

```text
Current Location
       ↓
Stop A
       ↓
Stop B
       ↓
Stop C
       ↓
Destination
```

Backend request:

```json
{
  "origin": {
    "latitude": 40.8025,
    "longitude": 29.4307
  },
  "destination": {
    "latitude": 41.0082,
    "longitude": 28.9784
  },
  "stops": [
    {
      "id": "stop-1",
      "latitude": 40.991,
      "longitude": 29.027
    },
    {
      "id": "stop-2",
      "latitude": 40.995,
      "longitude": 29.050
    }
  ]
}
```

Backend:

```text
RouteController
      ↓
RouteService
      ↓
RouteOptimizationService
      ↓
ORS Provider
      ↓
ORS Directions / Matrix / Optimization
```

---

# 11. ORS Matrix

Matrix, noktalar arasındaki:

- distance
- duration

bilgilerini elde etmek için kullanılacak.

Örneğin:

```text
Origin
Stop A
Stop B
Stop C
Destination
```

arasındaki mesafe ve süre matrisi çıkarılabilir.

Bu bilgiler:

- Durak sıralaması
- En kısa rota
- En hızlı rota
- Alternatif rota
- Scoring

işlemlerinde kullanılabilir.

---

# 12. ORS Optimization

Durakların kullanıcı tarafından belirlenen sırada gitmesi zorunlu değilse ORS Optimization kullanılabilir.

Örnek:

```text
Origin
  ↓
A
  ↓
B
  ↓
C
  ↓
Destination
```

yerine sistem:

```text
Origin
  ↓
B
  ↓
C
  ↓
A
  ↓
Destination
```

şeklinde daha verimli bir sıra önerebilir.

Ancak önemli bir kural vardır:

## Kullanıcı "durak sırasını koru" seçtiyse optimization yapılmayacak.

Bu durumda:

```text
Origin → A → B → C → Destination
```

sırası aynen korunmalı.

---

# 13. Route Optimization Business Logic

ORS sadece ham rota verisini sağlar.

"En iyi rota" kararını uygulamanın business logic'i vermelidir.

Sistem aşağıdaki rota tiplerini desteklemeli:

### 13.1 Fastest

En düşük toplam duration.

```text
score = duration
```

### 13.2 Shortest

En düşük toplam distance.

```text
score = distance
```

### 13.3 Cheapest

Tahmini yakıt + varsa bilinen geçiş/ücret maliyetleri üzerinden hesaplanmalı.

Örnek:

```text
fuelCost =
(distance / 100) * vehicleConsumption * fuelPrice
```

### 13.4 Balanced

Distance + duration + estimated cost ağırlıklı skor.

Örnek:

```text
score =
    durationWeight * normalizedDuration
  + distanceWeight * normalizedDistance
  + costWeight * normalizedCost
```

Ağırlıklar configuration üzerinden değiştirilebilir olmalı.

---

# 14. Route Provider Abstraction

```java
public interface RoutingProvider {

    RouteResult calculateRoute(
        Coordinate origin,
        Coordinate destination,
        List<Coordinate> waypoints
    );

    MatrixResult calculateMatrix(
        List<Coordinate> locations
    );

    OptimizedRoute optimizeRoute(
        Coordinate origin,
        Coordinate destination,
        List<Coordinate> stops
    );
}
```

ORS implementation:

```java
@Component
public class OpenRouteServiceProvider
        implements RoutingProvider {
}
```

Business logic provider'a bağımlı olmamalı.

---

# 15. Parking / POI - Overpass API

Otopark bulma için:

**OpenStreetMap + Overpass API**

kullanılacak.

Temel OSM tag:

```text
amenity=parking
```

Hedef çevresindeki otoparklar için radius bazlı sorgular kullanılmalı.

Mantıksal örnek:

```text
Destination
    ↓
Radius: 2000m
    ↓
Overpass
    ↓
amenity=parking
```

Dönen OSM verilerinden mümkün olan alanlar normalize edilmeli:

```json
{
  "id": "osm-id",
  "name": "Parking A",
  "latitude": 41.009,
  "longitude": 28.980,
  "distanceMeters": 320,
  "capacity": 120,
  "fee": true,
  "access": "customers"
}
```

Alanlar OSM'de mevcut değilse `null` bırakılmalı.

Veri uydurulmamalı.

---

# 16. Parking Provider Abstraction

```java
public interface ParkingProvider {

    List<ParkingResult> findNearby(
        Coordinate location,
        int radiusMeters
    );
}
```

Implementation:

```java
@Component
public class OverpassParkingProvider
        implements ParkingProvider {
}
```

İleride Geoapify Places veya başka bir parking provider eklenebilmesi için abstraction korunmalı.

---

# 17. Overpass Kullanım Kuralları

Overpass public endpoint'i agresif şekilde kullanılmamalı.

Aşağıdaki davranışlar yapılmamalı:

```text
Map hareket etti
↓
Overpass request

Map tekrar hareket etti
↓
Overpass request

Map tekrar hareket etti
↓
Overpass request
```

Bunun yerine yalnızca gerçekten ihtiyaç olduğunda sorgu yapılmalı.

Ayrıca:

- Redis cache kullanılmalı.
- Radius ve koordinat precision normalize edilmeli.
- Aynı bölge için tekrar tekrar API çağrısı yapılmamalı.
- Timeout uygulanmalı.
- Retry sınırlı olmalı.
- Provider hata verdiğinde uygulama tamamen çökmemeli.

---

# 18. Redis Cache

Cache özellikle:

- Geocoding sonuçları
- Reverse geocoding
- Parking / POI sonuçları
- Route Matrix
- Aynı origin/destination/waypoint kombinasyonları

için değerlendirilmeli.

Örnek cache key:

```text
geocode:{normalizedQuery}
```

```text
reverse-geocode:{latRounded}:{lonRounded}
```

```text
parking:{latRounded}:{lonRounded}:{radius}
```

```text
route:{origin}:{destination}:{waypoints}:{profile}
```

Cache key'lerinde koordinatlar belirli hassasiyette yuvarlanmalı.

Örneğin:

```text
40.80251234
```

yerine uygun bir precision ile:

```text
40.8025
```

kullanılabilir.

---

# 19. PostgreSQL + PostGIS

PostgreSQL kullanılmaya devam etmeli.

Konumsal işlemler için PostGIS extension eklenmeli.

Örnek:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

PostGIS ileride şu ihtiyaçlarda kullanılacak:

- Route üzerindeki POI'leri bulma
- Belirli yarıçap içindeki otoparkları bulma
- Route'a belirli mesafeden yakın durakları bulma
- Spatial filtering
- Geospatial indexing
- Kullanıcının kayıtlı favori konumları
- Saved routes

Spatial kolonlar için uygun `geometry` / `geography` tipleri kullanılmalı.

---

# 20. Backend API Tasarımı

Aşağıdaki endpoint'ler önerilir.

## Location

```http
GET /api/locations/search?query={query}
```

```http
GET /api/locations/reverse?latitude={lat}&longitude={lon}
```

---

## Route

```http
POST /api/routes/calculate
```

Örnek:

```json
{
  "origin": {
    "latitude": 40.8025,
    "longitude": 29.4307
  },
  "destination": {
    "latitude": 41.0082,
    "longitude": 28.9784
  },
  "stops": [],
  "optimization": {
    "mode": "BALANCED",
    "preserveStopOrder": false
  }
}
```

---

## Parking

```http
GET /api/parking/nearby?latitude={lat}&longitude={lon}&radius=2000
```

---

# 21. Route Response

Frontend'e provider'a özgü ham ORS response'u gönderilmemeli.

Normalize edilmiş DTO dönülmeli.

Örnek:

```json
{
  "routes": [
    {
      "id": "route-1",
      "type": "FASTEST",
      "distanceMeters": 185000,
      "durationSeconds": 8100,
      "estimatedFuelCost": 620.50,
      "score": 0.91,
      "geometry": "...",
      "stops": [
        {
          "id": "stop-1",
          "sequence": 1,
          "latitude": 40.991,
          "longitude": 29.027
        }
      ]
    }
  ]
}
```

Frontend ORS'nin response formatına bağımlı olmamalı.

---

# 22. Route Types

Enum:

```java
public enum RouteType {
    FASTEST,
    SHORTEST,
    CHEAPEST,
    BALANCED
}
```

Optimization mode:

```java
public enum OptimizationMode {
    FASTEST,
    SHORTEST,
    CHEAPEST,
    BALANCED
}
```

İleride:

```text
TOLL_AVOIDING
FUEL_EFFICIENT
SCENIC
```

gibi modlar eklenebilecek şekilde tasarım yapılmalı.

---

# 23. User Preferences

Kullanıcı tercihlerine göre route scoring değiştirilebilmeli.

Örnek:

```json
{
  "preferredRouteType": "CHEAPEST",
  "avoidTolls": true,
  "avoidHighways": false,
  "preserveStopOrder": true,
  "fuelConsumption": 7.2,
  "fuelPrice": 55.50
}
```

Yakıt tüketimi ve yakıt fiyatı kullanıcıya veya sistem konfigürasyonuna göre yönetilebilir.

---

# 24. Gerçek Zamanlı Trafik Konusu

ORS/OpenStreetMap tabanlı sistem ile gerçek zamanlı trafik verisi garanti edilmemeli.

Bu nedenle UI'da trafik bilgisi yoksa:

```text
"Gerçek zamanlı trafik verisi mevcut değil."
```

gibi doğru bir durum gösterilmeli.

Sistemde trafik verisi varmış gibi davranılmamalı.

İleride ayrı bir traffic provider eklenebilir.

---

# 25. Parking Occupancy Konusu

Overpass / OSM üzerinden:

- parking location
- name
- capacity
- fee
- access
- parking type

gibi OSM'de mevcut bilgiler alınabilir.

Ancak gerçek zamanlı boş park yeri sayısı garanti edilemez.

Dolayısıyla:

```text
"17 boş yer"
```

gibi bilgi yalnızca gerçek zamanlı bir provider bunu sağlıyorsa gösterilmeli.

---

# 26. Navigation

Uygulama kendi navigation motorunu geliştirmeye çalışmamalı.

MVP aşamasında:

```text
Route calculated
      ↓
User selects route
      ↓
"Navigasyonu Başlat"
      ↓
Apple Maps / Google Maps
```

handoff yapılmalı.

Bu projenin ana değeri navigation engine değil:

> Kullanıcı için uygun yolculuk planını ve durak sıralamasını üretmek.

---

# 27. Error Handling

External API hataları global exception handler tarafından yönetilmeli.

Örnek durumlar:

```text
ORS unavailable
Geoapify unavailable
Overpass timeout
Invalid coordinates
No route found
No parking found
Rate limit exceeded
Invalid API key
```

Frontend'e provider'a özgü teknik hata gönderilmemeli.

Örnek:

```json
{
  "code": "ROUTE_PROVIDER_UNAVAILABLE",
  "message": "Rota şu anda hesaplanamıyor. Lütfen tekrar deneyin."
}
```

Mesajlar Türkçe olmalı.

Loglarda teknik detay tutulabilir.

---

# 28. Timeout / Retry / Resilience

External API çağrıları için:

- Connection timeout
- Read timeout
- Request timeout
- Limited retry
- Circuit breaker
- Rate limiter

uygulanmalı.

Retry yalnızca retry edilebilir hatalarda yapılmalı.

Örneğin:

```text
400 → retry etme
401 → retry etme
403 → retry etme
429 → kontrollü retry/backoff
500 → sınırlı retry
503 → sınırlı retry
timeout → sınırlı retry
```

Spring Boot projesinde mevcut altyapıya uygunsa Resilience4j kullanılabilir.

---

# 29. API Rate Limiting

Backend'in kendi endpoint'leri için de rate limiting uygulanmalı.

Özellikle:

```http
POST /api/routes/calculate
GET /api/locations/search
GET /api/parking/nearby
```

endpoint'leri kötüye kullanıma açık olabilir.

Redis tabanlı rate limiter tercih edilebilir.

---

# 30. API Provider Configuration

Provider'lar config ile açılıp kapatılabilir olmalı.

Örnek:

```yaml
providers:
  routing: ors
  geocoding: geoapify
  parking: overpass
```

İleride:

```yaml
providers:
  routing: ors
  geocoding: geoapify
  parking: geoapify
```

gibi değişiklik mümkün olmalı.

---

# 31. Attribution

OpenStreetMap ve kullanılan OSM tabanlı servislerin attribution/lisans gereksinimleri yerine getirilmeli.

Mobil uygulamanın ilgili harita / POI ekranında uygun attribution gösterilmeli.

Provider'ın güncel kullanım şartları ve attribution kuralları geliştirme ve production deployment öncesinde kontrol edilmeli.

---

# 32. Security

Aşağıdakiler kesinlikle yapılmamalı:

```text
API key frontend'e koymak
API key GitHub'a commit etmek
API key loglamak
API key response içinde döndürmek
External provider URL'lerini frontend'e zorunlu bağımlılık yapmak
```

API key'ler:

```text
Environment Variables
       ↓
Spring Boot Configuration
       ↓
Provider Client
```

şeklinde kullanılmalı.

---

# 33. Kod Organizasyonu

Mevcut projeye uygun şekilde mümkün olduğunca feature-based organization tercih edilmeli.

Öneri:

```text
route/
├── controller/
├── service/
├── dto/
├── domain/
├── provider/
│   ├── RoutingProvider.java
│   └── OpenRouteServiceProvider.java
└── mapper/

location/
├── controller/
├── service/
├── dto/
├── provider/
│   ├── GeocodingProvider.java
│   └── GeoapifyGeocodingProvider.java
└── mapper/

parking/
├── controller/
├── service/
├── dto/
├── provider/
│   ├── ParkingProvider.java
│   └── OverpassParkingProvider.java
└── mapper/

shared/
├── exception/
├── cache/
├── client/
├── config/
└── security/
```

Mevcut proje yapısı daha farklıysa gereksiz yere tüm projeyi yeniden organize etme. Önce mevcut mimariyi incele ve mevcut standartları mümkün olduğunca koru.

---

# 34. External HTTP Client

Mevcut Spring Boot projesindeki HTTP client standardı kullanılmalı.

Eğer projede Spring `RestClient` kullanılıyorsa provider client'larında `RestClient` tercih edilmeli.

Eğer WebClient standardı zaten oturmuşsa mevcut yapı korunabilir.

Aynı projede sırf bu entegrasyonlar için gereksiz şekilde birden fazla HTTP client teknolojisi kullanılmamalı.

---

# 35. DTO Kuralı

External API response modelleri doğrudan application DTO'su olarak kullanılmamalı.

Örneğin:

```text
ORS Response
   ↓
ORS DTO
   ↓
Mapper
   ↓
Internal RouteResult
   ↓
API Response DTO
```

aynı şekilde:

```text
Geoapify Response
   ↓
Geoapify DTO
   ↓
Mapper
   ↓
Internal LocationResult
```

Bu sayede provider değiştiğinde frontend ve business logic etkilenmez.

---

# 36. Testler

Aşağıdaki testler eklenmeli.

## Unit Tests

- Route scoring
- Fastest calculation
- Shortest calculation
- Cheapest calculation
- Balanced scoring
- Stop order preservation
- Stop optimization
- Coordinate validation
- Cache key generation

## Integration Tests

- ORS provider
- Geoapify provider
- Overpass provider
- Redis
- PostgreSQL/PostGIS

External API testleri mümkünse mock/stub ile yapılmalı.

Gerçek API'lere bağlı testler normal unit test lifecycle'ına bağlanmamalı.

---

# 37. Acceptance Criteria

Geliştirme tamamlandığında aşağıdaki maddeler çalışıyor olmalı:

### Location

- [ ] Mobil cihazdan GPS konumu alınabiliyor.
- [ ] Location permission düzgün çalışıyor.
- [ ] Konum backend'e gönderiliyor.

### Geocoding

- [ ] Adres araması çalışıyor.
- [ ] Forward geocoding çalışıyor.
- [ ] Reverse geocoding çalışıyor.
- [ ] Sonuçlar normalize ediliyor.
- [ ] API key backend'de tutuluyor.

### Routing

- [ ] ORS Directions çalışıyor.
- [ ] Origin/destination destekleniyor.
- [ ] Multiple stops destekleniyor.
- [ ] ORS Matrix çalışıyor.
- [ ] ORS Optimization çalışıyor.
- [ ] Kullanıcı isterse stop order korunuyor.

### Route Scoring

- [ ] Fastest rota hesaplanıyor.
- [ ] Shortest rota hesaplanıyor.
- [ ] Cheapest rota hesaplanıyor.
- [ ] Balanced rota hesaplanıyor.
- [ ] Rotalar normalize edilmiş response olarak dönüyor.

### Parking

- [ ] Overpass üzerinden parking aranabiliyor.
- [ ] Radius destekleniyor.
- [ ] OSM alanları normalize ediliyor.
- [ ] Eksik OSM verileri null kalıyor.
- [ ] Gerçek zamanlı occupancy uydurulmuyor.

### Cache

- [ ] Redis cache çalışıyor.
- [ ] Geocoding cache ediliyor.
- [ ] Parking cache ediliyor.
- [ ] Uygun route/matrix sonuçları cache ediliyor.
- [ ] Cache TTL değerleri tanımlı.

### Database

- [ ] PostgreSQL çalışıyor.
- [ ] PostGIS aktif.
- [ ] Spatial veri modeli gerektiği şekilde hazırlanmış.

### Security

- [ ] API key'ler frontend'e gitmiyor.
- [ ] API key'ler Git'e commit edilmiyor.
- [ ] API key'ler loglanmıyor.
- [ ] Rate limiting uygulanıyor.

### Resilience

- [ ] External API timeout mevcut.
- [ ] Retry kontrollü.
- [ ] 429 düzgün ele alınıyor.
- [ ] Provider unavailable durumunda kullanıcıya anlaşılır hata dönüyor.
- [ ] Global exception handling korunuyor.

### Mobile

- [ ] Rota sonuçları Türkçe gösteriliyor.
- [ ] Alternatif rotalar gösteriliyor.
- [ ] Duraklar haritada gösteriliyor.
- [ ] Seçilen rota görsel olarak belirgin.
- [ ] Navigation handoff çalışıyor.
- [ ] API key mobile bundle içine girmiyor.

---

# 38. Vibe Coding Uygulama Talimatı

Bu dokümanı uygularken önce mevcut projeyi analiz et.

**Önce mevcut kodu oku, sonra değiştir.**

Aşağıdaki adımlar izlenmeli:

1. Mevcut backend mimarisini analiz et.
2. Mevcut route, location, map, user preference ve cache kodlarını bul.
3. Mevcut endpoint'leri gereksiz yere kırma.
4. Mevcut frontend-backend contract'larını mümkün olduğunca koru.
5. Eksik olan API abstraction katmanlarını oluştur.
6. ORS'yi routing provider olarak entegre et.
7. Geoapify'yi geocoding provider olarak entegre et.
8. Overpass'ı parking provider olarak entegre et.
9. API key configuration'larını environment variable yap.
10. Redis cache'i uygun external API sonuçlarına uygula.
11. PostgreSQL + PostGIS desteğini ekle veya mevcutsa doğrula.
12. Route scoring engine'i oluştur.
13. Fastest / Shortest / Cheapest / Balanced seçeneklerini destekle.
14. Stop order preservation desteği ekle.
15. ORS Matrix ve Optimization'ı gerekli yerlerde kullan.
16. External API response'larını internal DTO'lara map et.
17. Provider abstraction kullan.
18. Error handling, timeout, retry ve rate limiting uygula.
19. Mobil uygulamadaki route flow'u yeni backend contract'ına adapte et.
20. Mevcut Türkçe UI yaklaşımını koru ve yeni tüm kullanıcı mesajlarını Türkçe yap.
21. Unit ve integration testleri ekle.
22. Build/test çalıştır.
23. Çalışmayan yerleri düzelt.
24. Son durumda değiştirilen dosyaları ve yapılan işlemleri özetle.

## Çok önemli

Mevcut çalışan özellikleri gereksiz yere silme veya yeniden yazma.

Yeni API entegrasyonları mevcut sisteme **incremental** olarak eklenmeli.

Bir özellik zaten düzgün çalışıyorsa sırf yeni mimariye uydurmak için gereksiz refactor yapılmamalı.

API sağlayıcılarına ait özel response modellerini application katmanına yayma.

Frontend'i external API'lere doğrudan bağlama.

Gerçek API key'leri oluşturma veya tahmin etme. Placeholder değerleri kullan.

API dokümantasyonunda belirtilmeyen bir özelliği varmış gibi varsayma.

External API'nin sağlayamadığı veriyi frontend'de uydurma.

Özellikle gerçek zamanlı trafik veya gerçek zamanlı parking occupancy verisi mevcut değilse bu bilgileri varmış gibi gösterme.

---

# 39. API Key Placeholder Alanları

Aşağıdaki alanlar geliştirici tarafından doldurulacaktır:

```text
OPENROUTESERVICE API KEY:
YOUR_ORS_API_KEY_HERE

GEOAPIFY API KEY:
YOUR_GEOAPIFY_API_KEY_HERE
```

Overpass public endpoint için API key gerekmiyorsa key oluşturulmaya çalışılmamalıdır.

---

# 40. Son Hedef

Sistem aşağıdaki kullanıcı senaryosunu uçtan uca desteklemelidir:

```text
Kullanıcı uygulamayı açar
        ↓
Mevcut GPS konumu alınır
        ↓
Hedef seçilir
        ↓
Duraklar eklenir
        ↓
Adresler Geoapify ile koordinata çevrilir
        ↓
Gerekirse hedef çevresindeki otoparklar Overpass ile bulunur
        ↓
ORS Matrix / Optimization kullanılır
        ↓
Multi-stop rotalar hesaplanır
        ↓
Route scoring uygulanır
        ↓
Fastest / Shortest / Cheapest / Balanced
alternatifleri oluşturulur
        ↓
Redis ile uygun sonuçlar cache edilir
        ↓
Backend normalize edilmiş route DTO döner
        ↓
React Native rotaları haritada gösterir
        ↓
Kullanıcı bir rota seçer
        ↓
Apple Maps / Google Maps ile navigation başlatılır
```

Bu mimarinin temel prensibi:

> **External API'ler veri sağlar, Spring Boot backend karar verir, mobil uygulama sonucu sunar.**

Bu prensip korunmalıdır.
