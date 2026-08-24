# Smart-Route — Kritik Fonksiyonellik Denetim Promptu

## ROL
Sen kıdemli bir full-stack code auditor'sun. Görevin **iddia edilen özellik ile gerçek kod davranışı arasındaki farkı** ortaya çıkarmak. Varsayım kabul etme, her iddiayı dosya:satır referansıyla kanıtla. UI'da bir şeyin gösteriliyor olması, arka planda gerçekten hesaplandığı anlamına gelmez — bunu ayırt et.

## PROJE BAĞLAMI
- Frontend: Expo / React Native
- Backend: Spring Boot
- Bilinen mevcut hata: ROUTE-007 — destinasyon, TSP solver'a sıradan bir durak gibi geçiriliyor (bu denetimle ilgisiz ama referans için not düşülüyor)

Bu denetimde 3 ana şüphe alanı var, her biri için ayrı bir bölüm halinde rapor üret.

---

## BÖLÜM 1 — Rota Optimizasyon Sonuçları Gerçekten Dinamik mi?

UI'da "En Hızlı", "En Dengeli", "En Ekonomik" (veya benzeri) 3 seçenek sunuluyor.

**Gözlemlenen şüpheli durum:** Üretimde alınan bir ekran görüntüsünde "En Hızlı" ve "En Dengeli" seçenekleri **süre (2sa 28dk), mesafe (9.1km) ve maliyet (₺25,61) açısından birebir aynı**; sadece "Sürüş Stresi" etiketi (Yüksek/Düşük) farklı. Bu, gerçek bir çoklu-hedef optimizasyonun (multi-objective / weighted scoring) çalışmadığına, tek bir rotanın farklı kartlar altında sunulduğuna işaret edebilir.

### Yapılacaklar:
1. Backend'de rota optimizasyon servisini bul (route optimizer / TSP solver / routing service). Dosya adını ve sınıfı belirt.
2. "En Hızlı", "En Dengeli", "En Ekonomik" için **gerçekten farklı parametre setleri / ağırlık fonksiyonları (weight functions)** var mı? Örneğin:
   - En Hızlı → sadece süre minimize ediliyor mu?
   - En Ekonomik → maliyet (yakıt, ücretli yol, vs.) minimize ediliyor mu?
   - En Dengeli → gerçek bir weighted sum / Pareto seçimi mi yapıyor, yoksa sabit bir varsayılan mı dönüyor?
3. Bu üç seçenek **aynı çağrıda paralel 3 farklı hesaplama** ile mi üretiliyor, yoksa **tek hesaplama sonucu 3 kez farklı etiketle mi** döndürülüyor? Kod akışını (controller → service → solver) uçtan uca izle.
4. `duration`, `distance`, `cost` alanlarının response'ta nereden geldiğini bul. Eğer üç seçenek için de aynı değişkenden besleniyorlarsa (kopyala-yapıştır / aynı obje referansı), bunu kanıtla ve satır numarasıyla göster.
5. "Sürüş Stresi" (driving stress) skoru gerçekten hesaplanan bir metrik mi (trafik yoğunluğu, yol tipi, viraj sayısı vb. üzerinden) yoksa route type'a göre **hardcoded bir string/enum mapping mi** ("hızlı" ise otomatik "Yüksek", "dengeli" ise otomatik "Düşük")?
6. Test için: Backend'e doğrudan 3 farklı `routeType` parametresiyle istek at (curl/Postman simülasyonu, kod üzerinden statik analiz de olur) ve response'ların gerçekten farklılaşıp farklılaşmadığını doğrula.

### Rapor formatı:
```
[ONAYLANDI / ONAYLANMADI / KISMEN] Rota tipleri gerçekten farklı algoritma/ağırlıkla hesaplanıyor
Kanıt: <dosya:satır>
Açıklama: ...
```

---

## BÖLÜM 2 — "Navigasyonu Başlat" Gerçekten Apple Maps / Google Maps / CarPlay'e Canlı Devrediyor mu?

Kullanıcı "En Dengeli"yi seçip "Navigasyonu Başlat" dediğinde, uygulama "Aktif Navigasyon" ekranına geçiyor ve kendi içinde harita, kalan süre, ilerleme yüzdesi gösteriyor.

**Gözlemlenen şüpheli durum:** "İlerleme: %0" gösteriyor olması ve haritada aracın konumunu gösteren nokta rotanın ortasında duruyor olması arasında tutarsızlık var — bu statik bir mockup olabilir.

