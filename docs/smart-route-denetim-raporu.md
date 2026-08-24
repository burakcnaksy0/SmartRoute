# Smart-Route — Kritik Fonksiyonellik Denetim Raporu

## BÖLÜM 1 — Rota Optimizasyon Sonuçları Gerçekten Dinamik mi?

**[ONAYLANMADI] Rota tipleri gerçekten farklı algoritma/ağırlıkla hesaplanıyor**

**Kanıt:** 
- `backend/src/main/java/com/smartroute/service/journey/JourneyPlanningService.java:313-317` (RouteOptions sabit)
- `backend/src/main/java/com/smartroute/service/journey/JourneyPlanningService.java:431-432` (Trafik/Stres hardcoded)
- `mobile/app/(tabs)/journey/plan-result.tsx:203-250` (UI'da metriklerin tamamen mock/hardcoded olarak setlenmesi)

**Açıklama:**
Backend'deki `OptimizationEngine` farklı profiller için teorik olarak farklı `bestPerm` (durak sırası) hesaplıyor. Ancak tek duraklı veya aynı rotanın çıktığı senaryolarda `JourneyPlanningService.java:313`'te oluşturulan `RouteOptions` objesi, profile özel (hızlı, ekonomik vb.) hiçbir parametre almamaktadır. Global kullanıcı tercihlerini kullanmaktadır. 
Daha da önemlisi, "Sürüş Stresi" tamamen sahtedir. Backend'de bu değer `plan.setTrafficRiskScore(0.15);` ile (satır 431) sabitlenmiş durumdadır. Mobil tarafta ise (`plan-result.tsx`), API'den ne dönerse dönsün, `planOptions` array'inde "En Hızlı" için `stressLevel: 'Yüksek'`, "En Dengeli" için `stressLevel: 'Düşük'` ve "En Ekonomik" için süre/maliyet/mesafe değerleri fallback matematiksel manipülasyonlarla (`fastestPlan?.totalDurationSeconds ?? (selectedPlan.totalDurationSeconds - 120)` gibi) sahte olarak gösterilmektedir.

---

## BÖLÜM 2 — "Navigasyonu Başlat" Gerçekten Apple Maps / Google Maps / CarPlay'e Canlı Devrediyor mu?

**[ONAYLANMADI] Navigasyon [Apple Maps / Google Maps / in-app SDK / CarPlay] ile canlı entegre**

**Mekanizma:** Sahte/statik ekran (In-app UI simülasyonu)
**Kanıt:** 
- `mobile/app/(tabs)/journey/plan-result.tsx:185` (`handleStartNavigation` işlevi)
- `mobile/app/(tabs)/journey/active-journey.tsx:122-127` (İlerleme hesaplaması)
- `mobile/app/(tabs)/journey/active-journey.tsx:242-250` (Hardcoded süreler)

**Eksik/Sahte olan:**
Kullanıcı "Navigasyonu Başlat" dediğinde gerçek bir harita uygulamasına yönlendirilmemekte, `router.push('/(tabs)/journey/active-journey')` ile uygulama içi sahte bir ekrana geçilmektedir. Bu ekranda:
- `expo-location` import edilmiş olmasına rağmen arka planda GPS takibi (`watchPosition`) yapılmamaktadır.
- "İlerleme %" değeri GPS bazlı değil, kullanıcının "Varıldı ✓" butonuna tıklayarak artırdığı (`completedCount / totalCount`) bir sayıya dayalıdır.
- Kalan Süre: `currentStop.visitDurationMinutes + 12` şeklinde hardcoded 12 dakika eklenerek gösterilmektedir.
- Hedef Varış: `Date.now() + 24 * 60000` şeklinde şu anki zamana tam 24 dakika eklenerek sahte bir tarih gösterilmektedir.
- CarPlay veya Mapbox/Google Navigasyon SDK'sı entegrasyonu tamamen eksiktir. Sadece içeride küçük bir "Haritada Aç" butonu ile `Linking.openURL` (satır 137) deep-link özelliği mevcuttur.

---

## BÖLÜM 3 — "Trafik / Alt. Rota Kontrolü" Butonu Gerçek Bir İşlem Tetikliyor mu?

**[ONAYLANDI / KISMEN] Trafik/Alt. Rota Kontrolü gerçek bir backend işlemi tetikliyor**

**Kanıt:** 
- `mobile/app/(tabs)/journey/active-journey.tsx:155` (`handleSimulateTrafficChange`)
- `mobile/src/store/journeyStore.ts:301` (`triggerReplan`)
- `backend/src/main/java/com/smartroute/service/journey/JourneyPlanningService.java:438` (`replanJourney`)

**Davranış:**
Buton görsel bir dummy değildir, gerçekten backend'e `POST /replan` isteği atar (`triggerReplan`). Backend tarafı (satır 438, `JourneyPlanningService`), güncel konumdan kalan duraklara giden yeni bir `DistanceMatrixResult` hesaplar ve eğer mevcut rotaya göre 10 dakika (600 sn) veya %15'ten fazla bir gecikme varsa, `OptimizationEngine` ile alternatif rota önerisi çıkarır. 
**Kısmen onaylanmasının sebebi:** Mobil uygulamada canlı GPS takibi (watchPosition) çalışmadığı için backend'e gönderilen `currentLat/currentLng` bilgisi aslında kullanıcının o anki gerçek konumu değil, bileşenin ilk yüklendiğinde aldığı başlangıç noktası veya sahte konumudur. Ancak uçtan uca mimari ve endpoint mekanizması mevcuttur ve çalışmaktadır.

---

## GENEL ÇIKTI TABLOSU

| # | İddia | Durum | Kanıt (dosya:satır) | Risk/Not |
|---|-------|-------|----------------------|----------|
| 1 | 3 rota tipi dinamik hesaplanıyor | ONAYLANMADI | `mobile/app/(tabs)/journey/plan-result.tsx:203` | Rota tipleri, stres ve değer manipülasyonları UI'da hardcoded olarak sahteleniyor. Backend `RouteOptions` eksik. |
| 2 | Navigasyon Apple/Google Maps'e devrediyor | ONAYLANMADI | `plan-result.tsx:185`, `active-journey.tsx:243` | "Navigasyonu Başlat" sahte bir UI ekranına atıyor. Kalan süre (+12dk), ilerleme (%0) hardcoded. |
| 3 | Navigasyon CarPlay'de çalışıyor | ONAYLANMADI | `active-journey.tsx` | Projede CarPlay (react-native-carplay) kütüphanesi veya native implementasyonu bulunmuyor. |
| 4 | Trafik/Alt. Rota butonu gerçek işlem yapıyor | KISMEN ONAYLANDI | `active-journey.tsx:155`, `JourneyPlanningService.java:438` | Backend gerçeğe uygun matris hesabı ve 600sn gecikme mantığıyla çalışıyor, ancak mobilde gönderilen GPS sahte/statik. |
