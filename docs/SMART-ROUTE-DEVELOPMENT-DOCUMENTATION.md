# Smart-Route Development Documentation

**Versiyon:** 2.0 — Kod Doğrulamalı
**Kaynak:** `github.com/burakcnaksy0/SmartRoute` (`develop` branch) + el yazısı notlu 6 ekran görüntüsü
**Durum:** ✅ Backend (Spring Boot) + Mobile (Expo/React Native) kaynak kodu incelendi. Aşağıdaki her requirement gerçek dosya/satır referansıyla doğrulanmıştır.

---

## 0. Önce En Önemli Bulgu — Doğrudan Söylenmesi Gereken

Ekran görüntülerindeki annotation'ların bir kısmı **`develop` branch'inde artık geçersiz** — kod, notların alındığı UI'dan daha ileri bir noktada. Bunu görmezden gelip "her şeyi baştan yaz" tarzı bir doküman üretmek zaman kaybettirir; onun yerine gerçek durumu raporluyorum:

- **Zaten çözülmüş görünenler:** Mevcut konum gösterimi, başlangıç/hedef marker ayrışması, hedef konumun haritaya yansıması, otomatik reverse-geocoding, routing/geocoding/parking için dış servis entegrasyonları (Open Route Service, Geoapify, Overpass) — **kaynak dokümanın "gelecekte eklenebilir" dediği 3 madde zaten backend'de yazılmış.**
- **Gerçek, doğrulanmış bir bug buldum:** `ROUTE-007` — optimize akışında hedef konum, backend'e "sabit bitiş noktası" olarak değil, sıradan bir durak olarak gönderiliyor. Optimizasyon motoru (`OptimizationEngine.java`) tüm durakları homojen bir TSP problemi olarak çözüyor ve hedefi son sırada tutacağını garanti eden hiçbir mekanizma yok. Yani optimize edilmiş rotada **hedef konum ortada bir durak olarak çıkabilir.** Bu, kullanıcının "başlangıçtan hedefe, aradaki duraklara göre" notuyla birebir örtüşen, kod seviyesinde teyit edilmiş bir mimari eksik. Detay: ROUTE-007.
- **Gerçekten eksik olanlar (kod yok):** "Önerilenler" bölümü hâlâ component içinde hardcoded (`new-stop.tsx` satır 185-189), kullanıcı özel konum ismi atayamıyor (yalnızca otomatik reverse-geocode var), favori/kayıtlı konum özelliği hiç yok, hata mesajları merkezi bir Türkçe mapping katmanından geçmiyor (axios'un ham `"timeout of 10000ms exceeded"` mesajı direkt UI'a sızıyor — ekran görüntüsündeki hata tam olarak bunun kanıtı).

Aşağıdaki dokümanda her requirement **Kod Durumu** etiketiyle başlıyor: **🔴 Eksik** (yazılması gerekiyor), **🟡 Kısmen Var** (altyapı var, tamamlanmalı/QA gerekiyor), **✅ Mevcut** (zaten var, yalnızca doğrulama/test gerekiyor).

---

## 1. Document Purpose

Bu doküman, Smart-Route mobil uygulamasının "Yolculuk" ve "Durak Ekle" ekranlarında tespit edilen UI/UX problemlerini **gerçek kod tabanına eşleyerek** implement edilebilir teknik requirement'lara dönüştürür.

---

## 2. Project Overview