### Yapılacaklar:
1. "Navigasyonu Başlat" butonunun `onPress` handler'ını bul. Tam olarak ne yapıyor?
2. Şu üç senaryodan hangisi gerçekleşiyor, kanıtla:
   - **(a) Deep-link / external handoff:** `Linking.openURL()` ile `maps://`, `comgooglemaps://`, `waze://` gibi bir URL scheme'e yönlendirme yapılıyor mu? (Bu, kullanıcıyı gerçek Apple/Google Maps uygulamasına gönderir.)
   - **(b) In-app navigasyon SDK:** Mapbox Navigation SDK, Google Navigation SDK, veya benzeri bir üçüncü parti "turn-by-turn" SDK entegre edilmiş mi ve gerçek GPS konumunu dinliyor mu (`watchPosition`, `Geolocation.watchPosition`, background location tracking)?
   - **(c) Sahte/statik ekran:** Sadece bir görsel bileşen mi render ediliyor; "Kalan Süre", "İlerleme %", konum noktası gerçek GPS event'lerine mi bağlı, yoksa sabit/mock veriye mi bağlı (state hiç güncellenmeyen bir useState, hardcoded prop, vs.)?
3. **CarPlay entegrasyonu** var mı? `react-native-carplay` veya native iOS CarPlay framework (Swift/Obj-C tarafında `CPTemplateApplicationSceneDelegate`, `CPMapTemplate`) kullanılıyor mu? Proje `ios/` klasöründe CarPlay entitlement'ı (`com.apple.developer.carplay-maps`) var mı? Info.plist ve entitlements dosyalarını kontrol et.
4. "İlerleme" (%0 gibi) alanı nereden hesaplanıyor — GPS konumu ile toplam rota mesafesi kıyaslanarak mı (gerçek), yoksa sabit bir başlangıç değeri mi?
5. "Kalan Süre" (42 dk) canlı trafik verisiyle mi güncelleniyor, yoksa optimizasyon anındaki statik bir değer mi (bir kere hesaplanıp hiç yeniden hesaplanmıyor mu)?
6. Konum izinleri (`NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, Android `ACCESS_FINE_LOCATION`) tanımlı mı ve kodda gerçekten kullanılıyor mu, yoksa boilerplate olarak mı duruyor?

### Rapor formatı:
```
[ONAYLANDI / ONAYLANMADI / KISMEN] Navigasyon [Apple Maps / Google Maps / in-app SDK / CarPlay] ile canlı entegre
Mekanizma: <deep-link / SDK adı / yok>
Kanıt: <dosya:satır>
Eksik/Sahte olan: ...
```

---

## BÖLÜM 3 — "Trafik / Alt. Rota Kontrolü" Butonu Gerçek Bir İşlem Tetikliyor mu?

Aktif Navigasyon ekranında bir "Trafik / Alt. Rota Kontrolü" butonu var.

### Yapılacaklar:
1. Bu butonun `onPress` handler'ını bul.
2. Basıldığında:
   - Gerçek bir trafik API'sine (Google Directions Traffic, TomTom, HERE, Apple MapKit traffic, vb.) veya backend'deki bir "reroute" endpoint'ine istek atıyor mu?
   - Yoksa sadece bir Alert/Toast/console.log mu tetikliyor, ya da hiçbir şey yapmayan boş bir fonksiyon mu (`() => {}` veya `TODO` yorumu)?
3. Eğer backend'e istek atıyorsa: o endpoint gerçekten güncel trafik verisiyle alternatif rota hesaplıyor mu, yoksa aynı statik rotayı mı geri döndürüyor?
4. Buton state'i (loading, disabled, sonuç gösterimi) var mı — yoksa buton her basıldığında görsel olarak hiçbir tepki vermiyor mu?

### Rapor formatı:
```
[ONAYLANDI / ONAYLANMADI / KISMEN] Trafik/Alt. Rota Kontrolü gerçek bir backend işlemi tetikliyor
Kanıt: <dosya:satır>
Davranış: ...
```

---

## GENEL ÇIKTI FORMATI

Denetim sonunda tek bir özet tablo üret:

| # | İddia | Durum | Kanıt (dosya:satır) | Risk/Not |
|---|-------|-------|----------------------|----------|
| 1 | 3 rota tipi dinamik hesaplanıyor | | | |
| 2 | Navigasyon Apple/Google Maps'e devrediyor | | | |
| 3 | Navigasyon CarPlay'de çalışıyor | | | |
| 4 | Trafik/Alt. Rota butonu gerçek işlem yapıyor | | | |

Her "ONAYLANMADI" veya "KISMEN" bulgu için:
- Kullanıcıyı yanıltan spesifik UI elemanı hangisi (örn: "%0 İlerleme" static gösteriliyor ama gerçek GPS'e bağlı değil)
- Bunu gerçek hale getirmek için gereken minimum değişiklik (hangi dosyaya, hangi SDK/entegrasyon)

Varsayımda bulunma, spekülasyon yapma — sadece kodda gördüğünle konuş. Bir şeyi bulamadıysan "bulunamadı, muhtemelen implement edilmemiş" de, "muhtemelen vardır" deme.
