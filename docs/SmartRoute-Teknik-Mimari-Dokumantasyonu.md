# SmartRoute (Journey Optimizer) — Teknik Mimari ve Vibe Coding Dokümantasyonu

**Versiyon:** 1.0
**Doküman Amacı:** Bu doküman, projenin sıfırdan bir yapay zeka destekli kod asistanı (vibe coding) kullanılarak baştan sona inşa edilebilmesi için gereken tüm sistem tasarımı, mimari kararlar, algoritmalar, teknoloji seçimleri, veri modelleri, API tasarımları, edge case'ler ve test senaryolarını içerir. Doküman, geliştirme sürecinde AI'ye verilecek prompt'ların referans kaynağı olacak şekilde tasarlanmıştır.

---

## İçindekiler

1. Vizyon ve Problem Tanımı
2. Ürün Positioning ve Farklılaşma Stratejisi
3. Kullanıcı Segmentleri ve Persona'lar
4. Kapsam Tanımı (MVP → V2 → V3)
5. Yüksek Seviye Sistem Mimarisi
6. Teknoloji Stack'i ve Gerekçeleri
7. Mobil Uygulama Mimarisi (React Native + Expo)
8. Backend Mimarisi (Spring Boot)
9. Veritabanı Şeması
10. API Tasarımı (REST Endpoint'ler)
11. Optimizasyon Motoru — Algoritmalar
12. Google Routes API Entegrasyonu
13. AI / Doğal Dil İşleme Katmanı
14. Departure Time Optimizer
15. Dynamic Replanning (Yeniden Planlama)
16. Explainable Routing
17. Kullanıcı Profili ve Kişiselleştirme
18. Park Yeri Optimizasyonu
19. Route-aware Search (Rota Üzeri Arama)
20. Güvenlik, Gizlilik ve KVKK
21. Performans ve Ölçeklenebilirlik
22. Maliyet Analizi
23. Edge Case Kataloğu
24. Test Stratejisi ve Senaryoları
25. DevOps / CI-CD / Deployment
26. Yol Haritası (Faz 1 → Faz 9)
27. Vibe Coding Uygulama Rehberi (AI'ye Nasıl Prompt Yazılır)

---

## 1. Vizyon ve Problem Tanımı

### 1.1 Çözülen Problem

Klasik navigasyon uygulamaları (Google Maps, Waze, Yandex Maps) şu soruyu cevaplar:

> "A noktasından B noktasına en hızlı/en kısa nasıl giderim?"

Bizim çözdüğümüz problem farklıdır:

> "Bugün yapmam gereken birden fazla işim var (kargo bırakmak, market, randevu vb.), her birinin kendi zaman kısıtı, süresi ve önceliği var; trafik, ücret, yakıt, park ve kişisel tercihlerimi hesaba katarak **tüm günün yolculuğunu** benim için en uygun şekilde planla."

Bu, klasik "nokta-dan-noktaya rota bulma" probleminden çok daha geniş bir **çoklu durak, zaman penceresi kısıtlı, çok amaçlı optimizasyon (multi-objective time-window constrained route optimization)** problemidir.

### 1.2 Neden Google Maps / Waze Yeterli Değil

- Google Maps ve benzerleri **rota hesaplar**, ama kullanıcının "12:00'a kadar kargoyu bırakmalıyım, market 20 dakika sürecek, hastaneye 11:30-12:00 arası varmalıyım" gibi **çoklu, zaman pencereli kısıtlarını** anlayıp tek bir plana dönüştürmez.
- Alternatif rota ve waypoint sıralama özellikleri var, ancak bunlar ham (raw) API seviyesinde kalır; kullanıcıya **"neden bu rota"** diye açıklama yapılmaz, kişisel tercih öğrenilmez, güvenilirlik/olasılık sunulmaz.
- Google Routes API'de "alternative routes" ile "intermediate waypoints" aynı anda istenen şekilde çalışmaz (alternatifler sadece ara nokta olmayan rotalar için dönüyor). Bu bizim için hem bir kısıt hem de **değer katmanı ekleme fırsatıdır** — leg-leg hesaplayıp kendi optimizasyon katmanımızı yazacağız.

### 1.3 Ürünün Özünde Ne Var

Biz bir harita uygulaması **değiliz**. Biz haritanın/rotalama motorunun **üzerine oturan bir "Yolculuk Optimizasyon Katmanı"yız**:

```
                 Google Maps / Routes API
                          │
                 (rota, mesafe, süre, trafik ham verisi)
                          ▼
              ┌───────────────────────┐
              │   SmartRoute Engine    │
              │ (bizim katmanımız)     │
              └───────────────────────┘
                          │
      kullanıcı hedefleri, zaman kısıtları, duraklar,
      park, maliyet, tercihler, risk, geçmiş davranış
                          │
                          ▼
                  Optimal Journey Plan
                          │
                          ▼
              Apple Maps / Google Maps
              (gerçek turn-by-turn navigasyon)
```

Navigasyonun kendisini (turn-by-turn sesli yönlendirme, harita render'ı) **yeniden yazmıyoruz**. Bunun için Apple Maps / Google Maps'e "deep link" ile yönlendiriyoruz. Bizim değerimiz planlama, sıralama, zamanlama ve açıklama katmanında.

---

## 2. Ürün Positioning ve Farklılaşma Stratejisi

| Katman | Google Maps / Waze | SmartRoute |
|---|---|---|
| Tek nokta rotası | ✅ Var, olgun | Kullanılır (üzerine inşa edilir) |
| Alternatif rota | ✅ Var (3 adede kadar) | Kullanılır + kendi skorlamamızla yeniden sıralanır |
| Waypoint sıralama | ✅ Var (TSP, zaman penceresiz) | Zaman pencereli, öncelikli, çok amaçlı optimizasyon |
| Trafik | ✅ Var | Departure time optimizer ile "ne zaman çıkmalıyım" |
| Rota üzeri arama | ✅ Var (search along route) | Kısıtlı sapma + kullanıcı kriterine göre filtreleme |
| Neden bu rota? | ❌ Yok | Explainable routing — gerekçeli öneri |
| Kişiselleştirme | Sınırlı | Kullanıcı sürüş profili öğrenme |
| Deadline bazlı çıkış saati + güven skoru | ❌ Yok | ETA confidence + risk buffer |
| Çoklu durak zaman penceresi optimizasyonu | ❌ Yok (native değil) | Ana özellik |
| Park yeri + toplam süreye dahil etme | ❌ Yok | Var |
| Dinamik yeniden planlama (trafik değişince durak sırası) | ❌ Yok | Var |

**Stratejik karar:** İlk hedef kitle B2C geniş kitle değil, **çok durak yapan, zamanı kısıtlı kullanıcılar** (emlakçılar, saha satış, kurye, serviz teknisyeni, freelancer) → bu segment hem net ROI sağlar hem B2B SaaS'a kırılabilir.

---

## 3. Kullanıcı Segmentleri ve Persona'lar

### Persona 1 — Burak (B2C, ana persona)
- Cumartesi günleri birden fazla iş halletmesi gereken şehirli.
- Zaman kısıtlı ama fiyata da duyarlı.
- İhtiyacı: "Bugün 4 yere gitmem lazım, en mantıklı sırayla ve en az stresle gitmek istiyorum."

### Persona 2 — Elif (Emlakçı, B2B2C)
- Günde 6-8 randevu geziyor.
- İhtiyacı: "Bugünkü randevularımı en verimli sırayla diz, biri iptal olursa yeniden hesapla."

### Persona 3 — Saha Satış Temsilcisi (B2B SaaS)
- Günde 10-20 müşteri ziyareti.
- İhtiyacı: Yönetici tarafında rota ataması + optimizasyon + raporlama.

### Persona 4 — Kurye / Teknisyen (B2B SaaS)
- Zaman penceresi kritik (müşteri sadece belirli saatlerde müsait).
- İhtiyacı: Zaman penceresi + öncelik bazlı sıralama, canlı trafik güncellemesi.

---

## 4. Kapsam Tanımı (MVP → V2 → V3)

### MVP (Faz 1-3, ~ilk üretim sürümü)
- Başlangıç noktası + çoklu durak + hedef girişi.
- Basit optimizasyon: 3 plan üretimi (En hızlı / En ekonomik / En dengeli).
- Google Routes API entegrasyonu (leg-by-leg hesaplama).
- Apple Maps / Google Maps'e deep-link ile navigasyon devri.
- Temel kullanıcı arayüzü (React Native + Expo).
- **Temel araç profili** (marka/model/yakıt tipi/tüketim kaydı, isabetli yakıt/enerji maliyeti hesabı — bkz. Bölüm 20).
- **Temel gerçekleşen gider takibi** (yolculuk sonunda GPS bazlı otomatik gerçek maliyet/tüketim özeti — bkz. Bölüm 21).

### V2
- Smart Departure (ne zaman çıkmalıyım + güven yüzdesi).
- Smart Stop Order (durak sırasını AI'nin belirlemesi, zaman penceresi destekli).
- Dynamic Replanning (yolda trafik değişince rota/durak sırası güncelleme).
- Route-aware Places (rota üzeri POI arama, kısıtlı sapma).
- Park yeri optimizasyonu (elektrikli araçlarda şarj imkânlı otopark önceliklendirmesi dahil).
- Doğal dil ile durak girişi (AI parse).

### V3
- Explainable routing (neden bu rota açıklaması).
- Kişisel sürüş profili öğrenme (personalization engine).
- ETA confidence / güvenilirlik skoru.
- Deadline bazlı çıkış saati + risk buffer.
- **EV menzil ve otomatik şarj molası planlaması** (bkz. Bölüm 20.4).
- **Erişim kısıtı farkındalığı** (düşük emisyon bölgesi, boyut/ağırlık kısıtlı yol — öncelikle B2B ticari araç senaryosu, bkz. Bölüm 20.5).
- **Gelişmiş gider takibi ve tahmin kalibrasyonu** (odometre/fiş girişiyle hassas maliyet, gider geçmişi/istatistik ekranı, aracın gerçek tüketimine göre otomatik kalibrasyon önerisi — bkz. Bölüm 21).
- Sosyal/carpool modülü (opsiyonel).
- B2B panel: saha ekibi rota ataması ve yönetim ekranı (araç filosu profilleriyle entegre).

---

## 5. Yüksek Seviye Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────────┐
│                         MOBİL UYGULAMA                           │
│              React Native (Expo) + TypeScript                    │
│  ┌───────────┐  ┌────────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ Journey   │  │ Map/Route  │  │ Preferences│  │ Notification │  │
│  │ Builder UI│  │ Display UI │  │ Profile UI │  │ / Deep Link  │  │
│  └───────────┘  └────────────┘  └───────────┘  └──────────────┘  │
└───────────────────────────┬───────────────────────────────────────┘
                             │ HTTPS / REST (JSON)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Spring Boot)                       │
│  ┌────────────┐ ┌─────────────┐ ┌───────────────┐ ┌────────────┐ │
│  │ Journey    │ │ Optimization│ │ NLP / AI       │ │ User &     │ │
│  │ Controller │ │ Engine      │ │ Parsing Service│ │ Preference │ │
│  │ / Service  │ │ (Core Algo) │ │ (LLM Gateway)  │ │ Service    │ │
│  └────────────┘ └─────────────┘ └───────────────┘ └────────────┘ │
│  ┌────────────┐ ┌─────────────┐ ┌───────────────┐                │
│  │ Routing    │ │ Places /    │ │ Traffic /      │                │
│  │ Client     │ │ Parking     │ │ History Cache  │                │
│  │ (Google)   │ │ Client      │ │ Service        │                │
│  └────────────┘ └─────────────┘ └───────────────┘                │
└───────────────────────────┬───────────────┬───────────────────────┘
                             │               │
                     ┌───────▼──────┐ ┌──────▼───────┐
                     │ PostgreSQL   │ │ Redis Cache  │
                     │ (kalıcı veri)│ │ (rota/trafik │
                     │              │ │  cache, rate  │
                     │              │ │  limit)       │
                     └──────────────┘ └──────────────┘
                             │
              ┌──────────────┼───────────────────┐
              ▼              ▼                   ▼
     ┌────────────────┐ ┌──────────────┐ ┌────────────────┐
     │ Google Routes   │ │ Google Places│ │ LLM API         │
     │ API             │ │ API          │ │ (Claude/OpenAI) │
     └────────────────┘ └──────────────┘ └────────────────┘
```

### 5.1 Mimari Prensipler

1. **Ayrık sorumluluk:** Mobil uygulama sadece UI + state yönetimi yapar; tüm optimizasyon mantığı backend'de çalışır (hem güvenlik hem de algoritma güncellemelerini anlık deploy edebilmek için).
2. **Sağlayıcı bağımsızlığı (provider abstraction):** Routing/Places istemcileri bir arayüz (`RoutingProvider`) arkasına gizlenir; ileride Yandex/HERE gibi sağlayıcılar eklenebilir.
3. **Cache-first trafik verisi:** Aynı segment için tekrar tekrar Google'a istek atmamak için Redis üzerinde kısa ömürlü (2-5 dk) trafik cache'i.
4. **Stateless backend, stateful job'lar için queue:** Ağır optimizasyon istekleri (örn. 15+ durak) senkron değil, async job olarak işlenir (bkz. Bölüm 8.4).
5. **AI çağrıları izole edilir:** LLM çağrıları ayrı bir `NlpParsingService` içinde, backend'in geri kalanından bağımsız, timeout ve fallback mekanizmalı.

---
## 6. Teknoloji Stack'i ve Gerekçeleri

### 6.1 Mobil Uygulama

| Bileşen | Teknoloji | Gerekçe |
|---|---|---|
| Framework | React Native + Expo (SDK, managed workflow) | Linux üzerinden geliştirme + iPhone'da Expo Go ile test edilebilme; App Store build'i EAS Build (cloud) ile Mac gerektirmeden alınabilir. |
| Dil | TypeScript | Tip güvenliği; AI ile "vibe coding" yaparken tip hataları AI'nin kendi kendini düzeltmesini kolaylaştırır. |
| Navigasyon (uygulama içi ekran geçişi) | React Navigation | Standart, iyi dokümante, Expo ile uyumlu. |
| State Management | Zustand (hafif) veya Redux Toolkit (daha büyük ekipler için) | MVP için Zustand önerilir — az boilerplate, AI'nin yönetmesi kolay. |
| Harita gösterimi | react-native-maps (Google Maps provider) | Rota polyline çizimi, marker gösterimi için. |
| Form / State validation | Zod + React Hook Form | API'den dönen/gönderilen veri şemalarını tip-güvenli doğrulamak için. |
| HTTP client | Axios (interceptor'lı: auth token, retry, error mapping) | |
| Local storage (cihaz üstü) | Expo SecureStore (token) + AsyncStorage (önbellek, tercihler) | |
| Bildirimler | Expo Notifications | "Çıkış zamanı geldi" gibi push bildirimleri için. |
| Deep linking | Expo Linking (`comgooglemaps://`, `maps://` Apple Maps şeması) | Navigasyonu harici uygulamaya devretmek için. |
| Test | Jest + React Native Testing Library, E2E için Detox veya Maestro | |

### 6.2 Backend

| Bileşen | Teknoloji | Gerekçe |
|---|---|---|
| Dil / Framework | Java 21 + Spring Boot 3.x | Kullanıcının mevcut Java bilgisi; olgun ekosistem, güçlü tip sistemi karmaşık optimizasyon kodu için uygun. |
| Build | Maven veya Gradle | Standart. |
| Web katmanı | Spring Web (REST) | |
| Veritabanı erişimi | Spring Data JPA + Hibernate | |
| Veritabanı | PostgreSQL 16 + PostGIS eklentisi | Coğrafi sorgular (mesafe, "rota üzerinde mi" hesaplamaları) için PostGIS kritik. |
| Cache / Queue | Redis (cache) + opsiyonel RabbitMQ veya basit Spring `@Async` + veritabanı tabanlı job kuyruğu (MVP'de yeterli) | |
| Kimlik doğrulama | Spring Security + JWT (access + refresh token) | |
| API dokümantasyonu | springdoc-openapi (Swagger UI) | AI'nin API sözleşmesini anlaması ve kendi kendine test etmesi için de faydalı. |
| Loglama | SLF4J + Logback, yapılandırılmış JSON log (prod'da) | |
| Migration | Flyway | Şema değişikliklerini versiyonlamak için — vibe coding sürecinde şema sık değişeceğinden kritik. |
| Test | JUnit 5 + Mockito + Testcontainers (PostgreSQL için) | |

### 6.3 Dış Servisler

| Servis | Kullanım Amacı |
|---|---|
| Google Routes API (`computeRoutes`, `computeRouteMatrix`) | Rota hesaplama, trafik, alternatif rotalar, toll bilgisi, eco-route |
| Google Places API | Durak arama, rota üzeri POI, otopark arama |
| Google Geocoding API | Adres → koordinat dönüşümü |
| Google Distance Matrix API (veya Routes Matrix) | Çoklu durak arası mesafe/süre matrisi (optimizasyon algoritmasının girdisi) |
| LLM API (Anthropic Claude API) | Doğal dil → yapılandırılmış yolculuk planı parse etme |
| Firebase Cloud Messaging veya Expo Push | Push bildirimleri |
| Sentry | Hata izleme (mobil + backend) |

### 6.4 Altyapı

| Bileşen | Teknoloji |
|---|---|
| Konteynerizasyon | Docker + Docker Compose (lokal geliştirme) |
| Hosting (backend) | Railway / Render / Fly.io (MVP için ucuz ve hızlı) → ileride AWS/GCP'ye taşınabilir |
| Hosting (PostgreSQL) | Yönetilen servis (Neon, Supabase veya Railway Postgres) |
| CI/CD | GitHub Actions |
| Mobil build | EAS Build (Expo Application Services) |
| Ortam yönetimi | `.env` dosyaları + Spring Profiles (`dev`, `staging`, `prod`) |

---

## 7. Mobil Uygulama Mimarisi (React Native + Expo)

### 7.1 Klasör Yapısı

```
smartroute-app/
├── app/                        # Expo Router tabanlı ekranlar (dosya-tabanlı routing)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── journey/
│   │   │   ├── index.tsx       # Journey Builder ana ekranı
│   │   │   ├── new-stop.tsx
│   │   │   └── plan-result.tsx
│   │   ├── history.tsx
│   │   └── profile.tsx
│   └── _layout.tsx
├── src/
│   ├── api/                    # Axios client + endpoint fonksiyonları
│   │   ├── client.ts
│   │   ├── journeyApi.ts
│   │   ├── authApi.ts
│   │   └── preferencesApi.ts
│   ├── store/                  # Zustand store'lar
│   │   ├── journeyStore.ts
│   │   ├── authStore.ts
│   │   └── preferencesStore.ts
│   ├── types/                  # Zod şemaları + TS tipleri (backend DTO'larıyla birebir eşleşir)
│   │   ├── journey.ts
│   │   ├── stop.ts
│   │   └── route.ts
│   ├── components/
│   │   ├── map/
│   │   │   ├── RouteMapView.tsx
│   │   │   └── StopMarker.tsx
│   │   ├── journey/
│   │   │   ├── StopList.tsx
│   │   │   ├── StopCard.tsx
│   │   │   ├── PlanCard.tsx        # "En hızlı / En ekonomik / En dengeli" kartı
│   │   │   └── ExplainabilityBadge.tsx
│   │   └── common/
│   ├── hooks/
│   │   ├── useLocation.ts
│   │   ├── useJourneyOptimization.ts
│   │   └── useDeepLinkNavigation.ts
│   ├── utils/
│   │   ├── formatDuration.ts
│   │   ├── deepLinks.ts        # Apple Maps / Google Maps URL şeması üretimi
│   │   └── geo.ts
│   └── constants/
├── assets/
├── app.json                    # Expo config
├── eas.json                    # EAS Build profilleri
└── package.json
```

### 7.2 State Yönetimi Stratejisi

- **`journeyStore`**: Şu anki yolculuk taslağı (başlangıç, duraklar, hedef, kısıtlar), optimizasyon sonucu dönen plan(lar), seçili plan.
- **`authStore`**: Kullanıcı oturumu, JWT token, otomatik yenileme.
- **`preferencesStore`**: Kullanıcının sürüş profili (hız/ekonomi/stressiz tercihleri) — hem lokal cache hem backend senkronizasyonu.
- Server-state (API'den gelen veri) için **TanStack Query (React Query)** kullanımı önerilir: otomatik cache, retry, stale-while-revalidate. Zustand sadece client-side UI state için kullanılır. Bu ayrım AI'nin kod üretirken karışıklık yapmasını önler.

### 7.3 Ekran Akışı (User Flow)

```
[Login/Register]
        │
        ▼
[Journey Builder]
   - Başlangıç noktası (otomatik: mevcut konum)
   - Durak ekle (+ arama / harita üzerinden seç / doğal dil ile yaz)
   - Her durak için: süre, zaman penceresi, öncelik (opsiyonel, varsayılanlı)
   - Tercihler: hızlı / ekonomik / stressiz / konforlu / ekolojik
        │
        ▼
[Optimize Et] → Backend'e istek
        │
        ▼
[Plan Sonuçları] (3 kart: En Hızlı / En Ekonomik / En Dengeli)
   - Her kart: süre, mesafe, ücret, "neden önerildi" rozeti
        │
        ▼
[Plan Detay] → Durak sırası, harita üzerinde rota, tahmini varış saatleri
        │
        ▼
[Navigasyonu Başlat] → Deep link ile Apple Maps / Google Maps'e devret
        │
        ▼
[Yolculuk Aktif] (opsiyonel V2) → Push bildirimi ile "trafik değişti, rota güncellendi"
```

### 7.4 Deep Linking Detayı (Navigasyon Devri)

MVP'de kendi navigasyon motorumuzu yazmıyoruz. Kullanıcı "Navigasyonu Başlat" dediğinde:

- **iOS + Apple Maps:** `maps://?daddr=<lat,lng>&dirflg=d`
- **iOS + Google Maps (yüklüyse):** `comgooglemaps://?daddr=<lat,lng>&directionsmode=driving`
- **Fallback (uygulama yoksa):** `https://www.google.com/maps/dir/?api=1&destination=<lat,lng>`

Çoklu durak senaryosunda (kullanıcı tüm günü tek seferde navigasyona başlatmak isterse) Google Maps web/deep-link URL'i `waypoints` parametresiyle desteklenir; Apple Maps çoklu durakta sınırlıdır — bu nedenle çoklu duraklı senaryoda kullanıcıya **"durak durak navigasyonu başlat"** akışı sunulur: her durağa varıldığında bildirim + "sıradaki durağa git" butonu.

**Edge case:** Kullanıcı navigasyon sırasında planlanan sıradan sapıp kendi rotasını izlerse, uygulama bunu bilemez (çünkü gerçek navigasyon harici uygulamada). Bu MVP'nin bilinen bir sınırlamasıdır ve kullanıcı arayüzünde netçe belirtilir ("Navigasyon başladıktan sonra güncellemeler duraklara varış onayınıza bağlıdır").

---

## 8. Backend Mimarisi (Spring Boot)

### 8.1 Katmanlı Mimari

```
com.smartroute
├── config/                     # Security, CORS, OpenAPI, Async config
├── controller/                 # REST controller'lar (ince, sadece DTO <-> Service çağrısı)
│   ├── JourneyController
│   ├── AuthController
│   ├── PreferenceController
│   └── PlaceController
├── service/
│   ├── journey/
│   │   ├── JourneyPlanningService     # Orkestrasyon: girdi doğrulama, optimizasyon çağırma
│   │   ├── OptimizationEngine         # Ana algoritma (bkz. Bölüm 11)
│   │   └── ExplainabilityService      # "Neden bu rota" gerekçelendirme
│   ├── routing/
│   │   ├── RoutingProvider (interface)
│   │   └── GoogleRoutesProvider (implementation)
│   ├── nlp/
│   │   └── JourneyNlpParsingService   # LLM çağrısı, structured output parse
│   ├── places/
│   │   ├── PlaceSearchService
│   │   └── ParkingService
│   ├── user/
│   │   ├── UserService
│   │   └── PreferenceLearningService  # V3: davranışsal öğrenme
│   └── traffic/
│       └── TrafficCacheService
├── repository/                 # Spring Data JPA repository'ler
├── domain/                     # Entity'ler (JPA)
├── dto/                        # Request/Response DTO'ları
├── mapper/                     # Entity <-> DTO dönüşümleri (MapStruct önerilir)
├── exception/                  # Custom exception'lar + GlobalExceptionHandler
└── client/                     # Dış API istemcileri (Google, LLM) — HTTP client wrapper'ları
```

### 8.2 Servis Sorumlulukları — Detay

**`JourneyPlanningService`** (orkestratör):
1. Gelen `JourneyRequest`'i doğrular (en az 1 durak, geçerli koordinatlar, zaman pencereleri tutarlı mı — örn. bitiş > başlangıç).
2. Eğer istekte doğal dil metni varsa → `JourneyNlpParsingService`'e gönderir, yapılandırılmış duraklara çevirir.
3. `RoutingProvider` üzerinden leg-by-leg mesafe/süre matrisi ister (bkz. 12.2).
4. `OptimizationEngine`'e matrisi + kısıtları + kullanıcı tercihlerini verir.
5. Dönen 1-N adayı `ExplainabilityService`'e göndererek gerekçe metni üretir.
6. Sonucu `JourneyPlanResponse` DTO'suna map'ler ve döner.

**`OptimizationEngine`**: Saf algoritma katmanı, hiçbir dış API'yi doğrudan çağırmaz — sadece matris + kısıt + ağırlık alır, skorlanmış rota adayları döner (bkz. Bölüm 11).

**`GoogleRoutesProvider`**: `RoutingProvider` interface'ini implemente eder. Google'a spesifik detaylar (API key, request/response formatı) burada izole edilir. İleride `YandexRoutesProvider` eklenebilir.

### 8.3 Asenkron İşlem Stratejisi

- Basit istekler (≤5 durak): senkron REST çağrısı, ortalama yanıt süresi hedefi < 2 saniye.
- Karmaşık istekler (6+ durak, çoklu kombinasyon denemesi): `202 Accepted` + job ID döner, istemci polling veya WebSocket ile sonucu alır. MVP'de basit polling yeterlidir (`GET /journeys/{id}/status`).

### 8.4 Hata Yönetimi Stratejisi

- Tüm dış API çağrıları **circuit breaker** (Resilience4j) ile sarılır: Google Routes API zaman aşımına uğrarsa, cache'lenmiş son bilinen veriye düşülür veya kullanıcıya net hata mesajı döner.
- LLM çağrıları için **fallback**: NLP parse başarısız olursa, kullanıcıya manuel durak ekleme formuna yönlendirme yapılır (asla sessizce yanlış veri üretilmez).

---
## 9. Veritabanı Şeması

### 9.1 ER Diyagramı (Metinsel)

```
users ──< user_preferences
  │
  └──< journeys ──< journey_stops
          │              │
          │              └── (opsiyonel) time_window
          │
          └──< journey_plans ──< plan_legs
                    │
                    └── explanation (JSON/text)

places (cache tablosu) — Google Places sonuçlarının lokal cache'i
traffic_snapshots — segment bazlı geçmiş trafik verisi (V2+)
route_feedback — kullanıcının seçtiği/reddettiği plan geri bildirimi (V3 öğrenme için)
```

### 9.2 Tablo Detayları

**`users`**
| Kolon | Tip | Açıklama |
|---|---|---|
| id | UUID (PK) | |
| email | varchar, unique | |
| password_hash | varchar | |
| full_name | varchar | |
| default_vehicle_type | varchar | Geriye dönük uyumluluk için basit alan (`gasoline`, `diesel`, `electric`, `hybrid`); kullanıcı detaylı araç eklerse asıl kaynak `vehicles` tablosudur (bkz. Bölüm 20) |
| created_at | timestamp | |

**`user_preferences`**
| Kolon | Tip | Açıklama |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK) | |
| profile_type | varchar | `fast`, `economic`, `stress_free`, `comfortable`, `eco`, `custom` |
| weight_time | float | 0-1 arası, custom profil için |
| weight_cost | float | |
| weight_traffic_risk | float | |
| weight_parking_difficulty | float | |
| avoid_tolls | boolean | |
| avoid_highways | boolean | |
| max_walk_minutes | int | Park sonrası kabul edilebilir yürüme süresi |
| updated_at | timestamp | |

**`journeys`**
| Kolon | Tip | Açıklama |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK) | |
| status | varchar | `draft`, `optimizing`, `planned`, `in_progress`, `completed`, `cancelled` |
| start_lat / start_lng | double | |
| start_address_text | varchar | |
| planned_departure_time | timestamp, nullable | |
| deadline_time | timestamp, nullable | Örn. "14:00'te orada olmalıyım" |
| raw_nlp_input | text, nullable | Kullanıcının doğal dil girdisi (varsa) |
| created_at | timestamp | |

**`journey_stops`**
| Kolon | Tip | Açıklama |
|---|---|---|
| id | UUID (PK) | |
| journey_id | UUID (FK) | |
| sequence_order | int | Kullanıcının girdiği ham sıra (optimizasyon sonrası değişebilir) |
| optimized_order | int, nullable | Algoritmanın önerdiği sıra |
| place_name | varchar | |
| lat / lng | double | |
| visit_duration_minutes | int | |
| time_window_start | timestamp, nullable | |
| time_window_end | timestamp, nullable | |
| priority | varchar | `critical`, `high`, `normal`, `low` |
| stop_type | varchar | `errand`, `meeting`, `poi`, `parking`, `pickup` |

**`journey_plans`**
| Kolon | Tip | Açıklama |
|---|---|---|
| id | UUID (PK) | |
| journey_id | UUID (FK) | |
| plan_label | varchar | `fastest`, `cheapest`, `balanced`, `recommended` |
| total_duration_seconds | int | |
| total_distance_meters | int | |
| total_toll_cost | decimal | |
| total_fuel_cost_estimate | decimal | |
| traffic_risk_score | float | 0-1 |
| overall_score | float | Ağırlıklı toplam skor (bkz. 11.3) |
| eta_confidence_percent | int, nullable | V3 |
| is_selected | boolean | Kullanıcının seçtiği plan mı |
| explanation_text | text, nullable | |
| created_at | timestamp | |

**`plan_legs`**
| Kolon | Tip | Açıklama |
|---|---|---|
| id | UUID (PK) | |
| plan_id | UUID (FK) | |
| from_stop_id | UUID (FK, nullable — başlangıç için null) | |
| to_stop_id | UUID (FK) | |
| leg_order | int | |
| distance_meters | int | |
| duration_seconds | int | |
| polyline_encoded | text | Google encoded polyline |
| toll_cost | decimal | |

**`places`** (cache)
| Kolon | Tip | Açıklama |
|---|---|---|
| id | UUID (PK) | |
| google_place_id | varchar, unique | |
| name | varchar | |
| lat / lng | double (PostGIS `geography(Point,4326)` kolonu da eklenir) | |
| category | varchar | |
| cached_at | timestamp | |

**`route_feedback`** (V3)
| Kolon | Tip | Açıklama |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK) | |
| journey_id | UUID (FK) | |
| selected_plan_label | varchar | |
| rejected_plan_labels | text[] | |
| actual_duration_seconds | int, nullable | Gerçekleşen süre (varsa geri bildirim) |
| created_at | timestamp | |

### 9.3 İndeksleme Stratejisi

- `journey_stops(journey_id)`, `journey_plans(journey_id)`, `plan_legs(plan_id)` üzerinde standart FK indeksleri.
- `places` tablosunda PostGIS `GIST` indeksi (coğrafi "rota üzerinde mi" sorguları için).
- `journeys(user_id, created_at DESC)` — kullanıcı geçmişi listeleme için composite indeks.

---

## 10. API Tasarımı (REST Endpoint'ler)

Tüm endpoint'ler `/api/v1` prefix'i altında, JWT Bearer token ile korunur (auth endpoint'leri hariç).

### 10.1 Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
```

### 10.2 Journey (Yolculuk)
```
POST   /api/v1/journeys                     # Yeni yolculuk taslağı oluştur
POST   /api/v1/journeys/parse-nlp            # Doğal dil girdisini yapılandırılmış durağa çevir
POST   /api/v1/journeys/{id}/optimize        # Optimizasyonu tetikle (senkron veya 202+job)
GET    /api/v1/journeys/{id}                 # Yolculuk detayını getir
GET    /api/v1/journeys/{id}/status          # Async job durumu (polling)
GET    /api/v1/journeys/{id}/plans           # Üretilen plan alternatiflerini listele
POST   /api/v1/journeys/{id}/plans/{planId}/select   # Kullanıcının bir planı seçmesi
POST   /api/v1/journeys/{id}/replan          # Dinamik yeniden planlama (trafik değişti vb.)
GET    /api/v1/journeys                      # Kullanıcının geçmiş yolculukları
DELETE /api/v1/journeys/{id}
```

### 10.3 Places / Route-aware Search
```
GET    /api/v1/places/search?query=...&near=lat,lng
GET    /api/v1/journeys/{id}/along-route?category=fuel&max_detour_km=2
GET    /api/v1/places/{id}/parking-options
```

### 10.4 Departure Optimizer
```
POST   /api/v1/journeys/{id}/departure-suggestions
       # Body: { "target_arrival_time": "2026-08-08T14:00:00" }
       # Response: [{ "departure_time": "13:42", "arrival_confidence": 0.94, ... }, ...]
```

### 10.5 Preferences
```
GET    /api/v1/preferences
PUT    /api/v1/preferences
```

### 10.6 Örnek Request/Response — Optimizasyon

**Request** `POST /api/v1/journeys/{id}/optimize`
```json
{
  "startLocation": { "lat": 40.9909, "lng": 29.0303 },
  "stops": [
    {
      "placeName": "Kargo Şubesi",
      "lat": 40.9950, "lng": 29.0400,
      "visitDurationMinutes": 10,
      "timeWindowEnd": "2026-08-08T12:00:00",
      "priority": "critical"
    },
    {
      "placeName": "Market",
      "lat": 40.9800, "lng": 29.0500,
      "visitDurationMinutes": 20,
      "timeWindowStart": "2026-08-08T10:00:00",
      "timeWindowEnd": "2026-08-08T14:00:00",
      "priority": "normal"
    }
  ],
  "returnToStart": true,
  "preferences": {
    "profileType": "balanced",
    "avoidTolls": false,
    "avoidHighways": false
  },
  "vehicleType": "gasoline",
  "vehicleId": "uuid-or-null",
  "currentStateOfChargePercent": null
}
```

> Not: `vehicleType` alanı geriye dönük uyumluluk için korunur (kullanıcı henüz araç eklememişse kaba kategori olarak kullanılır). Kullanıcı `vehicles` tablosunda kayıtlı bir araca sahipse `vehicleId` gönderilir ve maliyet/menzil hesapları o aracın gerçek verileriyle yapılır — detay için Bölüm 20.

**Response**
```json
{
  "journeyId": "uuid",
  "plans": [
    {
      "planId": "uuid",
      "label": "recommended",
      "totalDurationSeconds": 4620,
      "totalDistanceMeters": 45200,
      "totalTollCost": 40.0,
      "totalFuelCostEstimate": 155.0,
      "trafficRiskScore": 0.22,
      "overallScore": 0.87,
      "explanation": "7 dakika daha uzun ama ₺35 daha ucuz, köprü trafiğinden kaçınıyor ve park bulma ihtimali daha yüksek.",
      "stopOrder": ["Kargo Şubesi", "Market"],
      "legs": [ { "fromStop": null, "toStop": "Kargo Şubesi", "distanceMeters": 5200, "durationSeconds": 720, "polyline": "..." } ]
    }
  ]
}
```

---

## 11. Optimizasyon Motoru — Algoritmalar

### 11.1 Problem Tanımı (Formel)

Bu problem literatürde **Vehicle Routing Problem with Time Windows (VRPTW)**'nin tek-araçlı, çok-amaçlı (multi-objective) bir varyantıdır. Klasik TSP'den farkı:

- Her durağın bir **zaman penceresi** olabilir (`[time_window_start, time_window_end]`).
- Her durağın bir **önceliği** vardır (`critical` durakların zaman penceresi ihlali kabul edilemez; `low` öncelikli duraklar gerekirse plana dahil edilmeyebilir — V2).
- Amaç fonksiyonu **tek boyutlu değil** (sadece süre değil; süre + maliyet + trafik riski + park zorluğu ağırlıklı toplamı).

### 11.2 Çözüm Yaklaşımı — Aşamalı Strateji

Küçük durak sayılarında (MVP hedefi: ≤8 durak) tam arama (brute-force / branch-and-bound) hesaplama açısından uygulanabilirdir (8 durağın permütasyonu = 40,320, filtrelenerek çok daha azına iner). Daha büyük setlerde (V2/V3, B2B saha ekibi senaryosu 15-20+ durak) sezgisel (heuristic) yaklaşımlara geçilir.

**Aşama 1 — Ön Filtreleme:**
- Zaman penceresi çakışan/imkansız kombinasyonları ele (örn. A durağı 12:00'dan önce, B durağı A'dan sonra ama B'nin penceresi 11:00'da bitiyor ve A-B arası mesafe B'ye 11:00'dan sonra varmayı garantiliyorsa, bu sıralama elenir).

**Aşama 2 — Aday Sıra Üretimi:**
- ≤8 durak: Tüm permütasyonları üret (veya "critical" öncelikli durakları sabitleyip geri kalanını permüte et → arama uzayını daralt).
- 9+ durak: **Nearest Neighbor + 2-opt local search** sezgiseli kullanılır:
  1. Başlangıçtan en yakın (zaman penceresi uygun) durağa git, bunu tekrarla → başlangıç turu oluştur.
  2. **2-opt iyileştirme**: turdaki iki kenarı yer değiştirerek toplam maliyeti azaltıp azaltmadığını kontrol et, azaltıyorsa uygula, yerel optimuma yakınsayana kadar tekrarla.
  3. (V3) **Simulated Annealing** ile yerel optimumdan kaçış — daha büyük setlerde (20+) daha iyi sonuç için.

**Aşama 3 — Her Adayın Maliyetini Hesaplama:**
- Google Routes API / Distance Matrix'ten leg-by-leg süre, mesafe, toll bilgisini al (bkz. Bölüm 12).
- Zaman penceresi ihlali olan adayları ele (veya `critical` değilse "ihlal riski" olarak işaretle, kullanıcıya uyarı göster).

**Aşama 4 — Çok Amaçlı Skorlama (bkz. 11.3):**
- Kalan geçerli adaylar için ağırlıklı skor hesapla.
- En yüksek skorlu 3 adayı (`fastest` ağırlıklarıyla en iyi, `cheapest` ağırlıklarıyla en iyi, kullanıcı `profileType`'ına göre en iyi = `recommended`) kullanıcıya sun.

### 11.3 Skorlama Fonksiyonu

```
Score = w_time     × normalize(TravelTime)
      + w_cost      × normalize(TollCost + FuelCost)
      + w_traffic    × normalize(TrafficRiskScore)
      + w_parking    × normalize(ParkingDifficultyScore)
      + w_distance   × normalize(Distance)
```

- Her bileşen min-max normalize edilir (aday setleri arasında 0-1 aralığına getirilir) ki farklı birimler (dakika, TL, km) karşılaştırılabilir olsun.
- Skor **düşük olan daha iyi** (maliyet fonksiyonu); UI'da "0-100 uygunluk skoru" olarak `1 - score` şeklinde ters çevrilip gösterilir.

**Varsayılan ağırlıklar (profil bazlı):**

| Profil | w_time | w_cost | w_traffic | w_parking | w_distance |
|---|---|---|---|---|---|
| fast (Hızlı) | 0.55 | 0.10 | 0.20 | 0.05 | 0.10 |
| economic (Ekonomik) | 0.20 | 0.50 | 0.15 | 0.05 | 0.10 |
| stress_free (Stressiz) | 0.20 | 0.10 | 0.50 | 0.15 | 0.05 |
| comfortable (Konforlu) | 0.25 | 0.10 | 0.30 | 0.25 | 0.10 |
| eco (Ekolojik) | 0.15 | 0.35 | 0.10 | 0.05 | 0.35 |
| balanced (Dengeli, varsayılan) | 0.30 | 0.20 | 0.25 | 0.15 | 0.10 |
| custom | kullanıcının `user_preferences` tablosundaki değerleri | | | | |

### 11.4 TrafficRiskScore Hesabı

```
TrafficRiskScore = weighted_avg(
    current_traffic_delay_ratio,     # (canlı süre / serbest akış süresi) - 1
    historical_variance_at_departure_time,   # Google Routes API "trafficModel: OPTIMISTIC/PESSIMISTIC" farkından türetilir
    segment_incident_flag            # Kaza/yol kapama bildirimi varsa +
)
```

Google Routes API `duration` (canlı tahmin) ile `staticDuration` (trafik olmadan) arasındaki fark, risk skorunun ana bileşenidir.

### 11.5 ParkingDifficultyScore (V2)

```
ParkingDifficultyScore = f(
    otopark_yogunluk_tahmini,   # Places API "popular times" varsa
    yürüme_mesafesi_dakika,
    ücret_seviyesi
)
```

MVP'de basitleştirilmiş: sadece "otopark mevcut mu + tahmini ücret + yürüme mesafesi" ile hesaplanır; V2'de doluluk tahmini eklenir.

### 11.6 Karmaşıklık ve Performans Notları

- ≤8 durak, brute-force + critical-sabitleme: pratikte < 500ms (Google API çağrıları hariç, bunlar paralel yapılır).
- Google Routes API çağrı sayısını azaltmak için: tüm leg kombinasyonları yerine **Distance Matrix API** ile tek seferde NxN matris çekilir (N=durak sayısı+1), böylece N² değil, 1 API çağrısı yeterli olur. Aday sıralamalar bu matris üzerinden **offline** hesaplanır; sadece final 3 aday için gerçek `computeRoutes` (polyline, toll, trafik detay) çağrılır.
- 9+ durak (B2B senaryosu): 2-opt genelde birkaç yüz milisaniyede yakınsar; SLA hedefi < 3 saniye.

---
## 12. Google Routes API Entegrasyonu

### 12.1 Kullanılacak Google API'leri

| API | Kullanım |
|---|---|
| Routes API — `computeRoutes` | Tek rota, alternatif rotalar (max 3), trafik, toll, eco-route, polyline |
| Routes API — `computeRouteMatrix` | Çoklu başlangıç × çoklu hedef mesafe/süre matrisi (optimizasyon girdisi) |
| Places API — Text Search / Nearby Search | Durak arama, rota üzeri POI, otopark arama |
| Geocoding API | Serbest metin adres → koordinat |

### 12.2 Kritik Kısıtlama ve Çözümü

**Kısıtlama:** Google Routes API'de `computeRoutes` çağrısında **alternative routes** (`computeAlternativeRoutes: true`) yalnızca **ara nokta (intermediate waypoint) olmayan** rotalar için dönüyor. Yani "A → B → C → D, ve bana 3 alternatif ver" tek çağrıda doğrudan alınamıyor.

**Çözümümüz — Leg-by-Leg Hesaplama Katmanı:**

1. Optimizasyon motoru önce **hangi sırayla gidileceğine** (stop order) `computeRouteMatrix` ile karar verir (bu API alternatif rota değil, sadece süre/mesafe matrisi ister — kısıtlamaya takılmaz).
2. Sıra belirlendikten sonra, **her bacak (leg) için ayrı ayrı** `computeRoutes` çağrılır (`A→B`, `B→C`, `C→D`), her birinde `computeAlternativeRoutes: true` istenerek o bacak için alternatifler alınır.
3. Bacak alternatifleri kombinlenerek (kombinatoryal patlamayı önlemek için sadece en iyi 2 alternatif/bacak tutulur) toplam 2-3 "uçtan uca" plan oluşturulur ve skorlanır.

Bu yaklaşım hem API kısıtlamasını aşar hem de **bizim asıl değer katmanımızı** oluşturur (Google'ın vermediği "uçtan uca çok durak + alternatif" kombinasyonunu biz üretiyoruz).

### 12.3 `RoutingProvider` Arayüzü (Backend, Java)

```java
public interface RoutingProvider {
    DistanceMatrixResult computeMatrix(List<GeoPoint> origins, List<GeoPoint> destinations);
    List<RouteCandidate> computeRoute(GeoPoint origin, GeoPoint destination, RouteOptions options);
}
```

`RouteOptions` içinde: `avoidTolls`, `avoidHighways`, `vehicleType` (eco-route için), `departureTime`, `trafficModel` (`BEST_GUESS`, `OPTIMISTIC`, `PESSIMISTIC`). V2/V3'te kayıtlı bir `vehicle` verilmişse, `emission_class`, `height_cm/weight_kg` gibi alanlar da (destekleniyorsa) `RouteOptions`'a eklenir — detay için Bölüm 20.5.

### 12.4 Rate Limiting ve Maliyet Kontrolü

- Redis üzerinde **request-level cache**: aynı origin-destination-departureTime (dakika hassasiyetinde) için 2 dakika içinde tekrar istek gelirse cache'ten dön.
- Backend'de **kullanıcı bazlı rate limit** (örn. dakikada max 10 optimize isteği) — kötüye kullanımı önlemek + API maliyetini kontrol etmek için.
- `computeRouteMatrix` tercih edilir çünkü N durak için 1 çağrıda NxN matris döner (N² ayrı çağrı yerine).

### 12.5 Hata Senaryoları

| Senaryo | Davranış |
|---|---|
| Google API timeout | Circuit breaker devreye girer, kullanıcıya "rota hesaplanamadı, tekrar deneyin" + cache'lenmiş son bilinen veri varsa onunla yaklaşık sonuç sunulur (açıkça "yaklaşık" etiketiyle) |
| Geçersiz koordinat | 400 Bad Request, hangi durağın geçersiz olduğu belirtilir |
| API quota aşımı | Sistem genelinde graceful degradation: yeni optimize istekleri geçici olarak reddedilir, kullanıcıya bilgilendirme |
| Rota bulunamadı (adalar arası, erişilemez nokta vb.) | İlgili durak "erişilemez" olarak işaretlenir, kullanıcıya alternatif öneri (yürüyerek/farklı ulaşım) sunulmaz (MVP kapsamı dışı), sadece net hata mesajı |

---

## 13. AI / Doğal Dil İşleme Katmanı

### 13.1 Amaç

Kullanıcının şu şekilde yazdığı serbest metni:

> "Bugün 12'ye kadar kargoyu bırakmam lazım, sonra Gebze Center'a uğrayacağım, oradan da arkadaşımı alıp eve döneceğim. Trafik çoksa köprüden geçmek istemiyorum."

yapılandırılmış bir `JourneyRequest` JSON'ına çevirmek.

### 13.2 Teknik Yaklaşım — Structured Output

- LLM (Claude API) çağrısı **yalnızca JSON döndürecek** şekilde sistem prompt'u ile kısıtlanır; Anthropic'in tool-use / structured output özelliği kullanılarak şema zorunlu kılınır (serbest metin sızıntısı önlenir).
- Şema, backend'deki `JourneyRequest` DTO'suyla birebir eşleşir (bkz. 10.6).

**Sistem prompt iskeleti (özet):**
```
Sen bir yolculuk planlama asistanısın. Kullanıcının serbest metnini,
aşağıdaki JSON şemasına uyan yapılandırılmış bir yolculuk planına çevir.
- Adları geocode ETME (sadece metin olarak bırak, "placeNameRaw" alanına yaz;
  gerçek koordinat çözümlemesi ayrı bir Geocoding adımında yapılacak).
- Zaman ifadelerini ISO 8601'e çevir (bugünün tarihini kullan: {currentDate}).
- Belirtilmeyen alanlar için varsayım YAPMA, null bırak.
- Sadece JSON döndür, başka hiçbir metin ekleme.
Şema: { ... }
```

### 13.3 İşlem Akışı

```
Kullanıcı serbest metni
        │
        ▼
JourneyNlpParsingService.parse(text)
        │
        ▼
LLM API çağrısı (structured output, timeout: 8sn)
        │
        ▼
Ham JSON (placeNameRaw alanlarıyla)
        │
        ▼
Her placeNameRaw için Geocoding API / Places API çağrısı
   (birden fazla eşleşme varsa kullanıcıya seçim sunulur)
        │
        ▼
Tam JourneyRequest (koordinatlı)
        │
        ▼
Kullanıcıya "Şunu mu demek istediniz?" onay ekranı (asla sessizce optimize etme)
```

**Kritik tasarım kararı:** LLM çıktısı **hiçbir zaman doğrudan optimizasyona sokulmaz**. Kullanıcıya önce parse edilmiş yapı gösterilir, onaylaması istenir. Bu hem yanlış parse riskini azaltır hem kullanıcıya kontrol hissi verir.

### 13.4 Edge Case'ler (NLP)

- Belirsiz zaman ifadesi ("akşamüstü") → varsayılan aralık ata (17:00-19:00) ama kullanıcıya "belirsiz zaman, düzenleyebilirsiniz" uyarısı göster.
- Aynı isimde birden fazla yer ("Migros") → Places API'den en yakın 3 sonucu sun, kullanıcı seçsin.
- Çelişkili kısıt ("12:00'a kadar bitir ama önce 3 saatlik iş yap") → parse aşamasında LLM bunu `warnings` alanında işaretler, backend de zaman penceresi tutarlılık kontrolünde tekrar yakalar.
- LLM timeout/hata → kullanıcı doğal dil girmeden manuel form ile devam edebilir (fallback UI her zaman erişilebilir).

### 13.5 Maliyet ve Performans

- Ortalama prompt + response ~500-800 token; kullanıcı başına günlük birkaç çağrı — maliyet düşük ama sınırsız değil. Backend'de kullanıcı bazlı günlük NLP çağrı limiti (örn. 30/gün, ücretsiz plan için) uygulanır.
- Yanıt süresi hedefi: < 3 saniye (LLM) + < 1 saniye (geocoding) = kullanıcıya toplam < 4 saniyede parse sonucu.

---

## 14. Departure Time Optimizer

### 14.1 Amaç

Kullanıcı "Yarın 09:00'da orada olmalıyım" dediğinde, ne zaman çıkması gerektiğini **güven yüzdesiyle** birlikte söylemek.

### 14.2 Algoritma

1. Hedef varış zamanından geriye doğru birkaç aday çıkış saati üret (örn. 15 dakika aralıklarla, hedef saatten 2 saat öncesine kadar).
2. Her aday çıkış saati için `computeRoutes` çağrısı `departureTime` parametresiyle yapılır (Google'ın trafik tahmin modeli kullanılır — `trafficModel: BEST_GUESS`).
3. `BEST_GUESS`, `OPTIMISTIC`, `PESSIMISTIC` üç senaryo için süre alınır; bu üçlünün dağılımından basit bir **güven aralığı** türetilir:
   ```
   confidence(departure_time) = P(actual_duration ≤ (target_arrival - departure_time))
   ```
   Basitleştirilmiş model: `OPTIMISTIC` ve `PESSIMISTIC` süreleri arasındaki farkı bir belirsizlik bandı olarak kullanıp, hedefe göre normal dağılım varsayımıyla yaklaşık bir yüzde hesaplanır (V1'de basit sezgisel; V3'te geçmiş `route_feedback` verisiyle kalibre edilir).
4. Kullanıcıya, hedeflenen güven eşiğini (örn. %90) aşan **en geç** çıkış saati önerilir + bir miktar "risk buffer" (örn. + 5-10 dk) eklenir.

### 14.3 UI Çıktısı Örneği

```
07:30   62 dk   🔴 %58 zamanında varma ihtimali
07:45   54 dk   🟠 %74
08:00   48 dk   🟠 %81
08:15   39 dk   🟢 %94   ← Önerilen
08:30   44 dk   🟢 %89
```

### 14.4 Edge Case'ler

- Hedef saat geçmişte kalmışsa → hata, kullanıcıya net uyarı.
- Google trafik tahmini o bölgede/saatte veri yoksa (kırsal, gece geç saat) → geniş güven aralığı gösterilir, "tahmin güvenilirliği düşük" uyarısı.

---

## 15. Dynamic Replanning (Yeniden Planlama)

### 15.1 Tetikleyiciler

- Kullanıcı bir durağı tamamladığını manuel işaretler ("Vardım" butonu) → sıradaki bacak için trafik yeniden kontrol edilir.
- Periyodik arka plan kontrolü (V2, kullanıcı "aktif yolculuk" modundayken, 5 dakikada bir): mevcut konum ile planlanan rota arasında sapma veya trafik değişimi > eşik değer ise yeniden hesaplama tetiklenir.
- Kullanıcı manuel "Rotayı Güncelle" butonuna basar.

### 15.2 Algoritma

```
1. Mevcut konumu al (kullanıcı GPS).
2. Kalan durakları ve zaman pencerelerini al.
3. computeRouteMatrix'i kalan duraklar için yeniden çalıştır (güncel trafikle).
4. Eğer yeni matrisle hesaplanan toplam süre, mevcut plandan
   > eşik (örn. 10 dk veya %15) farklıysa:
     a. OptimizationEngine'i kalan duraklarla yeniden çalıştır.
     b. Yeni sıralama eskisinden farklıysa VE toplam süreyi
        anlamlı ölçüde (> 5 dk) iyileştiriyorsa kullanıcıya öner.
5. Kullanıcıya bildirim: "Önünüzde X dk gecikme var. Y durağını önce
   ziyaret etmek toplam süreyi Z dk azaltıyor. [Rotayı Güncelle]"
```

### 15.3 Edge Case'ler

- Kullanıcı bir "critical" (zorunlu deadline'lı) durağı henüz ziyaret etmediyse ve yeniden planlama bu durağı deadline'dan sonraya düşürüyorsa → bu seçenek asla önerilmez, sistem alternatif arar veya "deadline'ı kaçırma riski var" uyarısı verir.
- GPS sinyali zayıf/yok → son bilinen konumla + zaman aşımı tahminiyle yaklaşık yeniden planlama, kullanıcıya "konum belirsiz" uyarısı.
- Kullanıcı planlanan rotadan tamamen farklı bir yöne gitmişse (örn. plan dışı bir yere uğradı) → sistem bunu "sapma" olarak algılar ve yeniden planlamayı otomatik tetikler (V2'de eşik: planlanan rotadan > 2 km sapma).

---

## 16. Explainable Routing (Gerekçeli Öneri)

### 16.1 Amaç

Her önerilen plan için, kullanıcının anlayacağı, karşılaştırmalı bir gerekçe metni üretmek.

### 16.2 Yaklaşım — Kural Tabanlı + Şablon (V1/V2), LLM Destekli (V3)

**V1/V2 (kural tabanlı, deterministik, ucuz, hızlı):**
- İki plan karşılaştırılır (örn. `recommended` vs `fastest`), farkları hesaplanır:
  ```
  duration_diff = recommended.duration - fastest.duration
  cost_diff = fastest.cost - recommended.cost
  traffic_diff = fastest.trafficRisk - recommended.trafficRisk
  ```
- Şablon cümleler doldurulur: *"{duration_diff} dakika daha uzun ama {cost_diff} TL daha ucuz, {en_büyük_fark_bileşeni} bakımından daha avantajlı."*
- Bu yaklaşım **her zaman doğru** (halüsinasyon riski yok) ve API maliyeti gerektirmez.

**V3 (LLM destekli, daha doğal dil):**
- Kural tabanlı katmanın ürettiği **sayısal farkları** LLM'e girdi olarak verip, sadece bu sayılara dayanarak doğal bir cümle kurdurulur (LLM'in kendi rota bilgisi uydurmasına asla izin verilmez — sadece sağlanan sayıları cümleye döker).

### 16.3 Edge Case'ler

- Tüm planlar birbirine çok yakınsa (fark < anlamlı eşik) → "Bu rotalar oldukça benzer, tercihinize göre herhangi birini seçebilirsiniz" gibi nötr mesaj.

---

## 17. Kullanıcı Profili ve Kişiselleştirme (V3)

### 17.1 Öğrenme Mekanizması

- Her yolculukta kullanıcının **hangi planı seçtiği** (`route_feedback.selected_plan_label`) ve **hangilerini reddettiği** kaydedilir.
- Periyodik (örn. haftalık batch job) olarak, kullanıcının seçim geçmişinden implicit ağırlıklar türetilir:
  ```
  Eğer kullanıcı sürekli "cheapest" planı seçiyorsa → weight_cost'u kademeli artır
  Eğer "fastest" seçiyorsa → weight_time'ı artır
  ```
  Basit yaklaşım: **hareketli ortalama (exponential moving average)** ile ağırlıkları güncelle — ani tek seferlik seçimlerin profili çok değiştirmesini önler.
- Kullanıcı her zaman `preferences` ekranından bu öğrenilen ağırlıkları görebilir ve manuel override edebilir (şeffaflık).

### 17.2 Edge Case'ler

- Yetersiz veri (< 5 yolculuk) → varsayılan `balanced` profil kullanılır, öğrenme devre dışı.
- Kullanıcının davranışı çok değişkense (bazen hız, bazen fiyat önceliyor) → sistem tek bir profile kilitlenmez, bağlama duyarlı öneri (V3+, kapsam dışı bırakılabilir, gelecek roadmap notu).

---

## 18. Park Yeri Optimizasyonu (V2)

### 18.1 Akış

1. Hedef durağa yaklaşırken (veya plan hesaplanırken), Places API ile hedefin **300-800m** çevresindeki otoparklar aranır.
2. Her otopark adayı için: yürüme mesafesi/süresi, tahmini ücret (varsa Places API'den veya statik veri kaynağından), doluluk tahmini (varsa "popular times" verisi).
3. Toplam **"varış-sonrası süre"** hesabına dahil edilir:
   ```
   effective_arrival_time = route_arrival_time + parking_search_time_estimate + walk_time
   ```
4. En düşük `effective_arrival_time` + kullanıcı tercihine uygun (ücretsiz tercih ediyorsa ücretsiz seçenekler öncelikli) otopark önerilir.

### 18.2 Edge Case'ler

- Otopark verisi bulunamayan bölge → "otopark bilgisi mevcut değil, tahmini süreye dahil edilmedi" uyarısı, kullanıcı manuel arama yapabilir.

---

## 19. Route-aware Search (Rota Üzeri Arama)

### 19.1 Akış

```
GET /api/v1/journeys/{id}/along-route?category=fuel&max_detour_minutes=5
```

1. Aktif planın polyline'ı alınır.
2. Polyline üzerinde belirli aralıklarla (örn. her 2 km) örnekleme noktaları çıkarılır.
3. Her örnekleme noktası etrafında (yarıçap: kullanıcı `max_detour_km`'sine göre) Places API `Nearby Search` çağrılır (kategori filtresiyle: `gas_station`, `pharmacy`, `restaurant` vb.).
4. Bulunan her POI için **gerçek sapma maliyeti** hesaplanır: `(rota_üzeri_nokta → POI → rota_üzeri_sonraki_nokta)` mesafesi ile `orijinal_rota_segment`i arasındaki fark.
5. Sapma maliyeti `max_detour_minutes` sınırının altındaki sonuçlar, sapma süresine göre sıralanarak döndürülür.

### 19.2 Edge Case'ler

- Rota kısa/tek segmentliyse (örn. 5 dk'lık yolculuk) → örnekleme noktası azdır, sonuç azlığı kullanıcıya net belirtilir.
- Aynı kategori için çok fazla sonuç (şehir merkezi, yoğun POI) → sapma süresine göre en iyi 5-10 sonuç sunulur, tam liste değil.

---
## 20. Araç Profili ve Yakıt/Menzil Yönetimi

### 20.1 Neden Önemli

Şu ana kadarki optimizasyon `vehicleType` alanını yalnızca kaba bir kategori (`gasoline`/`diesel`/`electric`/`hybrid`) olarak kullanıyordu. Bu, yakıt maliyeti tahminini ve eco-route hesaplamasını genel geçer/ortalama değerlerle yapmaya zorluyor — gerçek aracın tükettiğinden %30-40 sapabilen kaba tahminler ortaya çıkarabiliyor. Ayrıca elektrikli araçlarda **menzil (range)** kısıtı hiç modellenmiyordu; oysa EV kullanıcısı için "bu plan aracımın menzilini aşıyor mu, yolda şarj molası gerekiyor mu" sorusu kritik.

Kullanıcının aracını (marka/model/yıl, yakıt tipi, gerçek tüketim, tank/batarya kapasitesi, motor gücü, emisyon sınıfı, boyut/ağırlık) sisteme kaydetmesi, şu değer katmanlarını açar:

1. **İsabetli maliyet tahmini** — genel ortalama yerine aracın gerçek tüketim değeriyle hesaplanan yakıt/enerji maliyeti.
2. **EV menzil ve şarj molası planlaması** — toplam yolculuk mesafesi aracın menzilini aşıyorsa, rotaya otomatik şarj molası eklenmesi.
3. **Daha doğru eco-route** — Google Routes API'nin eco-route hesaplaması motor tipine göre değişir; gerçek aracın verisiyle daha isabetli sonuç.
4. **Erişim kısıtı farkındalığı** — düşük emisyonlu bölge (LEZ benzeri uygulamalar), ağırlık/yükseklik kısıtlı yollar gibi bazı araçları etkileyen (özellikle ticari araç/kamyonet senaryosunda, B2B saha ekibi için) kısıtların plana yansıtılması.
5. **Toll sınıfı doğruluğu** — bazı otoyol/köprü ücretlendirmeleri araç sınıfına (2+1, kamyonet vb.) göre değişir; genel tahmin yerine araca özgü ücret hesaplanabilir.
6. **Kişiselleştirilmiş park önerisi** — elektrikli araç kullanıcısına şarj imkânı olan otoparkların önceliklendirilmesi (V2/V3).

Bu özellik hem B2C (kullanıcı kendi aracını tanımlar) hem B2B (saha ekibindeki her aracın filoya kayıtlı, farklı tüketim/kısıt profiline sahip olması) senaryosunda doğrudan kullanılabilir.

### 20.2 Veri Modeli

**`vehicles`** (yeni tablo, `users` ile 1-N ilişki — bir kullanıcının birden fazla aracı olabilir, `is_default` ile varsayılan araç belirlenir)

| Kolon | Tip | Açıklama |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK) | |
| nickname | varchar | Kullanıcının verdiği isim, örn. "Benim Civic" |
| brand | varchar | Örn. "Honda" |
| model | varchar | Örn. "Civic" |
| model_year | int | |
| fuel_type | varchar | `gasoline`, `diesel`, `lpg`, `hybrid`, `plugin_hybrid`, `electric` |
| fuel_consumption_l_per_100km | decimal, nullable | Yakıtlı/hibrit araçlar için gerçek/beyan tüketim |
| energy_consumption_kwh_per_100km | decimal, nullable | Elektrikli/plug-in hibrit araçlar için |
| tank_capacity_liters | decimal, nullable | |
| battery_capacity_kwh | decimal, nullable | Elektrikli/plug-in hibrit için |
| usable_range_km | int, nullable | Kullanıcı tarafından girilebilir veya tüketim + kapasiteden hesaplanır |
| charging_connector_type | varchar, nullable | `type2`, `ccs`, `chademo` vb. (V3, şarj istasyonu eşleştirmesi için) |
| average_charging_speed_kw | decimal, nullable | Şarj molası süresi tahmini için (V3) |
| emission_class | varchar, nullable | Örn. `euro6`, `euro5` — düşük emisyon bölgesi kısıtları için |
| toll_class | varchar, nullable | Örn. `class1`, `class2` — otoyol/köprü ücret sınıfı |
| height_cm / width_cm / length_cm / weight_kg | int, nullable | Ticari araç / yükseklik-ağırlık kısıtlı yol senaryoları için (öncelikle B2B) |
| is_default | boolean | |
| created_at / updated_at | timestamp | |

`journeys` tablosuna eklenen kolon:

| Kolon | Tip | Açıklama |
|---|---|---|
| vehicle_id | UUID (FK, nullable) | Bu yolculuk için kullanılan araç. Boşsa kullanıcının varsayılan aracı veya genel ortalama değer kullanılır. |

`journey_plans` tablosuna eklenen kolonlar:

| Kolon | Tip | Açıklama |
|---|---|---|
| estimated_energy_cost | decimal | `total_fuel_cost_estimate` alanının yerini alır/genişletir — hem yakıt hem elektrik için genel isim |
| requires_charging_stop | boolean | EV menzil yetersizse true |
| charging_stop_count | int, default 0 | |

**`charging_stops`** (V3, plan içine otomatik eklenen şarj molaları)

| Kolon | Tip | Açıklama |
|---|---|---|
| id | UUID (PK) | |
| plan_id | UUID (FK) | |
| after_leg_order | int | Hangi bacaktan sonra ekleneceği |
| station_place_id | varchar, nullable | Places API'den bulunan şarj istasyonu |
| estimated_charging_minutes | int | |
| estimated_soc_arrival_percent | int | Şarj istasyonuna varıştaki tahmini batarya yüzdesi |

### 20.3 Yakıt/Enerji Maliyeti Hesabı — Güncellenmiş Algoritma

Bölüm 11.3'teki skorlama fonksiyonunda `TollCost + FuelCost` bileşeni artık şu şekilde hesaplanır:

```
Eğer vehicle.fuel_type in {gasoline, diesel, lpg}:
    energy_cost = (leg_distance_km / 100) × vehicle.fuel_consumption_l_per_100km × güncel_yakıt_fiyatı

Eğer vehicle.fuel_type in {electric, plugin_hybrid}:
    energy_cost = (leg_distance_km / 100) × vehicle.energy_consumption_kwh_per_100km × güncel_elektrik_birim_fiyatı

Eğer vehicle.fuel_type == hybrid (plug-in olmayan):
    energy_cost = (leg_distance_km / 100) × vehicle.fuel_consumption_l_per_100km × güncel_yakıt_fiyatı
    (hibrit araçlarda şehir içi/trafik yoğun segmentlerde tüketim düşüşü V3'te
     trafficRiskScore ile çarpanlı bir düzeltme faktörüyle modellenebilir — MVP'de basit tutulur)

Eğer kullanıcı hiç araç tanımlamadıysa (vehicle_id null):
    energy_cost = genel ortalama tüketim varsayımıyla hesaplanır (mevcut MVP davranışı, geriye dönük uyumluluk için korunur)
```

Güncel yakıt/elektrik birim fiyatı, MVP'de **sabit/manuel güncellenen bir konfigürasyon değeri** olarak tutulur (`fuel_prices` tablosu veya basit config); V2/V3'te bir üçüncü parti fiyat API'siyle (örn. günlük akaryakıt fiyat servisleri) otomatikleştirilebilir. Bu, kapsam dışına taşmaması için bilinçli bir MVP sınırlaması olarak dokümante edilir.

### 20.4 EV Menzil ve Şarj Molası Algoritması (V3)

Bu, klasik VRPTW çözümüne ek bir kısıt katmanı ekler: **State of Charge (SoC) kısıtlı rota planlama**.

```
1. Seçilen aracın usable_range_km değeri alınır (veya battery_capacity_kwh ve
   energy_consumption_kwh_per_100km üzerinden hesaplanır).
2. Kullanıcının yolculuk başındaki mevcut şarj yüzdesini (SoC) sorulur
   (varsayılan: %100, kullanıcı isterse değiştirir).
3. Optimizasyon motorunun ürettiği her aday plan için, bacak bacak (leg-by-leg)
   kümülatif enerji tüketimi hesaplanır:

   remaining_range_km = usable_range_km × (current_soc_percent / 100)
   for each leg in plan.legs:
       remaining_range_km -= leg.distance_km
       if remaining_range_km < safety_buffer_km (örn. %10 güvenlik payı):
           BU ADAYA ŞARJ MOLASI GEREKİYOR İŞARETLE
           break

4. Şarj molası gereken adaylarda:
   a. Menzilin biteceği bacak üzerinde, rotadan makul sapmayla (Bölüm 19'daki
      route-aware search mantığı, kategori = "ev_charging_station") en uygun
      şarj istasyonu aranır.
   b. Bulunan istasyon, o bacağın ARASINA yeni bir ara durak olarak eklenir
      (journey_stops'a sentetik bir "charging" tipi durak olarak, ya da
      charging_stops tablosuna ayrıca kaydedilir).
   c. Şarj süresi tahmini: (hedeflenen_soc% - istasyona_varış_soc%) / 100
      × battery_capacity_kwh / average_charging_speed_kw × 60 (dakika)
   d. Bu ek süre planın toplam süresine eklenir ve skorlama buna göre
      yeniden yapılır (şarj molası gereken adaylar, gerekmeyenlere göre
      doğal olarak zaman skorunda dezavantajlı çıkar — ekstra ceza
      eklemeye gerek yoktur, gerçek süre farkı zaten fonksiyona yansır).
5. Eğer rota üzerinde makul sapmada (varsayılan max 5 km) hiç şarj
   istasyonu bulunamazsa, bu aday "gerçekleştirilemez" (infeasible)
   olarak işaretlenir ve kullanıcıya "bu plan aracınızın menzilini aşıyor
   ve yakınında şarj istasyonu bulunamadı" uyarısı gösterilir.
```

**MVP kapsamı notu:** Menzil/şarj molası özelliği V3'e planlanmıştır (Bölüm 28, Faz 8'e dahil edilir — bkz. güncellenmiş yol haritası). MVP'de (Faz 3) elektrikli araç seçilebilir ve enerji maliyeti hesaplanır, ancak menzil kısıtı/otomatik şarj molası **henüz devreye alınmaz**; bu, kullanıcı arayüzünde "menzil planlaması yakında" şeklinde net olarak belirtilir — sessizce eksik bırakılmaz.

### 20.5 Erişim Kısıtları (Emisyon Bölgesi, Boyut/Ağırlık)

V2/V3 kapsamında, `vehicle.emission_class`, `vehicle.height_cm/weight_kg` gibi alanlar doluysa, optimizasyon motoru rotayı hesaplarken bu kısıtları `RouteOptions`'a ekler (Google Routes API'nin araç boyutu/ağırlığına duyarlı rota seçeneği desteklediği ölçüde kullanılır; desteklenmeyen kısıtlar için basit bir kural tabanlı filtre — örn. bilinen düşük emisyon bölgesi poligonlarına göre segment kontrolü — uygulanabilir). Bu özellik öncelikle **B2B / ticari araç senaryosu** için değerlidir; B2C tarafında çoğu kullanıcı için bu alanlar boş kalacağı için performansa/karmaşıklığa etkisi olmaz (alanlar null ise ilgili kontrol tamamen atlanır).

### 20.6 API Değişiklikleri

Yeni endpoint'ler:
```
POST   /api/v1/vehicles                     # Yeni araç ekle
GET    /api/v1/vehicles                     # Kullanıcının araçlarını listele
PUT    /api/v1/vehicles/{id}                # Araç bilgisi güncelle
DELETE /api/v1/vehicles/{id}
PUT    /api/v1/vehicles/{id}/set-default     # Varsayılan araç olarak işaretle
```

`POST /api/v1/journeys/{id}/optimize` isteğine eklenen alan:
```json
{
  "vehicleId": "uuid-or-null",
  "currentStateOfChargePercent": 80
}
```

`vehicleId` boş bırakılırsa, kullanıcının varsayılan aracı (varsa) otomatik kullanılır; hiç aracı yoksa Bölüm 11'deki genel ortalama tüketim davranışına düşülür (geriye dönük uyumluluk).

### 20.7 Mobil Uygulama Değişiklikleri

- Yeni ekran: **"Araçlarım"** (profil sekmesi altında) — araç ekleme formu (marka/model seçimi için basit bir dropdown + yıl + yakıt tipi; tüketim değeri kullanıcı biliyorsa girilir, bilmiyorsa yakıt tipine göre makul bir varsayılan değer önerilir ve kullanıcı isterse düzenler).
- Journey Builder ekranına araç seçici eklenir (varsayılan araç otomatik seçili gelir, kullanıcı değiştirebilir).
- Elektrikli araç seçiliyse, yolculuk başlangıcında "mevcut şarj yüzdeniz nedir?" sorusu (basit bir slider) sorulur — bu adım yakıtlı araçlarda gösterilmez.
- Plan sonuç kartlarında, şarj molası gerektiren planlarda küçük bir 🔋 rozeti ve "1 şarj molası (~25 dk)" gibi bir not gösterilir.

### 20.8 Edge Case'ler (Araç Profili)

- Kullanıcı tüketim değerini bilmiyorsa/girmezse → yakıt tipine göre Türkiye'de yaygın segment ortalamaları varsayılan olarak kullanılır (örn. benzinli orta segment ~7 l/100km), ve UI'da bunun bir **tahmin** olduğu, doğruluğu artırmak için gerçek değerin girilmesinin önerildiği belirtilir.
- Kullanıcı yolculuk sırasında aracını değiştirirse (örn. iki araçlı hane) → mevcut plan geçersiz kılınmaz otomatik ama "farklı araç seçildi, maliyet tahminleri güncel değil, yeniden optimize etmek ister misiniz?" uyarısı gösterilir.
- Elektrikli araçta `usable_range_km` hem doğrudan girilmiş hem `battery_capacity_kwh`+`energy_consumption_kwh_per_100km`'den hesaplanabilir durumdaysa → doğrudan girilen değer önceliklidir (kullanıcının gerçek/güncel menzil tahminine genelde araç ekranından baktığı ve daha güncel olduğu varsayılır).
- Araç silinirken bu araca bağlı geçmiş yolculuklar varsa → `journeys.vehicle_id` `NULL`'a çekilir (geçmiş kayıt bozulmaz, sadece araç referansı kalkar), araç kaydı hard-delete edilir.
- Kullanıcı `weight_kg`/`height_cm` gibi B2B'ye özgü alanları boş bırakırsa (B2C kullanıcıların büyük çoğunluğu) → ilgili kısıt kontrolleri tamamen atlanır, herhangi bir performans/UX yükü oluşturmaz.
- Şarj molası için makul sapmada istasyon bulunamazsa (Bölüm 20.4 adım 5) → plan "gerçekleştirilemez" olarak işaretlenir, sessizce sunulmaz.

### 20.9 Test Senaryoları (Ek)

- Aynı mesafe/rota için farklı `fuel_consumption_l_per_100km` değerlerine sahip iki araçla optimize edildiğinde → enerji maliyetlerinin orantılı şekilde farklı çıktığı doğrulanır.
- `vehicle_id` verilmeden optimize edildiğinde → geriye dönük uyumlu genel ortalama davranışın hâlâ çalıştığı doğrulanır (regresyon testi).
- EV + düşük SoC + uzun mesafe senaryosunda → `requires_charging_stop = true` ve planın süresine şarj molası süresinin eklendiği doğrulanır (mock Places API ile şarj istasyonu stub'lanır).
- Rota üzerinde hiç şarj istasyonu bulunamayan mock senaryosunda → planın `infeasible` olarak işaretlendiği doğrulanır.
- `height_cm`/`weight_kg` dolu bir ticari araçla, bilinen bir yükseklik kısıtlı segment testi (mock veri) → o segmentin rota adaylarından elendiği doğrulanır.

---

## 21. Yolculuk Sonrası Analiz ve Gider Takibi

### 21.1 Amaç

Bölüm 20'de anlatılan araç profili, yolculuk **öncesinde** maliyet/enerji tahmini yapmamızı sağlıyor. Bu bölüm ise yolculuk **tamamlandıktan sonra**, gerçekte ne kadar yakıt/enerji harcandığını ve gerçekte ne kadar maliyet oluştuğunu hesaplayıp kullanıcıya göstermeyi kapsar. İki önemli fayda sağlar:

1. **Kullanıcıya doğrudan değer:** "Bu yolculuk sana gerçekte kaça mal oldu, ne kadar yakıt/enerji harcadın" — özellikle saha satış/kurye gibi B2B kullanıcılar için gider takibi/raporlama ihtiyacını karşılar; B2C kullanıcı için de "bu ay araca ne kadar harcadım" sorusuna cevap olur.
2. **Sistemin kendi kendini kalibre etmesi:** Tahmin edilen (`estimated`) değerler ile gerçekleşen (`actual`) değerler karşılaştırılarak, hem genel tahmin modelinin hem de kullanıcının aracına özgü tüketim değerinin zamanla daha isabetli hale gelmesi sağlanır (bkz. 21.5).

### 21.2 Veri Toplama Yöntemleri

Gerçek tüketim/maliyeti üç farklı hassasiyet seviyesinde toplayabiliriz; kullanıcıya en az çaba gerektiren yöntem varsayılan olur, daha hassas yöntemler opsiyonel olarak sunulur:

| Yöntem | Hassasiyet | Kullanıcı Efor | Nasıl Çalışır |
|---|---|---|---|
| **A — GPS bazlı otomatik tahmin** | Orta | Yok (otomatik) | Yolculuk boyunca GPS'ten ölçülen gerçek kat edilen mesafe × aracın kayıtlı tüketim oranı (`fuel_consumption_l_per_100km` / `energy_consumption_kwh_per_100km`) ile hesaplanır. Varsayılan yöntem budur. |
| **B — Odometre girişi** | Yüksek | Düşük (2 sayı girme) | Kullanıcı yolculuk başında ve sonunda kilometre sayacı değerini girerse, gerçek kat edilen mesafe GPS tahmininden daha kesin hale gelir (özellikle şehir içi GPS sapmalarında). |
| **C — Manuel fiş/dolum girişi** | En yüksek | Orta (yolculuk sonrasında form doldurma) | Kullanıcı gerçekte satın aldığı yakıt miktarını (litre) ve ödediği tutarı (veya elektrikli araçta şarj için ödediği tutarı) girer. Bu, hem o yolculuğa hem de genel tüketim kalibrasyonuna en değerli veridir. |

Kullanıcı hiçbir ek işlem yapmazsa sistem otomatik olarak **Yöntem A**'yı uygular ve sonucu "tahmini" (`entry_method: gps_estimated`) olarak işaretler; kullanıcı isterse yolculuk sonunda B veya C yöntemiyle daha hassas veri girip bunu güncelleyebilir.

### 21.3 Veri Modeli

`journeys` tablosuna eklenen kolonlar:

| Kolon | Tip | Açıklama |
|---|---|---|
| actual_distance_meters | int, nullable | Yolculuk boyunca GPS'ten ölçülen gerçek kat edilen mesafe |
| actual_duration_seconds | int, nullable | Gerçek geçen süre (başlangıç-bitiş zaman damgası farkı) |
| completed_at | timestamp, nullable | Yolculuğun "tamamlandı" olarak işaretlendiği an |
| completion_status | varchar | `full` (tüm duraklar ziyaret edildi), `partial` (bazı duraklar atlandı/iptal edildi), `abandoned` (yolculuk tamamlanmadan bırakıldı) |

**`trip_expenses`** (yeni tablo — bir yolculuğun gerçekleşen maliyet/tüketim kaydı, `journeys` ile 1-1 ilişki)

| Kolon | Tip | Açıklama |
|---|---|---|
| id | UUID (PK) | |
| journey_id | UUID (FK, unique) | |
| vehicle_id | UUID (FK) | Hangi araçla yapıldığı (Bölüm 20'deki `vehicles` tablosuna referans) |
| entry_method | varchar | `gps_estimated`, `odometer`, `manual_receipt` |
| odometer_start_km / odometer_end_km | int, nullable | Yöntem B için |
| actual_fuel_liters | decimal, nullable | Yakıtlı araç, Yöntem C'de kullanıcı girer; A/B'de sistem hesaplar |
| actual_energy_kwh | decimal, nullable | Elektrikli araç için karşılığı |
| actual_fuel_cost | decimal | Gerçekleşen (veya en iyi tahminle hesaplanan) yakıt/enerji maliyeti |
| actual_toll_cost | decimal, nullable | Kullanıcı fiş/geçiş kaydı girerse; girmezse plan tahminindeki `total_toll_cost` baz alınır |
| estimated_fuel_cost_at_planning | decimal | Karşılaştırma için, o yolculuğun planlama anındaki tahmini maliyeti (denormalize edilmiş kopya — tarihsel karşılaştırmanın plan güncellense bile bozulmaması için) |
| variance_percent | decimal (hesaplanan/generated) | `(actual_fuel_cost - estimated_fuel_cost_at_planning) / estimated_fuel_cost_at_planning × 100` |
| receipt_photo_url | varchar, nullable | Yöntem C'de kullanıcı fiş fotoğrafı eklerse (V3, opsiyonel — OCR ile otomatik okuma da V3+ kapsamına not düşülür) |
| created_at | timestamp | |

### 21.4 Hesaplama Akışı

```
1. Kullanıcı son durağa vardığını işaretler / yolculuğu "Tamamla" der.
2. Sistem journeys.actual_distance_meters ve actual_duration_seconds değerlerini
   GPS geçmişinden (uygulama önden foreground'da konum örneklemesi tuttuysa)
   veya seçili planın gerçekleşen bacaklarının toplamından hesaplar.
3. Varsayılan olarak (Yöntem A):
   actual_fuel_liters = (actual_distance_meters / 1000 / 100)
                          × vehicle.fuel_consumption_l_per_100km
   actual_fuel_cost   = actual_fuel_liters × güncel_yakıt_fiyatı
   (elektrikli araçta enerji/kwh karşılığı ile aynı mantık)
4. Kullanıcıya bir "Yolculuk Özeti" ekranı gösterilir:
     - Planlanan tahmini maliyet: ₺155
     - Gerçekleşen (tahmini) maliyet: ₺162
     - "İsterseniz gerçek yakıt fişinizi girerek bu tahmini kesinleştirebilirsiniz"
       [Fiş/Dolum Bilgisi Gir] butonu (opsiyonel)
5. Kullanıcı Yöntem B veya C ile veri girerse, trip_expenses güncellenir,
   entry_method değişir, variance_percent yeniden hesaplanır.
6. Kayıt route_feedback'e (Bölüm 17) bağlanarak kişiselleştirme ve
   kalibrasyon döngüsüne dahil edilir (bkz. 21.5).
```

### 21.5 Tahmin Kalibrasyonu (Öğrenme Döngüsü)

Bu, Bölüm 17'deki `PreferenceLearningService`nin doğal bir uzantısıdır — orada kullanıcının **tercih ağırlıkları** öğreniliyordu, burada aracın **gerçek tüketim değeri** öğrenilir:

```
Periyodik (haftalık) batch job:
  Her araç için, son N (örn. 10) yolculuğun trip_expenses kayıtlarından
  (özellikle entry_method = manual_receipt veya odometer olanlardan,
  bunlar gps_estimated'a göre daha güvenilir kabul edilir)
  ağırlıklı ortalama gerçek tüketim (l/100km veya kWh/100km) hesaplanır.

  Eğer bu ortalama, vehicle.fuel_consumption_l_per_100km değerinden
  anlamlı ölçüde (örn. > %10) sapıyorsa:
    Kullanıcıya bildirim: "Aracınızın gerçek tüketimi kayıtlı değerden
    farklı görünüyor (7.2 l/100km yerine 8.1 l/100km). Güncellemek
    ister misiniz?" [Güncelle] [Yoksay]

  Kullanıcı onaylarsa vehicle.fuel_consumption_l_per_100km güncellenir
  ve bundan sonraki tüm ÖN tahminler (Bölüm 20.3) daha isabetli olur.
```

Bu tasarımda **otomatik/sessiz güncelleme yapılmaz** — kullanıcı onayı şarttır. Bunun nedeni: tek seferlik anormal bir yolculuk (örn. klima sürekli açık, çok yüklü bagaj, şehir dışı vs.) ortalamayı yanlış yönde çekmemeli; kullanıcı bilgilendirilip karar kendisine bırakılır.

### 21.6 Geçmiş ve İstatistik Görünümü

Kullanıcıya sunulan yeni ekranlar/veri:

- **Yolculuk Geçmişi listesi:** her yolculuk için planlanan vs. gerçekleşen maliyet/süre/mesafe yan yana.
- **Araç bazlı özet (Bölüm 20'deki `vehicles` ile ilişkili):** "Bu ay Civic ile: 340 km, ₺612 yakıt, ortalama 7.4 l/100km."
- **Genel gider özeti:** haftalık/aylık toplam yakıt+toll gideri, basit bir çizgi/bar grafikle (mobilde `recharts`/`victory-native` gibi bir kütüphaneyle, MVP'de basit sayısal özet yeterli, grafik V2'ye bırakılabilir).
- **Tahmin doğruluğu göstergesi (şeffaflık amaçlı, V3):** "Son 20 yolculukta tahminleriniz ortalama %6 sapmayla gerçekleşti" gibi meta-bilgi — kullanıcıya sistemin ne kadar güvenilir olduğunu gösterir.

### 21.7 API Değişiklikleri

```
POST   /api/v1/journeys/{id}/complete
       # Body: { "completionStatus": "full", "actualDistanceMeters": 45300, "actualDurationSeconds": 4700 }
       # GPS bazlı otomatik tahmini tetikler, trip_expenses kaydı oluşturur

PUT    /api/v1/journeys/{id}/expenses
       # Body (Yöntem B): { "entryMethod": "odometer", "odometerStartKm": 18420, "odometerEndKm": 18465 }
       # Body (Yöntem C): { "entryMethod": "manual_receipt", "actualFuelLiters": 34.2, "actualFuelCost": 175.0 }

GET    /api/v1/journeys/{id}/expenses          # Tek yolculuğun gider özeti
GET    /api/v1/vehicles/{id}/stats?period=monthly   # Araç bazlı toplam km/maliyet/ortalama tüketim
GET    /api/v1/users/me/expense-summary?period=monthly  # Kullanıcının tüm araçlar toplam gideri
```

### 21.8 Mobil Uygulama Değişiklikleri

- Yolculuk tamamlandığında (son durakta "Vardım" veya "Yolculuğu Bitir") otomatik olarak **Yolculuk Özeti** ekranı açılır: planlanan vs. gerçekleşen maliyet karşılaştırması + opsiyonel "Fiş/Dolum Bilgisi Gir" kısayolu.
- Profil altında yeni **"Giderlerim"** sekmesi: araç bazlı ve genel gider özetleri, geçmiş yolculuk listesi.
- Araç detay ekranında (Bölüm 20.7'deki "Araçlarım" ekranının alt sayfası) o araca ait toplam km ve gider geçmişi.
- Kalibrasyon bildirimi geldiğinde ("aracınızın gerçek tüketimi farklı görünüyor") basit bir onay/red diyaloğu.

### 21.9 Edge Case'ler

- Kullanıcı yolculuğu hiç "tamamlandı" olarak işaretlemezse → sistem belirli bir süre (örn. son aktiviteden 3 saat) sonra yolculuğu otomatik `abandoned` durumuna çeker; bu yolculuklar gider istatistiklerine **dahil edilmez** (yanıltıcı olmaması için), kullanıcı isterse manuel tamamlayıp geriye dönük veri girebilir.
- GPS bazlı `actual_distance_meters`, planlanan mesafeden aşırı sapıyorsa (örn. %50+ fazla — kullanıcı plan dışı yerlere uğradıysa) → sistem bunu "planlanan rotadan belirgin sapma tespit edildi, tahmini gider bu nedenle daha az güvenilir olabilir" notuyla işaretler, kullanıcıya manuel girişi önerir.
- Yöntem C'de kullanıcı yanlış birim girerse (örn. TL'yi litre alanına yazarsa) → makul aralık kontrolü (örn. tek dolumda 200 litreden fazla, gasoline bir binek araç için) tetiklenir, kullanıcıya "bu değer beklenenden yüksek görünüyor, kontrol eder misiniz?" uyarısı — engellenmez, sadece uyarılır (kullanıcının gerçek bir durumu olabilir, örn. ticari araç).
- Yolculuk `partial` tamamlandıysa (bazı duraklara uğranmadı) → gerçekleşen mesafe/maliyet yine de kaydedilir ama "eksik tamamlanmış yolculuk" etiketiyle, istatistiklerde ayrı gösterilir (tam yolculuklarla karıştırılmaz).
- Kullanıcının o yolculukta hiç araç seçmediği (Bölüm 20.6'da `vehicleId` boş bırakılmış) durumlarda → gerçek tüketim hesaplanamaz, sadece gerçek mesafe/süre kaydedilir, gider tahmini "araç bilgisi girilmediği için hesaplanamadı" notuyla boş bırakılır.
- Çoklu kullanıcı aynı aracı paylaşıyorsa (V3+, kapsam dışı not): MVP'de her araç tek kullanıcıya bağlıdır, paylaşımlı araç/filo senaryosu B2B panelinin kapsamına bırakılır.

### 21.10 Test Senaryoları (Ek)

- Yöntem A (GPS) ile tamamlanan bir yolculukta, `actual_distance_meters` ve aracın tüketim oranı verildiğinde `actual_fuel_cost` hesabının doğru yapıldığı doğrulanır.
- Yöntem B (odometre) girişi sonrası `trip_expenses.entry_method`'un güncellendiği ve mesafenin odometre farkına göre yeniden hesaplandığı doğrulanır.
- Yöntem C (manuel fiş) girişinde, kullanıcının girdiği `actualFuelLiters`/`actualFuelCost` değerlerinin sisteme ait GPS tahminini **ezdiği** (override ettiği) ve `variance_percent`in doğru hesaplandığı doğrulanır.
- `abandoned` durumuna düşen bir yolculuğun gider istatistiklerine dahil edilmediği doğrulanır.
- Kalibrasyon batch job'ının, son 10 yolculuğun ağırlıklı ortalamasını doğru hesapladığı ve %10 eşiğinin altındaki sapmalarda bildirim tetiklemediği (yalnızca eşik aşıldığında tetiklendiği) doğrulanır.
- Kullanıcı kalibrasyon bildirimini reddettiğinde `vehicle.fuel_consumption_l_per_100km` değerinin **değişmediği** doğrulanır (sessiz otomatik güncelleme olmadığının regresyon testi).

---

## 22. Güvenlik, Gizlilik ve KVKK

### 22.1 Veri Sınıflandırması

| Veri Türü | Hassasiyet | Önlem |
|---|---|---|
| Konum verisi (GPS, geçmiş yolculuklar) | Yüksek | Şifreli transport (TLS), veritabanında rest-at şifreleme (managed DB genelde sağlar), gereksiz uzun süre saklama yapılmaz (retention policy: örn. 12 ay sonra anonimleştirme) |
| Kullanıcı kimlik bilgileri | Yüksek | Şifre `bcrypt`/`argon2` hash, JWT kısa ömürlü access token (15 dk) + refresh token (7 gün, rotasyonlu) |
| Doğal dil girdisi (raw_nlp_input) | Orta | LLM sağlayıcısına gönderilirken üçüncü taraf veri işleme sözleşmesi (Anthropic API zero-retention seçenekleri değerlendirilmeli), kullanıcıya "bu metin AI'ye gönderiliyor" bilgilendirmesi |
| Ödeme/ücret bilgisi (toll, fuel) | Düşük | Sadece tahmini, gerçek ödeme entegrasyonu MVP kapsamında yok |

### 22.2 KVKK / Gizlilik Uyumluluğu

- Açık rıza metni: konum verisinin işlenmesi için kayıt sırasında açık onay.
- Kullanıcının verilerini **silme hakkı** (hesap silme → tüm `journeys`, `journey_stops` cascade silinir; anonimleştirilmiş istatistik verisi ayrı tutulabilir, kullanıcıyla ilişkilendirilemez hale getirilir).
- Veri işleme envanterinde LLM sağlayıcısı ve harita sağlayıcısı üçüncü taraf olarak belirtilir.
- Konum verisi **arka planda** (background location) MVP'de toplanmaz — bu bilinçli bir tasarım kararı, hem gizlilik hem iOS/Android izin karmaşıklığını MVP'den çıkarmak için.

### 22.3 API Güvenliği

- Tüm endpoint'ler JWT ile korunur, `journeys` gibi kaynaklara erişimde **sahiplik kontrolü** (bir kullanıcı başkasının yolculuğunu göremez/değiştiremez) — her serviste `journey.getUserId().equals(currentUserId)` kontrolü zorunlu.
- Rate limiting (Bucket4j veya Spring Cloud Gateway) — brute force ve API maliyeti kötüye kullanımına karşı.
- Google/LLM API anahtarları **asla mobil uygulamada bulunmaz**, sadece backend'de env variable olarak tutulur (mobil uygulama backend'e istek atar, backend dış API'yi çağırır).

---

## 23. Performans ve Ölçeklenebilirlik

### 23.1 Hedef SLA'lar (MVP)

| İşlem | Hedef Süre |
|---|---|
| Basit optimize isteği (≤5 durak) | < 2 sn |
| Karmaşık optimize isteği (6-8 durak) | < 4 sn |
| NLP parse | < 4 sn |
| Departure suggestion | < 3 sn |
| Route-aware search | < 2 sn |

### 23.2 Ölçeklenebilirlik Stratejisi

- Backend stateless → yatay ölçeklenebilir (birden fazla instance, load balancer arkasında).
- Redis cache ile Google API çağrı sayısı minimize edilir (maliyet + performans).
- Ağır optimizasyon işleri (B2B, 20+ durak) için ayrı bir worker havuzu / queue (RabbitMQ veya basit `@Async` thread pool, sonra Kubernetes Job'a evrilebilir).
- Veritabanı: PostgreSQL read replica (V3+, kullanıcı sayısı arttıkça).

---

## 24. Maliyet Analizi (Yaklaşık, Sağlayıcı Fiyatlandırmasına Göre Değişir)

> Not: Google ve Anthropic API fiyatlandırmaları zamanla değişebilir; üretime geçmeden önce güncel fiyat sayfaları kontrol edilmelidir. Aşağıdaki tablo **mimari planlama** amaçlı kaba bir çerçevedir, kesin fiyat taahhüdü değildir.

| Kullanıcı Sayısı | Aylık Optimize İsteği (tahmini) | Google API Maliyet Kalemi | LLM API Maliyet Kalemi | Notlar |
|---|---|---|---|---|
| 100 kullanıcı | ~3.000 istek | Distance Matrix + Routes çağrıları, cache ile azaltılmış | Düşük hacim | Ücretsiz/deneme kotalarıyla büyük ölçüde karşılanabilir |
| 1.000 kullanıcı | ~30.000 istek | Cache oranı arttıkça marjinal maliyet düşer | Orta hacim, günlük NLP limiti önemli | Bu ölçekte maliyet izleme (dashboard) şart |
| 10.000 kullanıcı | ~300.000 istek | Anlamlı bütçe kalemi, sözleşme bazlı fiyatlandırma değerlendirilmeli | Yüksek hacim, LLM çağrısını yalnızca NLP girişinde tutmak kritik | B2B modelde müşteri başına maliyet/gelir analizi (unit economics) yapılmalı |

**Maliyet azaltma prensipleri:**
1. `computeRouteMatrix` tercih et (N² yerine 1 çağrı).
2. Cache-first (Redis, 2-5 dk TTL trafik verisi için).
3. LLM'i yalnızca kullanıcı doğal dil girdisi kullandığında çağır, manuel form girişinde hiç çağırma.
4. Final 3 aday için detaylı `computeRoutes`, ön eleme için sadece matris.

---

## 25. Edge Case Kataloğu (Kapsamlı)

### 25.1 Girdi / Veri Kalitesi
- Kullanıcı 0 durak ile optimize etmeye çalışırsa → 400 hatası, "en az 1 durak ekleyin".
- Aynı koordinatta iki durak (kullanıcı yanlışlıkla aynı yeri iki kez eklerse) → sistem tespit eder, "bu durak zaten eklenmiş, birleştirmek ister misiniz?" uyarısı.
- Geçersiz/erişilemez koordinat (denizin ortası, kapalı askeri bölge vb.) → Google API'den route bulunamadı hatası, kullanıcıya net mesaj.
- Aşırı uzak durak (örn. şehirlerarası, 500+ km) → sistem bunu engellemez ama "bu bir şehirlerarası yolculuk, tahminler daha az kesin olabilir" uyarısı.

### 25.2 Zaman Penceresi Çelişkileri
- İki `critical` durağın zaman pencereleri, aralarındaki mesafe göz önüne alındığında **fiziksel olarak imkansızsa** (örn. A'dan B'ye min 40 dk sürüyor ama A'nın penceresi 12:00'de bitiyor, B'nin 12:10'da) → sistem optimizasyon öncesi bunu tespit eder ve "Bu iki durağı aynı planda karşılamak mümkün değil" hatası döner, kullanıcıdan önceliklendirme ister.
- Zaman penceresi geçmişte kalmış (örn. bugün saat 15:00'te "bu sabah 09:00'a kadar" gibi bir kısıt girilmişse) → validasyon hatası.
- `time_window_start` > `time_window_end` → validasyon hatası.

### 25.3 Trafik / Rota
- Google API'nin trafik verisi olmayan bölge (kırsal, düşük veri yoğunluğu) → geniş güven aralığı, "tahmin sınırlı veri ile yapıldı" etiketi.
- Kaza/yol kapanması nedeniyle rota tamamen kesilmiş → alternatif rota otomatik aranır, hiç alternatif yoksa kullanıcıya net bilgilendirme.
- Feribot/köprü gibi zaman tarifeli geçişler → MVP kapsamında özel olarak modellenmez, Google'ın döndürdüğü süre baz alınır (bilinen sınırlama olarak dokümante edilir).

### 25.4 Cihaz / Konum
- GPS izni verilmemiş → kullanıcı manuel başlangıç adresi girebilir, konum tabanlı özellikler (mevcut konumdan otomatik başlangıç) devre dışı kalır.
- GPS sinyali zayıf/yanlış (şehir içi yüksek binalar, "urban canyon" etkisi) → son bilinen doğru konum + zaman aşımı ile yaklaşık pozisyon kullanılır, kesinlik düşük olduğunda kullanıcıya belirtilir.
- Uygulama arka plana alındığında (V2 aktif yolculuk takibi) → iOS/Android'in arka plan kısıtlamaları nedeniyle güncellemeler gecikebilir; bu bilinen bir sınırlama olarak UI'da not düşülür.

### 25.5 Eşzamanlılık / Çoklu Cihaz
- Kullanıcı aynı yolculuğu iki cihazdan aynı anda düzenlerse → "son yazan kazanır" (last-write-wins) + optimistic locking (`version` kolonu, JPA `@Version`) ile çakışma tespiti; çakışma durumunda istemciye 409 Conflict + güncel veri.

### 25.6 Dış Servis Kesintileri
- Google API tamamen erişilemezse → tüm optimize istekleri graceful şekilde reddedilir, kullanıcıya "harita servisi şu anda kullanılamıyor" mesajı, retry butonu.
- LLM API erişilemezse → NLP girişi devre dışı, manuel form her zaman çalışır durumda kalır (kritik: NLP asla tek giriş yolu olmamalı).

### 25.7 İş Mantığı Kenar Durumları
- Kullanıcı `returnToStart: false` seçip ama hedef belirtmezse → son durak otomatik hedef kabul edilir, bu davranış UI'da açıkça belirtilir.
- Tüm duraklar `low` öncelikli ve zaman kısıtı hiç yoksa → sistem sadece mesafe/süre bazlı optimize eder (klasik TSP'ye düşer), bu normal ve beklenen davranıştır.
- Kullanıcı bir planı seçtikten sonra durak eklerse/çıkarırsa → mevcut plan geçersiz kılınır (`is_selected = false`), yeniden optimize edilmesi gerektiği açıkça belirtilir.

---

## 26. Test Stratejisi ve Senaryoları

### 26.1 Test Piramidi

```
        ▲
       / \       E2E (Detox/Maestro) — az sayıda, kritik akışlar
      /---\
     /     \     Integration (Testcontainers + Spring) — orta sayıda
    /-------\
   /         \   Unit (JUnit/Jest) — çok sayıda, hızlı
  /-----------\
```

### 26.2 Backend Unit Test Senaryoları

**`OptimizationEngine` testleri:**
- 2 durak, zaman kısıtı yok → beklenen: mesafe/süre bazlı en kısa sıralama.
- 3 durak, biri `critical` deadline'lı → beklenen: deadline ihlal edilmeyen sıralamalar arasından en iyi skorlu seçilir.
- Zaman penceresi fiziksel olarak imkansız kombinasyon → beklenen: `InfeasiblePlanException` fırlatılır.
- Tüm duraklar aynı önceliğe sahip → beklenen: sadece skorlama fonksiyonuna göre sıralama, deterministik sonuç (aynı girdi → aynı çıktı, test edilebilirlik için önemli).
- `avoidTolls: true` verildiğinde → beklenen: toll içeren adaylar ya elenir ya da skorlamada ağır cezalandırılır.
- Farklı `profileType` (fast/economic/stress_free) aynı girdiyle çalıştırıldığında → beklenen: farklı planlar `recommended` olarak seçilir (ağırlıkların etkisi doğrulanır).

**`ExplainabilityService` testleri:**
- İki plan arasında sadece süre farkı varsa → gerekçe metninde süre farkı vurgulanmalı.
- Planlar çok benzikse (fark < eşik) → nötr mesaj döner.

**`JourneyNlpParsingService` testleri (mock LLM response ile):**
- Geçerli JSON döner → doğru parse edilip DTO'ya map edilir.
- Bozuk/şema dışı JSON döner → `NlpParsingException`, kullanıcıya fallback.
- Zaman aşımı → `NlpParsingException` (timeout türü), fallback tetiklenir.

**`GoogleRoutesProvider` testleri (WireMock ile Google API mock'lanır):**
- Başarılı yanıt → doğru şekilde `RouteCandidate`'a map edilir.
- 429 (rate limit) yanıtı → circuit breaker devreye girer, retry-after uyulur.
- 5xx yanıt → belirlenen sayıda retry sonrası hata fırlatılır.

### 26.3 Backend Integration Test Senaryoları (Testcontainers + PostgreSQL)

- `POST /journeys` → `POST /journeys/{id}/optimize` uçtan uca akış (Google API WireMock ile stub'lanır), veritabanına doğru kayıt (journey, stops, plans, legs) atıldığı doğrulanır.
- Yetkisiz kullanıcı başka bir kullanıcının journey'sine erişmeye çalışırsa → 403.
- Aynı journey'e eşzamanlı iki güncelleme → optimistic locking, 409 Conflict testi.
- Migration'ların (Flyway) temiz bir veritabanında sorunsuz çalıştığı doğrulanır.

### 26.4 Mobil Uygulama Test Senaryoları

**Unit (Jest):**
- `formatDuration` fonksiyonu: 65 dakika → "1s 5dk" formatlaması.
- `deepLinks` fonksiyonu: koordinat verildiğinde doğru Apple Maps / Google Maps URL şeması üretilmesi.
- Zod şema validasyonu: eksik zorunlu alan → validasyon hatası.

**Component (React Native Testing Library):**
- `PlanCard` bileşeni: farklı plan verisiyle render edildiğinde doğru süre/maliyet/gerekçe gösterimi.
- `StopList`: durak ekleme/silme etkileşimlerinin state'i doğru güncellemesi.

**E2E (Detox veya Maestro):**
- Senaryo 1: Kullanıcı giriş yapar → yeni yolculuk oluşturur → 2 durak ekler → optimize eder → sonuç görür → bir plan seçer → "Navigasyonu Başlat" ile deep link tetiklenir (mock'lanmış intent kontrolü).
- Senaryo 2: Kullanıcı doğal dil ile durak girer → parse sonucu onay ekranında görülür → onaylar → optimize akışına geçer.
- Senaryo 3: İnternet bağlantısı yokken optimize denemesi → kullanıcı dostu hata mesajı gösterilir, uygulama çökmemelidir.

### 26.5 Algoritma Doğrulama / Regresyon Testleri

- Bilinen küçük problemler için **elle hesaplanmış optimal sonuç** ile algoritma çıktısı karşılaştırılır (örn. 4 durak, elle çözülebilir bir TSP örneği).
- Büyük veri setlerinde (15-20 durak, sentetik veri) algoritmanın **makul sürede** (SLA içinde) sonuç ürettiği performans testiyle doğrulanır.
- "Skor fonksiyonu monotonluğu" testi: bir adayın süresini yapay olarak artırdığımızda (diğer her şey sabit), `fast` profilinde skorunun kötüleştiği (yani daha az tercih edilir hale geldiği) doğrulanır — algoritmanın mantıksal tutarlılığı için sağlamlık testi.

### 26.6 Güvenlik Testleri

- SQL injection denemeleri (JPA parametreli sorgular kullanıldığından teorik olarak korunaklı, yine de otomatik tarama — OWASP ZAP).
- JWT süresi dolmuş token ile istek → 401.
- Rate limit aşımı → 429.

---

## 27. DevOps / CI-CD / Deployment

### 27.1 Ortamlar

```
local (docker-compose) → staging → production
```

### 27.2 CI/CD Pipeline (GitHub Actions)

**Backend pipeline:**
```
on: push/PR
1. Checkout
2. JDK 21 setup
3. mvn test (Testcontainers ile integration testler dahil)
4. mvn package
5. Docker image build + push (registry)
6. (main branch'te) staging'e otomatik deploy
7. (release tag'inde) production'a manuel onaylı deploy
```

**Mobil pipeline:**
```
on: push/PR
1. Checkout
2. Node setup
3. npm ci
4. npm run lint && npm run typecheck
5. jest test
6. (main branch'te) eas build --profile preview (test dağıtımı)
7. (release tag'inde) eas build --profile production + eas submit
```

### 27.3 Ortam Değişkenleri (Örnek Liste)

Backend `.env` / Spring profile:
```
DATABASE_URL, DATABASE_USER, DATABASE_PASSWORD
REDIS_URL
JWT_SECRET, JWT_ACCESS_TTL, JWT_REFRESH_TTL
GOOGLE_MAPS_API_KEY
ANTHROPIC_API_KEY
SENTRY_DSN
```

Mobil `.env` (Expo `app.config.ts` üzerinden):
```
API_BASE_URL
GOOGLE_MAPS_IOS_API_KEY (harita render için, ayrı kısıtlı key)
SENTRY_DSN
```

**Kritik güvenlik notu:** Backend API anahtarları asla mobil `.env`'e konmaz; mobil sadece kendi backend'ine konuşur.

---

## 28. Yol Haritası (Detaylı Faz Planı)

### Faz 1 — Proje İskeleti
- React Native + Expo + TypeScript projesi kurulumu, Expo Go ile iPhone'da "Hello World" çalıştırma.
- Spring Boot projesi iskeleti, PostgreSQL bağlantısı, Flyway ilk migration (users tablosu).
- Docker Compose ile lokal PostgreSQL + Redis.

### Faz 2 — Kimlik Doğrulama
- Backend: register/login/refresh, JWT üretimi.
- Mobil: login/register ekranları, token saklama (SecureStore), Axios interceptor ile otomatik token ekleme.

### Faz 3 — Temel Journey Builder (MVP çekirdeği)
- Backend: `journeys`, `journey_stops` tabloları, `POST /journeys`, temel CRUD.
- Mobil: Journey Builder ekranı — başlangıç (mevcut konum), durak ekleme (Places arama ile), hedef.
- Backend: Google Distance Matrix entegrasyonu (`GoogleRoutesProvider.computeMatrix`).
- Backend: Basit optimizasyon (≤8 durak brute-force + skorlama, 3 plan üretimi).
- Backend: `vehicles` tablosu (Bölüm 20.2) + temel CRUD endpoint'leri; optimizasyon motorunun maliyet hesabı `vehicle_id` verildiğinde gerçek tüketim değerini kullanacak şekilde bağlanır (Bölüm 20.3), `vehicle_id` yoksa mevcut genel ortalama davranışına düşer.
- Mobil: "Araçlarım" ekranı (araç ekle/düzenle/varsayılan seç) + Journey Builder'a araç seçici.
- Mobil: Plan sonuç ekranı (3 kart), harita üzerinde rota gösterimi (polyline).
- Deep link ile Apple Maps/Google Maps'e navigasyon devri.
- Backend: `trip_expenses` tablosu (Bölüm 21.3) + `POST /journeys/{id}/complete` — yolculuk tamamlandığında GPS bazlı otomatik gerçek mesafe/yakıt maliyeti hesabı (Yöntem A, Bölüm 21.2/21.4).
- Mobil: Yolculuk tamamlandığında gösterilen basit "Yolculuk Özeti" ekranı (planlanan vs. gerçekleşen maliyet).

**→ Bu noktada çalışan bir MVP vardır: kullanıcı aracını (opsiyonel) kaydeder, duraklarını girer, 3 plan arasından seçer, navigasyona geçer ve yolculuk sonunda gerçekleşen tahmini maliyeti görür.**

### Faz 4 — Smart Departure + NLP Girişi
- Backend: Departure Time Optimizer servisi.
- Backend: `JourneyNlpParsingService` (Claude API entegrasyonu, structured output).
- Mobil: Doğal dil giriş kutusu + parse sonucu onay ekranı.
- Mobil: Departure suggestion ekranı.

### Faz 5 — Smart Stop Order (Zaman Penceresi Optimizasyonu)
- Backend: `journey_stops`'a `time_window_start/end`, `priority` alanları; optimizasyon motoruna zaman penceresi kısıt kontrolü eklenir.
- Mobil: durak ekleme formunda zaman penceresi ve öncelik seçimi.

### Faz 6 — Dynamic Replanning
- Backend: `/replan` endpoint'i, trafik değişim eşiği kontrolü.
- Mobil: Aktif yolculuk ekranı, "Vardım" butonu, push bildirim ile yeniden planlama önerisi.

### Faz 7 — Route-aware Search + Park Optimizasyonu
- Backend: `along-route` endpoint'i, `ParkingService`.
- Mobil: Rota üzeri arama UI, otopark önerisi kartı.

### Faz 8 — Explainability + Kişiselleştirme + EV Menzil/Şarj Planlaması
- Backend: `ExplainabilityService` (kural tabanlı, sonra LLM destekli).
- Backend: `route_feedback` kaydı + `PreferenceLearningService` (haftalık batch job).
- Backend: EV menzil/şarj molası algoritması (Bölüm 20.4), `charging_stops` tablosu, rota üzeri şarj istasyonu arama (Bölüm 19'daki route-aware search altyapısının `ev_charging_station` kategorisiyle yeniden kullanımı).
- Mobil: Plan kartlarında gerekçe rozetleri, tercih öğrenme ayarları ekranı.
- Mobil: EV seçiliyken şarj yüzdesi girişi, plan kartlarında 🔋 şarj molası rozeti.
- Backend: Yöntem B/C (odometre, manuel fiş) giriş endpoint'leri (`PUT /journeys/{id}/expenses`), kalibrasyon batch job'ı (Bölüm 21.5).
- Backend: `GET /vehicles/{id}/stats`, `GET /users/me/expense-summary` endpoint'leri.
- Mobil: "Giderlerim" sekmesi (araç bazlı ve genel gider özeti, geçmiş yolculuk listesi), kalibrasyon bildirimi onay/red diyaloğu.

### Faz 9 — Yayınlama Hazırlığı
- EAS Build production profili, App Store Connect kurulumu.
- Sentry, analytics (opsiyonel: PostHog/Amplitude) entegrasyonu.
- Yük testi (k6 veya JMeter ile backend), güvenlik taraması.
- KVKK/Gizlilik Politikası metni, App Store gizlilik bildirimleri.
- (Opsiyonel, B2B yol haritası) Saha ekibi yönetim paneli (web, React + admin dashboard) — ayrı bir ürün hattı olarak planlanır.

---

## 29. Vibe Coding Uygulama Rehberi (AI'ye Nasıl Prompt Yazılır)

Bu bölüm, yukarıdaki dokümanı bir AI kod asistanına (Claude Code, Cursor, vb.) vererek projeyi adım adım inşa ederken izlenecek pratik yöntemi anlatır.

### 29.1 Genel Prensipler

1. **Her fazı ayrı bir konuşma/oturum olarak ele al.** Tüm projeyi tek seferde "yap bitir" diye istemek yerine, Bölüm 28'deki fazları sırayla, her birini kendi içinde tamamlanmış (çalışan, test edilebilir) birim olarak iste.
2. **Her faz için bu dokümanın ilgili bölümünü referans göster.** Örnek prompt:
   > "Faz 3'ü uygulayacağız. Aşağıdaki mimari dokümanın 9 (Veritabanı Şeması), 10 (API Tasarımı) ve 11 (Optimizasyon Motoru) bölümlerine göre, Spring Boot backend'inde `journeys` ve `journey_stops` entity'lerini, ilgili repository/service/controller katmanlarını ve `OptimizationEngine`'in brute-force + skorlama versiyonunu implemente et. Flyway migration'ı da ekle."
3. **Şema/tip önce, mantık sonra.** Önce entity/DTO/TypeScript tiplerini oluşturmasını iste, sonra iş mantığını. Bu, AI'nin tutarlı bir sözleşme üzerinde çalışmasını sağlar.
4. **Her önemli parçadan sonra test iste.** "Bu servisi yazdıktan sonra Bölüm 26.2'deki test senaryolarına karşılık gelen JUnit testlerini de yaz" gibi.
5. **Edge case listesini kontrol listesi olarak kullan.** Bir özellik "bitti" denmeden önce, Bölüm 25'teki ilgili edge case'lerin kod içinde ele alınıp alınmadığını AI'ye tek tek sordur: "Bölüm 25.2'deki zaman penceresi çelişkisi senaryosunu bu kodda nasıl ele aldın, göster."
6. **API sözleşmesini sabit tut.** Bölüm 10'daki endpoint/DTO tanımlarını hem backend hem mobil tarafta AI'ye referans olarak ver — ikisinin birbirinden bağımsız gelişip uyumsuz hale gelmesini önler.
7. **Küçük, gözden geçirilebilir commit'ler iste.** "Bu değişikliği yaparken sadece X dosyasını değiştir, diğer dosyalara dokunma" gibi net sınırlar çiz — AI'nin ilgisiz yerlerde büyük, denetlenmesi zor değişiklikler yapmasını önler.

### 29.2 Örnek Prompt Şablonu (Her Faz İçin Kullanılabilir)

```
Bağlam: Elimde [proje adı] için detaylı bir mimari doküman var (ekte/yapıştırılmış).
Şu an Faz [N]'i uyguluyoruz: [faz özeti].

İlgili bölümler: [Bölüm numaraları ve başlıkları].

İstediğim:
1. [Entity/DTO/tip tanımları]
2. [Servis/iş mantığı]
3. [Controller/endpoint veya UI bileşeni]
4. [İlgili unit/integration testler]
5. [Bölüm 25'ten ilgili edge case'lerin ele alınması]

Kısıtlar:
- Sadece [ilgili dizin/dosyalar] içinde değişiklik yap.
- [Teknoloji stack'inden] sapma, dokümandaki teknoloji seçimlerine sadık kal.
- Kod yazdıktan sonra hangi test senaryolarını karşıladığını özetle.
```

### 29.3 Vibe Coding Sırasında Dikkat Edilecek Riskler

- **AI'nin optimizasyon algoritmasını "basitleştirmesi":** Zaman penceresi kısıtlarını görmezden gelip sadece TSP çözmesi yaygın bir hatadır. Bölüm 11 ve 25.2'yi özellikle vurgulayarak kontrol et.
- **Google API kısıtlamasının (Bölüm 12.2) unutulması:** AI, `computeRoutes`'u doğrudan çoklu waypoint + alternatif rota ile çağırmaya çalışabilir; bu API'de çalışmaz. Leg-by-leg yaklaşımının uygulandığını kod incelemesiyle doğrula.
- **API anahtarlarının mobil tarafa sızması:** Her zaman kontrol et — Google/LLM anahtarları sadece backend'de olmalı.
- **Şema tutarsızlığı:** Mobil TypeScript tipleri ile backend DTO'ları zamanla birbirinden sapabilir; periyodik olarak "şu an mobil ve backend arasındaki JourneyRequest şeması tutarlı mı, karşılaştır" diye AI'ye kontrol ettir.
- **Test yazmadan "bitti" denmesi:** Her fazın sonunda Bölüm 26'daki ilgili test senaryolarının gerçekten yazıldığını ve geçtiğini doğrula (AI'ye `mvn test` / `npm test` çıktısını göstermesini iste).

---

**Doküman sonu.** Bu doküman, projenin geliştirme sürecinde yaşayan bir referans olarak güncellenmelidir — özellikle Bölüm 9 (veritabanı şeması) ve Bölüm 10 (API tasarımı), gerçek implementasyon sırasında küçük değişikliklere uğrayabilir; bu değişiklikler dokümana geri yansıtılmalıdır.