**Stack (doğrulanmış):**
- **Backend:** Java / Spring Boot (Maven), katmanlı mimari (`controller` → `service` → `repository`/`domain`), Spring Security ile JWT auth.
- **Mobile:** Expo / React Native + TypeScript, `expo-router` (dosya bazlı navigasyon, `app/(tabs)/journey/...`), Zustand (`store/journeyStore.ts` vb.), `axios` tabanlı API client.
- **Harita:** `react-native-maps` (Apple Maps/Google Maps native provider), `expo-location`.
- **Dış servisler (backend'de zaten entegre):** Geoapify (geocoding), Open Route Service (routing), Overpass API/OSM (park yeri + POI), Google Places/Routes (alternatif provider olarak da mevcut).

Alt navigasyon: **Yolculuk, Geçmiş, Araçlar, Ayarlar**.

---

## 3. Existing Architecture (Kod Doğrulamalı)

### 3.1 Backend

```
backend/src/main/java/com/smartroute/
├── controller/
│   ├── JourneyController.java      → /api/v1/journeys (draft, optimize, replan, plans, along-route)
│   ├── LocationController.java     → /api/v1/locations/search, /reverse, /parking/nearby
│   ├── PlacesController.java       → /api/v1/places/search, /reverse-geocode, /{id}/parking-options
│   ├── AuthController.java, VehicleController.java, SettingsController.java, TripExpenseController.java
├── service/
│   ├── journey/
│   │   ├── JourneyPlanningService.java   → createJourneyDraft, optimizeJourney, replanJourney
│   │   ├── OptimizationEngine.java       → TSP/brute-force + nearest-neighbor + 2-opt, time-window kısıtları
│   │   ├── DepartureOptimizerService.java, PreferenceLearningService.java, ExplainabilityService.java
│   ├── places/
│   │   ├── GeocodingProvider.java (arayüz) → GeoapifyGeocodingProvider.java (implementasyon)
│   │   ├── ParkingProvider.java (arayüz)   → OverpassParkingProvider.java (implementasyon)
│   │   ├── PlacesService.java, GooglePlacesProvider.java, OsmPlacesProvider.java
│   ├── routing/
│   │   ├── RoutingProvider.java (arayüz) → OpenRouteServiceProvider.java, OsrmRoutingProvider.java, GoogleRoutesProvider.java
├── dto/  (JourneyRequest, JourneyStopRequest, OptimizeRequest, JourneyResponse, ...)
├── domain/ (Journey, JourneyStop, JourneyPlan, User, Vehicle, ...)
```

> Not: `PreferenceLearningService` ve `ExplainabilityService` isimlerinden, sistemde zaten kullanıcı tercihi öğrenme / rota kararlarını açıklama (mobile'daki `ExplainabilityBadge.tsx` bileşeniyle eşleşiyor) altyapısının var olduğu anlaşılıyor — bu, `STOP-003` (dinamik öneriler) için yeniden kullanılabilecek bir temel olabilir, bkz. STOP-003.

### 3.2 Mobile

```
mobile/app/(tabs)/journey/
├── index.tsx              → Yolculuk ana ekranı (harita + başlangıç/hedef + optimize)
├── new-stop.tsx           → Durak Ekle ekranı
├── stop-detail.tsx, plan-result.tsx, active-journey.tsx, optimizing.tsx,
│   nlp-input.tsx / nlp-confirm.tsx (Günümü Anlat / AI Asistan), preferences.tsx, departure-suggestions.tsx

mobile/src/
├── api/
│   ├── client.ts           → axios instance, timeout: 10000ms, JWT interceptor + refresh-token akışı
│   ├── places.ts           → placesApi.search / reverseGeocode / getNearbyParking
│   ├── journey.ts
├── store/journeyStore.ts   → draftStartLocation, draftDestination, draftStops, createJourney, optimizeJourney
├── components/
│   ├── MapLocationView.tsx         → harita render, current-location pulse marker, marker type: start/stop/destination/current/poi
│   ├── MapLocationPickerModal.tsx  → haritadan konum seçme modalı (arama + dokunma)
│   ├── StopList.tsx                → durak liste öğesi (öncelik rengi, sürükle-bırak sıralama)
```

### 3.3 Backend-Mobile Communication

- `POST /api/v1/journeys` → taslak oluşturma (`JourneyRequest`: `startLat/startLng/startAddressText/plannedDepartureTime/stops[]`).
- `POST /api/v1/journeys/{id}/optimize` → optimizasyon (`OptimizeRequest`: `startLocation{lat,lng}/stops[]/returnToStart/preferences{profileType,avoidTolls,avoidHighways,preserveStopOrder}/vehicleType/vehicleId`).
- **Kritik gözlem:** `OptimizeRequest` ve `JourneyStopRequest` şemalarında **ayrı bir "destination" alanı yok.** Mobile taraf, hedefi `stopsToOptimize` dizisine sıradan bir durak (`priority: 'normal'`) olarak ekleyip gönderiyor (`journey/index.tsx` satır ~269-283, `new-stop.tsx` `handleOptimizeAndBuild`). Bkz. ROUTE-007.

---

## 4. Current State Analysis

Gerçek kodla karşılaştırıldığında 6 görseldeki 13 annotation şu şekilde dağılıyor: **3 madde zaten mimari olarak çözülmüş (QA gerekir), 1 madde kısmi (otomatik var, manuel eksik), 1 madde kod seviyesinde doğrulanmış gerçek bug, 2 madde tamamen eksik (yeni geliştirme gerekir).** Ayrıca kaynak dokümanın "gelecekte eklenebilir" dediği routing/geocoding/parking entegrasyonlarının **üçü de zaten backend'de mevcut.**

---

## 5. Screen-Based Requirements

## 5.1 Yolculuk (Trip Planning) Ana Ekranı — `mobile/app/(tabs)/journey/index.tsx`

---

#### ROUTE-001 — Uygulama Açılışında Mevcut Konum Gösterimi

**Kod Durumu:** 🟡 Kısmen Var — QA/doğrulama gerekir.

**Bulgu:** `MapLocationView.tsx`, `expo-location` ile mevcut konumu alıp (`Location.getCurrentPositionAsync`, satır ~193) sürekli izliyor (`watchPositionAsync`, satır ~222) ve nabız animasyonlu (`pulseAnim`) ayrı bir "current location" marker'ı render ediyor (satır ~388). Ayrıca `markers.length === 0` olduğunda haritayı otomatik kullanıcı konumuna kaydıran bir davranış var (satır ~208-209).

**Risk:** `journey/index.tsx` içinde `userCoords` state'i her zaman dolu bir default değerle başlıyor (`{ latitude: 41.0082, longitude: 28.9784 }` — İstanbul merkezi, satır 48-52) ve `mapMarkers` her zaman en az bir "start_point" marker'ı içeriyor (satır 112-119). Bu durumda `MapLocationView`'daki `markers.length === 0` koşulu **bu ekran için hiçbir zaman tetiklenmeyebilir** — yani harita, GPS konumu gelene kadar İstanbul merkezine sabit kalıyor olabilir, gerçek konuma otomatik kaymıyor olabilir.

**İstenen Davranış:** Ekran açıldığında GPS konumu geldiği an, eğer kullanıcı henüz manuel bir başlangıç konumu seçmemişse (`draftStartLocation` boşsa), harita kamerası otomatik olarak gerçek konuma kaymalı — statik İstanbul fallback'inde kalmamalı.

**Önerilen Teknik Çözüm:** `journey/index.tsx` içinde, `handleLocationChange` zaten `draftStartLocation` yoksa `userCoords`'u güncelliyor (satır 90-105) — ancak bu callback yalnızca `MapLocationView`'ın `onLocationChange` prop'u tetiklendiğinde çalışıyor. GPS ilk konum geldiğinde kameranın da bu noktaya `animateToRegion` ile kaymasını garanti eden bir bağlantı `MapLocationView` ↔ `onLocationChange` arasında netleştirilmeli.

**Acceptance Criteria:**
- [ ] Uygulama açılışında, `draftStartLocation` boşken, harita 2 saniye içinde gerçek GPS konumuna kayıyor (İstanbul fallback'inde takılı kalmıyor).
- [ ] Konum izni reddedildiğinde fallback (İstanbul merkezi) davranışı korunuyor, çökme yok.

**Priority:** P2 — Medium (mimari var, QA + küçük düzeltme)
**Complexity:** Low

---

#### ROUTE-002 — Başlangıç Konumu ve Mevcut Konumun Görsel Ayrışması

**Kod Durumu:** ✅ Mevcut — QA gerekir.

**Bulgu:** `MapLocationView`'da marker tipi zaten `'start' | 'stop' | 'destination' | 'current' | 'poi'` olarak ayrıştırılmış (satır 33) ve mevcut konum, `markers` prop'undan **bağımsız**, kendi `currentLocation` state'inden ayrı bir pulse-animasyonlu marker olarak çiziliyor (satır 388). `journey/index.tsx` da başlangıç noktasını `type: 'start'` ile ayrı bir marker olarak `mapMarkers`'a ekliyor (satır 112-119). Yani başlangıç ≠ mevcut konum olduğunda **iki farklı marker zaten aynı anda görünür** durumda.

**Kalan İş:** Bu yalnızca görsel/renk QA'sı — iki marker'ın stil olarak (renk/ikon) yeterince ayırt edilebilir olup olmadığının cihazda test edilmesi. Kod değişikliği muhtemelen gerekmiyor, tasarım/renk kontrastı doğrulaması gerekiyor.

**Acceptance Criteria:**
- [ ] Başlangıç konumu mevcut konumdan farklı seçildiğinde, cihazda iki marker görsel olarak net ayrışıyor (renk/ikon kontrastı yeterli).

**Priority:** P3 — Low (QA only)
**Complexity:** Low

---

#### ROUTE-003 — Hedef Konumun Haritada Anlık Yansıması

**Kod Durumu:** ✅ Mevcut — QA gerekir. (Ekran görüntüsündeki sorun muhtemelen daha eski bir build'e ait.)

**Bulgu:** `mapMarkers` (satır 108-149) bir `useMemo` ile `draftDestination`'a bağımlı — `draftDestination` set edildiğinde hedef marker otomatik listeye ekleniyor (satır 137-146) ve bu liste `MapLocationView`'a `markers={mapMarkers}` olarak reaktif geçiliyor (satır 388 civarı render). React'in state → prop → render zincirinde bu senkronizasyon **mimari olarak zaten var.**

**Kalan İş:** Kullanıcının orijinal notu ("bu sayfa projenin en önemli sayfası, hedef harita da gözükmeli") muhtemelen daha eski bir ekran versiyonuna ait. Yine de bu ekranın **en kritik akış** olması nedeniyle, gerçek cihazda/simülatörde manuel regresyon testi yapılması şiddetle önerilir — özellikle `MapLocationPickerModal`'dan seçim sonrası (`handlePickerSelect`, satır 168-204) dönüşte marker'ın gerçekten anlık göründüğünün doğrulanması.

**Acceptance Criteria:**
- [ ] Hedef, arama kutusundan seçildiğinde 500ms içinde haritada görünüyor (regresyon testi).
- [ ] Hedef, haritadan (`MapLocationPickerModal`, mod: `destination`) seçildiğinde ana ekran haritasına dönüldüğünde marker görünüyor (regresyon testi).

**Priority:** P1 — High (kritik akış olduğu için doğrulama önceliği yüksek, ama muhtemelen kod değişikliği gerekmiyor)
**Complexity:** Low (QA)

---

#### ROUTE-004 — Başlangıç/Hedef Konuma Kullanıcı Tanımlı İsim Atama

**Kod Durumu:** 🟡 Kısmen Var — **Otomatik (reverse-geocode) var, manuel/özel isimlendirme 🔴 eksik.**

**Bulgu:**
- ✅ Otomatik adres çözümleme zaten çalışıyor: backend `GeocodingProvider` → `GeoapifyGeocodingProvider` → `GET /locations/reverse`; mobile `placesApi.reverseGeocode()` (`mobile/src/api/places.ts` satır 50-63) hem `journey/index.tsx` (`handleLocationChange`, satır 90-105) hem `new-stop.tsx` (`requestGPSLocation`, satır 56-79) içinde çağrılıyor. Yani ham koordinat yerine adres gösterimi büyük ölçüde çözülmüş.
- 🔴 **Kullanıcının kendi özel ismini girebileceği bir alan yok.** `MapLocationPickerModal.tsx`'te `handleConfirm` (satır 280-288), `placeName`'i yalnızca arama sonucundan veya reverse-geocode'dan alıyor (`selectedPlaceName || 'Seçilen Konum'`) — serbest metin isim girişi için `TextInput` yok.

**İstenen Değişiklik:** `MapLocationPickerModal`'a, konum onaylanmadan önce opsiyonel bir "Bu konuma isim ver (opsiyonel)" `TextInput` alanı eklenmeli. Kullanıcı isim girerse `handleConfirm`'de `placeName` bu değeri kullanmalı; girmezse mevcut reverse-geocode/arama sonucu fallback olarak kalmalı.

**Backend Etkisi:** Şu an yok — isim yalnızca client-side state'te (`draftStartLocation.address`, `draftDestination.address`, `StopListItem.placeName`) tutuluyor ve journey oluşturulurken `JourneyStopRequest.placeName` ile backend'e gidiyor. Kalıcı "favori/etiketli konum" istenirse bu FUT-001 kapsamına girer (backend'de hiç yok).

**Acceptance Criteria:**
- [ ] `MapLocationPickerModal`'da onay ekranında opsiyonel isim girişi var.
- [ ] Kullanıcı isim girerse bu isim `placeName` olarak kullanılıyor; boş bırakılırsa mevcut reverse-geocode/arama-sonucu davranışı değişmiyor.

**Priority:** P2 — Medium
**Complexity:** Low (UI eklemesi; backend'e dokunmuyor)
**Dependency:** STOP-001 ile birebir aynı bileşen (`MapLocationPickerModal`) üzerinden çözülür — **iki ayrı requirement değil, tek implementasyon.**

---

#### ROUTE-005 — Durak Listesi Görünümü

**Kod Durumu:** ✅ Mevcut, muhtemelen zaten düzeltilmiş.

**Bulgu:** `journey/index.tsx` içindeki "EKLENEN DURAKLAR" listesi (satır 518-550) standart bir liste şablonu kullanıyor: sıra numarası rozeti + `placeName` (koordinat değil) + `visitDurationMinutes`/`priority` alt bilgisi + silme butonu. Ayrıca `new-stop.tsx`'te `StopList.tsx` bileşeni kullanılıyor — sürükle-bırak sıralama, öncelik renk kodlaması, zaman penceresi riski göstergesi gibi zaten olgun bir UI var.

**Kalan İş:** Ekran görüntüsündeki "bardaki gibi" bozukluk görünmüyor; muhtemelen eski bir build'e ait. Yine de gerçek cihazda uzun `placeName` değerleriyle (örn. uzun adres) taşma testi önerilir.

**Acceptance Criteria:**
- [ ] Uzun `placeName` (>40 karakter) değeriyle liste öğesi taşmıyor (regresyon testi).

**Priority:** P3 — Low (QA)
**Complexity:** Low

---

#### ROUTE-006 — "Günümü Anlat (AI Asistan)" Kartının Konumu

**Kod Durumu:** 🟡 Kısmen İyileştirilmiş, tartışmalı.

**Bulgu:** Kart artık ekranın tam ortasında değil; "Action Pills" (Durak Ekle / Haritadan Durak / Tercihler) ile "Son Aramalar" arasında, akışın alt kısmına doğru konumlanmış (satır 583-599, `router.push('/(tabs)/journey/nlp-input')`). Kaynak nottaki "ortada mantıksız duruyor" eleştirisi kısmen giderilmiş ama kart hâlâ ana scroll akışının **içinde**, ayrı bir sekme/kısayol değil.

**Açık Karar (Bölüm 9'daki çakışmayla aynı):** Kartı olduğu gibi bırakmak (mevcut, kabul edilebilir konum) mı, yoksa kompakt bir kısayola indirgemek mi — ürün kararı gerektiriyor. **Öneri:** Mevcut konum zaten kaynak nottaki itirazı büyük ölçüde gideriyor; ek işçilik önceliği düşük.

**Priority:** P3 — Low
**Complexity:** Low (gerekirse)

---

#### ROUTE-007 — "Yolculuğu Optimize Et": Hedef Konumun Sabit Bitiş Noktası Olmaması (Doğrulanmış Bug)

**Kod Durumu:** 🔴 **Gerçek, kod seviyesinde doğrulanmış mimari eksik.**

**Kanıt Zinciri:**
1. `journey/index.tsx`, `handleOptimizeNow` (satır 252-321): hedef konum, `stopsToOptimize` dizisine `priority: 'normal'` ile sıradan bir durak olarak ekleniyor (satır 275-282). `new-stop.tsx`'teki `handleOptimizeAndBuild` da benzer şekilde yalnızca `draftStops`'u gönderiyor — hedef kavramı backend'e hiç taşınmıyor.
2. `OptimizeRequest.java` DTO'sunda `startLocation` ve `stops[]` var ama **ayrı bir `destination` alanı yok** — backend'in "bu bir waypoint mi, yoksa zorunlu bitiş noktası mı" bilgisini alacağı bir yer yok.
3. `OptimizationEngine.java`, durakları `bruteForce`/`nearestNeighborWith2Opt` (satır 78, 81) ile bir TSP/zaman-penceresi problemi olarak çözüyor; `returnToStart` flag'i dışında (satır 516) hiçbir durağı "sabit son nokta" olarak işaretleyen bir mekanizma yok.

**Sonuç:** Kullanıcı 3 durak + 1 hedef eklediğinde, optimizasyon motoru zaman penceresi/mesafe optimum olduğu için hedefi **rotanın ortasına** yerleştirebilir. Bu, tam olarak kullanıcının el yazısı notundaki "başlangıçtan hedefe, aradaki duraklara göre rota oluşturulmalı" beklentisiyle çelişen, gerçek bir davranış hatasıdır.

**İstenen Düzeltme:**
- **Backend:** `OptimizeRequest`'e ayrı bir `destination: GeoPointDto` (veya `JourneyStopRequest` üzerinde `isFixedEndpoint: boolean` alanı) eklenmeli. `OptimizationEngine`, bu noktayı optimize edilebilir durak havuzundan çıkarıp **her zaman son sırada** sabitlemeli (nearest-neighbor/2-opt/brute-force algoritmalarının hepsinde).
- **Mobile:** `handleOptimizeNow` ve `handleOptimizeAndBuild`, hedefi artık `stops[]` dizisine eklemek yerine yeni `destination` alanına göndermeli.

```json
// Önerilen yeni OptimizeRequest şeması (mevcut alanlara ek)
{
  "startLocation": { "lat": 40.7946, "lng": 29.4366 },
  "destination": { "lat": 40.7990, "lng": 29.4366 },
  "stops": [ /* sadece gerçek ara duraklar, hedef DAHİL DEĞİL */ ],
  "returnToStart": false,
  "preferences": { "profileType": "fast", "avoidTolls": false, "avoidHighways": false }
}
```

**Edge Cases:**
- `destination` gönderilmezse (yalnızca `stops` varsa) mevcut davranış (geriye dönük uyumluluk) korunmalı.
- `returnToStart = true` ve `destination` aynı anda gönderilirse — bu iki parametre çelişir (biri "başlangıca dön", diğeri "sabit hedefe git"), backend bu kombinasyonu 400 ile reddetmeli.

**Acceptance Criteria:**
- [ ] `destination` alanı gönderildiğinde, optimize edilmiş plandaki son durak her zaman `destination` ile eşleşiyor (algoritma kaç ara durak olursa olsun).
- [ ] `destination` + `returnToStart=true` kombinasyonu backend'de anlamlı bir 400 hatası döndürüyor.
- [ ] Mobile, hedefi artık `stops[]` içine sızdırmıyor.

**Priority:** P0 — Critical
**Complexity:** Medium (DTO + algoritma + 2 mobile ekran güncellemesi)
**Etkilenen Dosyalar:** `OptimizeRequest.java`, `OptimizationEngine.java`, `JourneyPlanningService.java`, `journey/index.tsx`, `journey/new-stop.tsx`

---

## 5.2 Durak Ekle (Add Stop) Ekranı — `mobile/app/(tabs)/journey/new-stop.tsx`

---

#### STOP-001 — Haritadan Seçilen Durağa İsim Atama

**Kod Durumu:** 🟡 Kısmen Var — ROUTE-004 ile birebir aynı gap, aynı çözüm.

Bkz. ROUTE-004. `MapLocationPickerModal.tsx` her iki ekran tarafından da kullanılıyor (`pickerMode: 'start' | 'destination' | 'stop'`), dolayısıyla tek bir implementasyon (opsiyonel isim `TextInput`'u) her iki ekranı da çözer.

**Priority:** P2 — Medium
**Complexity:** Low
**Dependency:** ROUTE-004 (aynı bileşen, birleştirilmiş implementasyon)

---

#### STOP-002 — Manuel Adres Girişi (Regresyon Koruması)

**Kod Durumu:** ✅ Mevcut. `new-stop.tsx` arama kutusu (`searchQuery` → `placesApi.search`, satır 86-107) zaten çalışıyor ve `PlacesController`/`LocationController` üzerinden Geoapify'a bağlı. Yeni geliştirme gerekmiyor, yalnızca ROUTE-004/STOP-001 değişikliklerinin bu akışı bozmadığından emin olunmalı.

**Priority:** P3 — Low
**Complexity:** Low

---

#### STOP-003 — "Önerilenler" Bölümünün Dinamikleştirilmesi

**Kod Durumu:** 🔴 **Eksik — kod seviyesinde doğrulandı.**

**Bulgu:** `new-stop.tsx` satır 185-189:
```ts
const suggestedPlaces = [
  { title: 'Starbucks Reserve', type: 'Kahve & Mola', lat: 40.978, lng: 29.034, icon: 'local-cafe' },
  { title: 'Marmaray Ayrılık Çeşmesi', type: 'Toplu Taşıma', lat: 41.001, lng: 29.031, icon: 'train' },
  { title: 'Fenerbahçe Parkı', type: 'Açık Alan', lat: 40.969, lng: 29.038, icon: 'park' },
];
```
Bu dizi component içinde **sabit kodlanmış** — tam olarak ekran görüntüsündeki üç öğeyle birebir aynı. Backend'de bu veriyi üretecek bir `/recommendations` (veya benzeri) endpoint'i **yok** (`PlacesController`, `LocationController` içinde arandı, bulunamadı).

**Kullanılabilir Mevcut Altyapı (yeniden kullanılmalı, sıfırdan yazılmamalı):**
- `OverpassParkingProvider` / `service/places` katmanı → çevredeki POI verisi çekmek için zaten bir Overpass entegrasyonu var (şu an yalnızca otopark için kullanılıyor, POI kategorileri için genişletilebilir).
- `JourneyController.getAlongRoutePoi` (`GET /api/v1/journeys/{id}/along-route?category=...`) → rota üzerindeki POI'leri döndüren, kavramsal olarak çok yakın bir endpoint zaten var; muhtemelen bu servis genişletilerek "konum çevresi öneri" ihtiyacına da cevap verebilir.
- `PreferenceLearningService` → kullanıcı tercihi öğrenme altyapısı zaten mevcut; kişiselleştirilmiş öneri sıralaması için bu servisten faydalanılmalı, sıfırdan bir "AI model" entegrasyonuna gerek kalmayabilir.

**İstenen Değişiklik:** `suggestedPlaces` sabit dizisi kaldırılıp, kullanıcının mevcut konumuna (ve varsa geçmiş konumlarına — bkz. FUT-001) göre öneri döndüren bir endpoint'e bağlanmalı.

```json
// Önerilen: GET /api/v1/places/recommendations?lat=40.9909&lng=29.0303
{
  "recommendations": [
    { "name": "Moda Sahili", "category": "Açık Alan", "lat": 40.98, "lng": 29.02 }
  ]
}
```

> ⚠️ **Açık Karar:** "Kullanıcı geçmişine göre kişiselleştirme" katmanı, `PreferenceLearningService`'in mevcut kapasitesine mi dayanacak yoksa yeni bir servis mi olacak — implementasyon öncesi `PreferenceLearningService.java` içeriği detaylı incelenerek karar verilmeli (bu doküman kapsamında yalnızca varlığı tespit edildi, iç mantığı incelenmedi).

**Edge Cases:**
- Konum izni yoksa / geçmiş veri yoksa: mevcut sabit liste **fallback olarak** kalabilir (tamamen kaldırılmasın, boş ekran daha kötü).
- Overpass/POI servisi hata verirse STOP-004/SYS-002 kapsamındaki standart hata mesajı kullanılmalı.

**Acceptance Criteria:**
- [ ] `suggestedPlaces` artık component içinde sabit değil, API'den geliyor.
- [ ] Konum/geçmiş veri yokken sistem boş ekran yerine anlamlı bir fallback gösteriyor.

**Priority:** P2 — Medium
**Complexity:** High (yeni endpoint + kişiselleştirme kararı)
**Dependency:** FUT-001 (kullanıcı geçmişi varsa daha iyi kişiselleştirme), mevcut `OverpassParkingProvider`/`getAlongRoutePoi` altyapısının POI-öneri amacıyla genişletilmesi

---

#### STOP-004 — API Timeout Hatasının Kullanıcı Dostu Hale Getirilmesi

**Kod Durumu:** 🔴 **Kök neden kod seviyesinde bulundu.**

**Bulgu:** `mobile/src/api/client.ts` satır 37: `timeout: 10000` — ekran görüntüsündeki `timeout of 10000ms exceeded` mesajı, axios'un **kendi ham İngilizce hata metni.** `client.ts`'deki response interceptor (satır 69-133) yalnızca 401/token-refresh senaryosunu ele alıyor; genel network/timeout hataları için **hiçbir mesaj dönüştürme/normalizasyon katmanı yok.** Hata, `e?.message` olarak doğrudan `Alert.alert(...)`'e taşınıyor (örn. `journey/index.tsx` satır 319: `Alert.alert('Bağlantı Hatası', e?.message || ...)`).

**İstenen Değişiklik:** `client.ts`'deki response interceptor'a, hata Türkçe'ye çevrilmiş bir mesaj mapping'i eklenmeli:

```ts
// client.ts response interceptor içine eklenecek mantık (özet)
if (error.code === 'ECONNABORTED') {
  error.userMessage = 'Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.';
} else if (!error.response) {
  error.userMessage = 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.';
} else if (error.response.status >= 500) {
  error.userMessage = 'Sunucuda geçici bir sorun oluştu. Lütfen tekrar deneyin.';
}
```

UI tarafında (`Alert.alert`, `errorBox` gösterimleri) artık `e?.message` yerine `e?.userMessage || GENEL_HATA_MESAJI` kullanılmalı.

**Acceptance Criteria:**
- [ ] Timeout senaryosunda kullanıcı artık `timeout of 10000ms exceeded` değil, Türkçe bir mesaj görüyor.
- [ ] Network kopukluğu, 4xx, 5xx senaryoları için ayrı ayrı anlamlı Türkçe mesajlar tanımlı.
- [ ] Değişiklik `client.ts`'de merkezi olarak yapıldığı için her ekranda ayrı ayrı tekrarlanmıyor.

**Priority:** P1 — High
**Complexity:** Low
**Etkilenen Dosya:** `mobile/src/api/client.ts` (merkezi düzeltme, tüm ekranları kapsar)

---

## 6. System-Wide (Cross-Cutting) Requirements

#### SYS-001 — Katmanlar Arası Senkronizasyon ve Bağlantı Güvenilirliği

**Kod Durumu:** 🟡 Kısmen Var. JWT refresh-token akışı zaten sağlam (`client.ts` satır 54-133 — kuyruğa alma/`isRefreshing` kilidi dahil, iyi yazılmış). Eksik olan, network/timeout/5xx senaryoları için genel bir dayanıklılık katmanı (retry/backoff) — şu an yalnızca 401 için retry var.

**İstenen Ek:** Dış servis çağrılarında (routing/geocoding/POI, backend'in kendi `RoutingProvider`/`GeocodingProvider` client'ları) transient hatalar için backend tarafında retry/circuit-breaker; mobile tarafında STOP-004'teki mesaj katmanına ek olarak genel bir "tekrar dene" UX'i.

**Priority:** P1 — High
**Complexity:** Medium
**Dependency:** STOP-004

---

#### SYS-002 — Standart, Türkçe ve Net Hata/Uyarı/Bilgi Mesajları

**Kod Durumu:** 🔴 Eksik — merkezi bir mesaj katmanı yok (bkz. STOP-004 kök neden analizi). Bu requirement, STOP-004'ün kapsamının **tüm ekranlara genelleştirilmiş** hâlidir: `client.ts`'e eklenecek `userMessage` mantığı, yalnızca "Durak Ekle" ekranını değil `journey/index.tsx`, `new-stop.tsx`, `stop-detail.tsx` vb. tüm ekranlardaki `Alert.alert`/`errorBox` kullanımlarını kapsamalı.

**Acceptance Criteria:**
- [ ] Uygulama genelinde hiçbir ekranda ham axios/JS hata mesajı kullanıcıya gösterilmiyor.

**Priority:** P1 — High
**Complexity:** Medium
**Dependency:** STOP-004 (aynı kök çözüm, kapsam genişletilmiş hâli)

---

## 7. Backend Requirements & API Contract Changes (Özet)

| Requirement | Endpoint | Durum |
|---|---|---|
| ROUTE-007 | `OptimizeRequest`'e `destination` alanı + `OptimizationEngine` sabit-bitiş desteği | 🔴 Değişiklik gerekli |
| ROUTE-004 / STOP-001 | Manuel isim — backend değişikliği gerekmiyor (client-side) | 🟡 |
| STOP-003 | `GET /api/v1/places/recommendations` (yeni) veya `getAlongRoutePoi`'nin genişletilmesi | 🔴 Yeni |
| FUT-001 | Favori/kayıtlı konum CRUD (yeni entity + endpoint) | 🔴 Yeni |
| ~~FUT-002~~ Routing (OSM) | `OpenRouteServiceProvider.java` | ✅ Zaten var |
| ~~FUT-003~~ Geocoding | `GeoapifyGeocodingProvider.java` | ✅ Zaten var |
| ~~FUT-004~~ Park yeri/POI | `OverpassParkingProvider.java` | ✅ Zaten var |

---

## 8. Dependency Analysis

```text
ROUTE-007 (destination fix — P0, gerçek bug)
    ↓ bağımsız, hemen başlanabilir

ROUTE-004 / STOP-001 (manuel isim — tek implementasyon, MapLocationPickerModal)
    ↓
ROUTE-005 (liste görünümü — zaten büyük ölçüde çözülmüş, QA)

STOP-003 (dinamik öneriler)
    ↓ bağımlı
FUT-001 (favori/geçmiş konum) + getAlongRoutePoi/OverpassParkingProvider'ın genişletilmesi
    ↓ opsiyonel derinleştirme
PreferenceLearningService entegrasyonu (kişiselleştirme)

STOP-004 (timeout mesajı, client.ts) ──→ SYS-002 (tüm ekranlara genelleştirme) ──→ SYS-001 (retry/backoff)
```

---

## 9. Conflict Detection

### Conflict — ROUTE-006: "Günümü Anlat" Kartının Konumu

Kaynak not iki çözüm öneriyor (ayrı tab / aynı ekranda farklı yer); kod incelemesi gösteriyor ki **kart zaten kısmen taşınmış** (artık ortada değil, action pills altında). Kalan soru yalnızca "bu yeterli mi, yoksa tamamen ayrı bir kısayola mı indirilsin" — düşük öncelikli, ürün sahibiyle 5 dakikalık bir karar toplantısıyla kapanabilir. **Kodlamaya başlamadan önce yeniden açmaya değmez.**

### Duplicate — ROUTE-004 vs STOP-001

Doğrulandı: her ikisi de `MapLocationPickerModal.tsx` üzerinden çözülüyor. **Tek PR, iki requirement ID kapanır.**

---

## 10. Priority Matrix (Revize)

| ID | Başlık | Kod Durumu | Priority | Complexity |
|---|---|---|---|---|
| ROUTE-007 | Hedef = sabit bitiş noktası (gerçek bug) | 🔴 | **P0** | Medium |
| STOP-004 / SYS-002 | Türkçe hata mesajı katmanı | 🔴 | P1 | Low-Medium |
| SYS-001 | Retry/dayanıklılık | 🟡 | P1 | Medium |
| ROUTE-003 | Hedef harita senkronizasyonu | ✅ | P1 (QA) | Low |
| ROUTE-004 / STOP-001 | Manuel isim atama | 🟡 | P2 | Low |
| STOP-003 | Dinamik öneriler | 🔴 | P2 | High |
| ROUTE-001 | Açılışta mevcut konum kayması | 🟡 | P2 | Low |
| ROUTE-002 | Görsel ayrışma | ✅ | P3 (QA) | Low |
| ROUTE-005 | Liste görünümü | ✅ | P3 (QA) | Low |
| ROUTE-006 | AI Asistan kartı | 🟡 | P3 | Low |
| STOP-002 | Manuel adres (koruma) | ✅ | P3 | Low |
| FUT-001 | Favori konum | 🔴 | P3 | Medium |

---

## 11. Implementation Roadmap

```md
## Phase 1 — Critical Fix (P0) — hemen başla
- ROUTE-007 (destination fix: DTO + OptimizationEngine + 2 mobile ekran)

## Phase 2 — Güvenilirlik (P1)
- STOP-004 / SYS-002 (client.ts merkezi Türkçe hata katmanı)
- SYS-001 (retry/backoff)
- ROUTE-003 (regresyon QA — kritik akış)

## Phase 3 — Ürün Geliştirme (P2)
- ROUTE-004 / STOP-001 (MapLocationPickerModal'a isim alanı)
- STOP-003 (dinamik öneriler endpoint'i + PreferenceLearningService entegrasyon kararı)
- ROUTE-001 (açılış konum kayması düzeltmesi)

## Phase 4 — Polish / QA (P3)
- ROUTE-002, ROUTE-005 (regresyon testleri)
- ROUTE-006 (karar + gerekirse küçük taşıma)
- FUT-001 (favori konum — yeni özellik)
```

---

## 12. Future Improvements / Backlog

### FUT-001 — Konum Kaydetme (Favori Adresler)

**Kod Durumu:** 🔴 Doğrulandı — `domain/`, `repository/` içinde `favorite`/`saved location` ile ilgili hiçbir entity/repository yok.

**Teknik Gereksinimler:** Yeni `SavedLocation` entity (`userId`, `label`, `lat`, `lng`, opsiyonel `category`), `SavedLocationRepository`, CRUD endpoint seti (`/api/v1/locations/saved`). Mobile'da `new-stop.tsx`'e "Kaydedilenler" bölümü.

**Complexity:** Medium
**Priority:** Low
**Önerilen Faz:** Phase 4
**Not:** STOP-003'ün kalitesini doğrudan etkiler — kişiselleştirilmiş öneri için en güçlü sinyal kullanıcının kendi kaydettiği/gittiği yerlerdir.

---

## 13. Technical Assumptions (Kalan — Kod İncelemesiyle Kapatılamayanlar)

1. **STOP-003:** "Yapay zeka modeli ile inceleme" — `PreferenceLearningService.java`'nın iç mantığı bu doküman kapsamında satır satır incelenmedi; kişiselleştirme kararının bu servise mi yoksa yeni bir bileşene mi dayanacağı implementasyon öncesi netleştirilmeli.
2. **ROUTE-001:** `MapLocationView`'daki `markers.length === 0` kamera-kayma koşulunun `journey/index.tsx` ekranında gerçekten hiç tetiklenmediği bire bir runtime'da doğrulanmadı (statik kod analizinden çıkarım) — cihazda debug ile teyit edilmeli.
3. **ROUTE-007:** `OptimizeRequest`'e yeni alan eklemenin geriye dönük uyumluluğu (`stop-detail.tsx`, `plan-result.tsx` gibi bu DTO'yu tüketen diğer ekranlar) tüm çağıran noktalar taranarak doğrulanmalı — bu doküman yalnızca ana iki ekranı (`index.tsx`, `new-stop.tsx`) inceledi.

---

## 14. Final Implementation Checklist

- [x] Kaynak dokümandaki tüm ekranlar işlendi.
- [x] Tüm 6 screenshot + 13 annotation requirement'a dönüştürüldü.
- [x] **Gerçek kaynak kod (backend + mobile) incelendi, varsayımların yerini kod referansları aldı.**
- [x] Her requirement'a Kod Durumu (🔴/🟡/✅) etiketi eklendi.
- [x] Gerçek, kod-doğrulanmış bir bug tespit edildi ve önceliklendirildi (ROUTE-007).
- [x] Kaynak dokümandaki "gelecekte eklenebilir" 3 maddenin zaten implemente edildiği tespit edildi.
- [x] Priority Matrix, kod durumuna göre revize edildi.
- [x] Implementation Roadmap, gerçek çalışma hacmine göre yeniden sıralandı.
- [ ] **Bekliyor:** `PreferenceLearningService.java` ve `ExplainabilityService.java`'nın satır satır incelenmesi (STOP-003 kararı için), diğer DTO tüketici ekranlarının taranması (ROUTE-007 geriye dönük uyumluluk için).

---

## Sonraki Adım

Bu doküman artık tahmine değil, gerçek koda dayanıyor — doğrudan bir AI coding agent'a veya sana verilip **Phase 1'den (ROUTE-007) başlanabilir.** Tek gerçek risk: `PreferenceLearningService`/`ExplainabilityService` içeriğini görmediğim için STOP-003'ün "sıfırdan mı yazılacak yoksa mevcut altyapı mı genişletilecek" kararı hâlâ açık — istersen bu iki servisi de okuyup STOP-003'ü kesinleştireyim.
