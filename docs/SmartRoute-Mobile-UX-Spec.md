# SmartRoute — Mobile UX Spec

**Versiyon:** 1.0
**Kapsam:** Bu doküman, teknik mimari dokümanından (SmartRoute-Teknik-Mimari-Dokumantasyonu.md) bağımsız olarak, mobil uygulamanın **kullanıcı deneyimi ve bilgi mimarisini** tanımlar. Amaç, "vibe coding" sürecinde ekranları/etkileşimleri inşa ederken tutarlı, boşluksuz bir referans sağlamaktır.

**Bu dokümanın çıkış noktası olan problem:** Önceki tasarım turlarında, kullanıcı uygulamayı açtığında karşısına çıkan ilk ekranın **"şimdi ne yapacağım?"** sorusuna net bir cevap vermediği görüldü. Bu doküman, özellikle Bölüm 2 (User Journey), Bölüm 3 (Navigation Structure) ve Bölüm 4-5 (Screen List / Purpose) ile bu boşluğu kapatmayı önceliklendirir — **Home ekranı, uygulamanın "varsayılan durum motoru" olarak tasarlanır**: kullanıcının o an neyle ilgilenmesi gerektiğini (devam eden yolculuk mu, geçmiş bir taslak mı, yoksa sıfırdan başlama mı) uygulama kendisi karar verip gösterir; kullanıcı boş bir ekranla baş başa bırakılmaz.

---

## İçindekiler

1. Design Principles
2. User Journey
3. Navigation Structure
4. Screen List
5. Each Screen's Purpose
6. Components
7. Empty States
8. Loading States
9. Error States
10. Permission Flows
11. Route Result UX
12. Active Journey UX
13. Accessibility
14. Design System

---

## 1. Design Principles

### 1.1 Her ekranda tek bir net birincil eylem (Single Primary Action)
Her ekranın, kullanıcının aklında "şimdi ne yapmalıyım?" sorusuna tek, belirgin bir cevabı olmalı — genellikle tek bir büyük, birincil buton. İkincil eylemler görsel olarak daha küçük/az vurgulu tutulur. Bu prensip özellikle Home ekranı için kritiktir (bkz. Bölüm 2, 4.1).

### 1.2 Sürüş öncesi planla, sürüş sırasında sadeleş (Plan Before Drive, Simplify While Driving)
Planlama ekranları (Journey Builder, Plan Results) bilgi yoğun olabilir — kullanıcı bu aşamada arabada değil, dikkatini verebilir. Ama "Aktif Yolculuk" ekranı (Bölüm 12) tam tersi: minimum bilgi, maksimum okunabilirlik, tek elle/göz ucuyla anlaşılır olmalı. Bu iki mod arasındaki tasarım dili bilinçli olarak farklılaşır.

### 1.3 Kademeli açılım (Progressive Disclosure)
Karmaşık özellikler (zaman penceresi, öncelik, araç ekleme, EV şarj yönetimi) varsayılan akışta gizli/opsiyonel kalır; kullanıcı "daha fazla seçenek" ile bilinçli olarak açar. Yeni bir kullanıcı hiçbir gelişmiş ayarla karşılaşmadan ilk yolculuğunu 60 saniyede planlayabilmeli.

### 1.4 Şeffaflık yoluyla güven (Trust Through Transparency)
Sistem bir tahmin yapıyorsa (ETA confidence, gerçek gider tahmini, açıklamalı rota önerisi) bunu **açıkça "tahmin" olarak işaretler**, kesin bilgiymiş gibi sunmaz. Belirsizlik olduğunda sessiz kalmak yerine görünür kılınır (bkz. Bölüm 9, 11).

### 1.5 Asla çıkmaz sokak yok (Never a Dead End)
Her boş durum, hata durumu ve izin reddi ekranının **en az bir yapılabilir eylemi** olmalı. "Bir şeyler ters gitti" yazıp kullanıcıyı bırakan bir ekran bu spesifikasyona aykırıdır (bkz. Bölüm 7, 9, 10).

### 1.6 Yerel hisset, yeniden icat etme (Native Feel, Don't Reinvent)
Gerçek sürüş navigasyonu bilinçli olarak Apple Maps/Google Maps'e devredilir (bkz. teknik doküman Bölüm 7.4). SmartRoute'un kendi ekranları, platform konvansiyonlarına (iOS Human Interface Guidelines / Material Design temel hizalaması) sadık kalır — özgün ama tanıdık.

### 1.7 Durum farkındalığı önce gelir (State Awareness First)
Uygulama her zaman "kullanıcı şu an hangi aşamada" sorusunu bilir (hiç yolculuğu yok / taslak var / plan hazır, seçim bekliyor / aktif yolculukta / yolculuk yeni bitti) ve arayüz bu duruma göre şekillenir — kullanıcının bunu manuel olarak "hatırlayıp" doğru sekmeye gitmesi beklenmez.

---

## 2. User Journey

### 2.1 İlk Kullanım Yolculuğu (First-Time User)

```
Uygulama İndirildi
        │
        ▼
  [Splash] → kısa marka anı
        │
        ▼
  [Onboarding — 3 ekran]
   1. "Google Maps'i değiştirmiyoruz, günü senin için planlıyoruz"
   2. "Birden fazla durağın mı var? Sırasını biz bulalım"
   3. "Trafiğe göre ne zaman çıkman gerektiğini söyleyelim"
        │
        ▼
  [Kayıt / Giriş]
        │
        ▼
  [Konum İzni Priming Ekranı] → gerekçe anlatılır → sistem izin diyaloğu
        │
        ▼
  [Home — İlk Kullanım Durumu]
   "Henüz bir yolculuğun yok. Hadi ilk yolculuğunu planlayalım."
   [+ Yeni Yolculuk Planla] (büyük, tek CTA)
   (Araç ekleme burada ZORUNLU DEĞİL — Journey Builder içinde
    "aracını eklemek ister misin?" olarak nazikçe sorulur, atlanabilir)
        │
        ▼
  Journey Builder → Plan Results → Plan Detail → Navigasyon Başlat
        │
        ▼
  (dönüşte) Trip Summary → "İlk yolculuğun tamamlandı 🎉"
```

**Tasarım kararı:** Araç ekleme, hesap oluşturmanın bir parçası **değildir** — zorunlu adım eklemek ilk kullanım sürtünmesini artırır. Journey Builder içinde doğal bir noktada (tercihler adımında) "Aracını eklersen maliyet tahminlerin daha isabetli olur" şeklinde nazik bir davet olarak sunulur.

### 2.2 Alışkanlık Halindeki Kullanıcı Yolculuğu (Returning / Habitual User)

```
Uygulama Açıldı
        │
        ▼
  [Home] → Sistem durumu değerlendirir:
        │
        ├── Aktif bir yolculuk var mı? → EVET → "Aktif Yolculuk" kartı
        │                                        en üstte, büyük, tıklanabilir
        │
        ├── Tamamlanmamış bir taslak var mı? → EVET → "Kaldığın yerden devam et"
        │                                              kartı
        │
        ├── Sık gidilen/son yolculuk verisi var mı? → "Tekrar planla" kısayolları
        │                                              (örn. "İşe Git", son 3 rota)
        │
        └── Hiçbiri yok → Birincil CTA: [+ Yeni Yolculuk Planla]
        │
        ▼
  Kullanıcı bir eylem seçer → ilgili akışa girer
```

Bu, Bölüm 1 girişinde belirtilen ana tasarım kararının somutlaşmış halidir: **Home ekranı asla statik değildir**, her açılışta uygulamanın mevcut durumuna göre yeniden hesaplanan bir "şimdi bunu yap" önerisi sunar.

### 2.3 Aktif Yolculuk (Sürüş Sırasında) Yolculuğu

```
[Navigasyonu Başlat] tıklandı
        │
        ▼
  Harici navigasyon uygulaması açılır (Apple/Google Maps)
        │
        ▼
  SmartRoute arka planda "Aktif Yolculuk" durumunu tutar
  (bkz. Bölüm 12 — minimize edilmiş takip çubuğu, bildirimler)
        │
        ▼
  Durağa varış → kullanıcı SmartRoute'a döner (bildirimden veya manuel)
  → "Vardım" işaretler
        │
        ▼
  (varsa) sıradaki durak için navigasyon tekrar tetiklenir
        │
        ▼
  Son durak tamamlandı → [Trip Summary] otomatik açılır
```

### 2.4 Yolculuk Sonrası Yolculuk (Post-Trip)

```
[Trip Summary] gösterilir
        │
        ▼
  Kullanıcı ya ekranı kapatır (varsayılan GPS tahmini kalır)
  ya da [Fiş/Dolum Bilgisi Gir] ile hassaslaştırır
        │
        ▼
  Home ekranına dönülür → bu yolculuk artık "Geçmiş"te,
  Home'daki "aktif/taslak" durumu temizlenmiştir
```

---

## 3. Navigation Structure

### 3.1 Üst Seviye — Tab Bar (5 sekme)

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│  🏠 Bugün │ 🧭 Planla │ 🕓 Geçmiş │ 💸 Gider  │ 👤 Profil │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

| Sekme | Rolü |
|---|---|
| **Bugün (Home)** | Varsayılan açılış sekmesi. Durum-farkında özet + birincil CTA. |
| **Planla** | Doğrudan yeni Journey Builder akışına girer (Home'daki CTA ile aynı akışın kısayolu — sık kullanıcılar için tek dokunuşla erişim). |
| **Geçmiş** | Tamamlanmış/iptal edilmiş yolculuk listesi. |
| **Gider** | Araç bazlı ve genel gider istatistikleri (teknik doküman Bölüm 21.6). |
| **Profil** | Hesap, Araçlarım, Tercihler, Bildirim Ayarları, Yardım. |

**Neden "Planla" ayrı bir sekme (Home'daki CTA'ya ek olarak)?** Alışkanlık halindeki kullanıcı, Home'un o anki durumuna bakmadan doğrudan yeni bir yolculuk başlatmak isteyebilir (örn. aktif bir yolculuğu varken bile ikinci bir planlama yapmak istemesi). Sekme, bu kestirmeyi her zaman erişilebilir kılar.

### 3.2 Aktif Yolculuk Sırasında Tab Bar Davranışı

Bir yolculuk "aktif" durumdayken, tab bar'ın üzerinde **kalıcı, daraltılabilir bir "Aktif Yolculuk" şeridi** görünür (bkz. Bölüm 12.2). Bu şerit tab bar'ın bir parçası değildir, üstüne oturan ayrı bir katmandır — kullanıcı hangi sekmede olursa olsun erişilebilir kalır.

### 3.3 Yığın (Stack) Navigasyonu — Sekme İçi Akışlar

```
(tabs)/
├── home/
│   └── index                     [Home]
├── plan/
│   ├── index                     [Journey Builder — Start]
│   ├── add-stop                  [Durak Ekle]
│   ├── stop-detail/[id]          [Durak Detayı — zaman penceresi, öncelik]
│   ├── nlp-input                 [Doğal Dil Girişi]
│   ├── nlp-confirm                [NLP Onay Ekranı]
│   ├── preferences                [Tercih/Profil Seçimi]
│   ├── vehicle-select             [Araç Seçici]
│   ├── optimizing                 [Optimizasyon Loading]
│   ├── results                    [Plan Sonuçları — 3 kart]
│   ├── plan-detail/[planId]       [Plan Detayı — harita, sıra, ETA]
│   └── departure-suggestions      [Ne Zaman Çıkmalıyım]
├── active-journey/
│   └── index                     [Aktif Yolculuk Ekranı]
├── trip-summary/
│   └── [journeyId]                [Yolculuk Özeti]
├── history/
│   ├── index                     [Geçmiş Listesi]
│   └── [journeyId]                [Geçmiş Yolculuk Detayı]
├── expenses/
│   ├── index                     [Gider Özeti]
│   └── vehicle/[vehicleId]        [Araç Bazlı Gider Detayı]
└── profile/
    ├── index                     [Profil Ana]
    ├── vehicles/
    │   ├── index                 [Araçlarım]
    │   └── [vehicleId]            [Araç Ekle/Düzenle]
    ├── preferences                [Sürüş Profili Ayarları]
    ├── notifications              [Bildirim Ayarları]
    └── help                       [Yardım / SSS]
```

### 3.4 Modal Katmanı (Tab yapısının dışında, üstte açılan ekranlar)

- **Konum İzni Priming** — ilk kullanımda veya izin gerektiren bir eylem tetiklendiğinde.
- **Rota Üzeri Arama sonucu** (Bölüm 11.5'teki gibi bottom sheet olarak).
- **Yeniden Planlama Önerisi** bildirimi → tıklanınca modal bottom sheet olarak açılır (Bölüm 12.4).
- **Kalibrasyon Onayı** ("aracının gerçek tüketimi farklı görünüyor") — modal alert/bottom sheet.

---

## 4. Screen List

| # | Ekran | Grup |
|---|---|---|
| 1 | Splash | Onboarding |
| 2 | Onboarding (3 slayt) | Onboarding |
| 3 | Login | Auth |
| 4 | Register | Auth |
| 5 | Konum İzni Priming | Onboarding/Permission |
| 6 | **Home** | Ana |
| 7 | Journey Builder — Start | Planlama |
| 8 | Durak Ekle (arama) | Planlama |
| 9 | Durak Detayı (zaman penceresi/öncelik) | Planlama |
| 10 | Doğal Dil Girişi | Planlama |
| 11 | NLP Onay Ekranı | Planlama |
| 12 | Tercih/Profil Seçimi | Planlama |
| 13 | Araç Seçici | Planlama |
| 14 | Optimizasyon Loading | Planlama |
| 15 | Plan Sonuçları (3 kart) | Planlama |
| 16 | Plan Detayı (harita) | Planlama |
| 17 | Ne Zaman Çıkmalıyım (Departure Suggestions) | Planlama |
| 18 | Rota Üzeri Arama (bottom sheet) | Planlama |
| 19 | Park Önerisi (bottom sheet) | Planlama |
| 20 | **Aktif Yolculuk** | Sürüş |
| 21 | Yeniden Planlama Önerisi (bottom sheet) | Sürüş |
| 22 | Trip Summary (Yolculuk Özeti) | Sonrası |
| 23 | Gider Girişi (odometre/fiş) | Sonrası |
| 24 | Geçmiş Listesi | Geçmiş |
| 25 | Geçmiş Yolculuk Detayı | Geçmiş |
| 26 | Gider Özeti (dashboard) | Gider |
| 27 | Araç Bazlı Gider Detayı | Gider |
| 28 | Profil Ana | Profil |
| 29 | Araçlarım (liste) | Profil |
| 30 | Araç Ekle/Düzenle | Profil |
| 31 | Sürüş Profili Ayarları | Profil |
| 32 | Bildirim Ayarları | Profil |
| 33 | Yardım / SSS | Profil |
| 34 | Kalibrasyon Onayı (modal) | Sistem |
| 35 | Genel Hata / Çevrimdışı Ekranı | Sistem |

---

## 5. Each Screen's Purpose

### 5.1 Splash
**Amaç:** Marka anı + oturum kontrolü (token geçerli mi) sırasında kısa bekleme. **Birincil eylem:** Yok (otomatik geçiş). **Süre hedefi:** < 1 saniye görünür kalmalı; daha uzun sürerse arka planda skeleton Home gösterilir.

### 5.2 Onboarding
**Amaç:** Ürünün "navigasyon değil, planlama katmanı" konumlandırmasını 3 kısa slaytla anlatmak. **Birincil eylem:** "Devam Et" / son slaytta "Başla".

### 5.3 Login / Register
**Amaç:** Kimlik doğrulama. **Birincil eylem:** Giriş Yap / Kayıt Ol. **Not:** Misafir modu (V1'de yok — kayıt zorunlu, çünkü yolculuk geçmişi ve araç profili kullanıcıya bağlı; V2+'ta "misafir olarak dene" değerlendirilebilir).

### 5.4 Konum İzni Priming
**Amaç:** Sistem izin diyaloğundan **önce**, neden konum gerektiğini anlatmak (izin kabul oranını artırır). **Birincil eylem:** "Konumuma İzin Ver" → sistem diyaloğu tetiklenir.

### 5.5 Home
**Amaç:** Bu dokümanın merkezi ekranı — kullanıcının o anki durumuna göre "şimdi ne yapmalı" sorusunu cevaplar. **Birincil eylem:** Duruma göre değişir (bkz. Bölüm 2.2). **Detay için:** Bölüm 7.1 (empty state varyantları).

### 5.6 Journey Builder — Start
**Amaç:** Yeni bir yolculuk taslağı başlatmak; başlangıç noktasını onaylamak. **Birincil eylem:** "Durak Ekle" veya "Doğal Dille Anlat".

### 5.7 Durak Ekle
**Amaç:** Places araması ile durak seçmek. **Birincil eylem:** Arama sonucuna dokunup ekleme.

### 5.8 Durak Detayı
**Amaç:** Seçilen durağın süresini, zaman penceresini, önceliğini (opsiyonel, kademeli açılım) belirlemek. **Birincil eylem:** "Kaydet". **Varsayılan:** Zaman penceresi boş = esnek; öncelik = normal.

### 5.9 Doğal Dil Girişi
**Amaç:** Serbest metin ile tüm günü tek seferde anlatmak. **Birincil eylem:** "Planla" (gönder).

### 5.10 NLP Onay Ekranı
**Amaç:** Sistemin anladığı yapıyı kullanıcıya onaylatmak (teknik doküman Bölüm 13.3 — asla sessizce optimize etmeme prensibi). **Birincil eylem:** "Onayla ve Devam Et"; her durak satırı düzenlenebilir/silinebilir.

### 5.11 Tercih/Profil Seçimi
**Amaç:** Hızlı/Ekonomik/Stressiz/Konforlu/Ekolojik/Dengeli profilini seçmek. **Birincil eylem:** Bir profil kartına dokunmak (varsayılan: Dengeli, önceden seçili).

### 5.12 Araç Seçici
**Amaç:** Bu yolculuk için kullanılacak aracı seçmek (varsayılan araç otomatik seçili). **Birincil eylem:** Bir araç seçmek veya "Araç eklemeden devam et".

### 5.13 Optimizasyon Loading
**Amaç:** Backend hesaplaması sırasında bekleme. **Detay için:** Bölüm 8.1.

### 5.14 Plan Sonuçları
**Amaç:** 3 planı karşılaştırmalı sunmak. **Birincil eylem:** Bir plan kartına dokunup seçmek. **Detay için:** Bölüm 11.

### 5.15 Plan Detayı
**Amaç:** Seçilen planın haritasını, durak sırasını, tahmini varış saatlerini göstermek. **Birincil eylem:** "Navigasyonu Başlat".

### 5.16 Ne Zaman Çıkmalıyım
**Amaç:** Hedef varış saatine göre çıkış saati önerisi + güven yüzdesi. **Birincil eylem:** Önerilen saati "Hatırlat" olarak ayarlamak (bildirim kur).

### 5.17 Rota Üzeri Arama
**Amaç:** Aktif planın rotası üzerinde POI aramak. **Birincil eylem:** Bir sonucu "Durak Olarak Ekle" veya sadece görüntüle.

### 5.18 Park Önerisi
**Amaç:** Hedef durağa yakın otopark seçeneklerini göstermek. **Birincil eylem:** Bir otoparkı "Hedefim Bu" olarak işaretlemek (navigasyon o noktaya yönlenir).

### 5.19 Aktif Yolculuk
**Amaç:** Sürüş sırasında minimum bilgiyle durum takibi. **Detay için:** Bölüm 12.

### 5.20 Yeniden Planlama Önerisi
**Amaç:** Trafik değişince güncellenmiş öneriyi sunmak. **Birincil eylem:** "Rotayı Güncelle" veya "Mevcut Planda Kal".

### 5.21 Trip Summary
**Amaç:** Planlanan vs. gerçekleşen karşılaştırması. **Birincil eylem:** "Bitti" (kapat) veya "Fiş/Dolum Bilgisi Gir".

### 5.22 Gider Girişi
**Amaç:** Odometre veya fiş bilgisiyle maliyeti hassaslaştırmak. **Birincil eylem:** "Kaydet".

### 5.23 Geçmiş Listesi
**Amaç:** Tüm geçmiş yolculukları kronolojik listelemek, filtre (araç, tarih aralığı) sunmak. **Birincil eylem:** Bir yolculuğa dokunup detayına gitmek.

### 5.24 Geçmiş Yolculuk Detayı
**Amaç:** Tamamlanmış bir yolculuğun tam kaydını (rota, maliyet, süre) göstermek. **Birincil eylem:** "Bu Yolculuğu Tekrar Planla" (aynı durakları yeni taslağa kopyalar).

### 5.25 Gider Özeti
**Amaç:** Aylık/haftalık toplam gider, araç bazlı kırılım. **Birincil eylem:** Bir araca dokunup detayına gitmek.

### 5.26 Araç Bazlı Gider Detayı
**Amaç:** Tek bir aracın zaman içindeki km/maliyet/tüketim trendini göstermek.

### 5.27 Profil Ana
**Amaç:** Hesap ayarlarına, Araçlarım'a, Tercihler'e giden merkezi menü.

### 5.28 Araçlarım
**Amaç:** Kayıtlı araçları listelemek, varsayılan seçmek. **Birincil eylem:** "+ Araç Ekle".

### 5.29 Araç Ekle/Düzenle
**Amaç:** Araç bilgilerini (Bölüm 20.2, teknik doküman) girmek. **Birincil eylem:** "Kaydet".

### 5.30 Sürüş Profili Ayarları
**Amaç:** Öğrenilen/manuel ağırlıkları görüntülemek ve override etmek (teknik doküman Bölüm 17).

### 5.31 Bildirim Ayarları
**Amaç:** Hangi bildirimlerin (yeniden planlama, çıkış hatırlatması, kalibrasyon önerisi) açık olduğunu yönetmek.

### 5.32 Yardım / SSS
**Amaç:** Statik yardım içeriği + destek iletişimi.

### 5.33 Kalibrasyon Onayı
**Amaç:** Teknik doküman Bölüm 21.5'teki bildirim tetiklendiğinde onay/red almak. **Birincil eylem:** "Güncelle" / "Yoksay" (ikisi de eşit görsel ağırlıkta — kullanıcıyı bir yöne itmeme).

### 5.34 Genel Hata / Çevrimdışı Ekranı
**Amaç:** Bkz. Bölüm 9.

---

## 6. Components

Bu bölüm, ekranlar arasında tekrar kullanılacak temel bileşenleri tanımlar (React Native + Tailwind/NativeWind veya benzeri bir stil sistemiyle uygulanması önerilir — teknik doküman Bölüm 6.1'deki stack ile uyumlu).

### 6.1 `PrimaryButton` / `SecondaryButton` / `TextButton`
Üç seviyeli buton hiyerarşisi. Bir ekranda **en fazla bir** `PrimaryButton` bulunur (Bölüm 1.1 prensibiyle uyumlu).

### 6.2 `StatusChip`
Küçük, renkli durum etiketi (örn. "Kritik", "Esnek Zaman", "Tahmini"). Renk + ikon birlikte kullanılır (yalnızca renge güvenilmez — bkz. Bölüm 13.3).

### 6.3 `PlanCard`
Plan Sonuçları ekranındaki karşılaştırma kartı. İçerik: etiket (Hızlı/Ekonomik/Dengeli), toplam süre, mesafe, maliyet, `ConfidenceBadge`, `ExplanationText` (1-2 satır gerekçe). Seçili durumda belirgin kenarlık/vurgu.

### 6.4 `ExplainabilityBadge`
"Neden bu plan?" gerekçe metnini taşıyan, dokunulduğunda genişleyen (expandable) küçük bileşen — teknik doküman Bölüm 16 ile birebir bağlantılı.

### 6.5 `ConfidenceBadge`
Yüzde + renk kodlu güven göstergesi (örn. 🟢 %94). Departure Suggestions ve Plan Detayı'nda kullanılır.

### 6.6 `RouteMapView`
`react-native-maps` üzerine kurulu, polyline + durak marker'ları çizen harita bileşeni. Tek bir plan veya karşılaştırmalı (soluk renkte alternatif rotalar) gösterebilir.

### 6.7 `StopCard` / `StopList`
Durak listesini sıralı gösterir; sürükle-bırak ile manuel sıra değişikliği (opsiyonel, sistem önerisini override etmek isteyenler için) destekler.

### 6.8 `TimelineStepper`
Aktif Yolculuk ekranında durakları dikey bir zaman çizelgesi olarak gösterir (tamamlanan/mevcut/gelecek durak görsel olarak ayrışır).

### 6.9 `EmptyStateView`
Standart boş durum bileşeni: ikon/illüstrasyon + başlık + açıklama + (varsa) CTA butonu. Bölüm 7'deki tüm boş durumlar bu bileşenin farklı prop'larla kullanımıdır.

### 6.10 `SkeletonBlock`
Yükleme sırasında içerik yerini tutan animasyonlu placeholder (bkz. Bölüm 8).

### 6.11 `InlineBanner`
Ekranın üstünde beliren, kapatılabilir bilgi/uyarı/hata şeridi (örn. "Bu rota tahminleri sınırlı trafik verisiyle hesaplandı").

### 6.12 `BottomSheet`
Rota Üzeri Arama, Park Önerisi, Yeniden Planlama Önerisi gibi bağlamsal içerikler için kullanılan, ana akışı kesmeyen alt panel.

### 6.13 `SegmentedProfileSelector`
Hızlı/Ekonomik/Stressiz/Konforlu/Ekolojik/Dengeli profil seçimi için yatay kaydırmalı kart grubu.

### 6.14 `SoCSlider`
Elektrikli araç seçiliyken mevcut şarj yüzdesini girmek için slider (teknik doküman Bölüm 20.7).

### 6.15 `PermissionPrimingCard`
İzin priming ekranlarında kullanılan, ikon + gerekçe metni + CTA içeren tam ekran kart.

## 7. Empty States

Her boş durum, Bölüm 1.5 prensibine göre en az bir eylem içerir. Aşağıdaki tablo `EmptyStateView` bileşeninin (Bölüm 6.9) farklı ekranlardaki kullanımını özetler.

| Ekran | Tetikleyen Durum | Başlık | Açıklama | CTA |
|---|---|---|---|---|
| **Home** (ilk kullanım) | Hiç yolculuk yok | "Henüz bir yolculuğun yok" | "İlk yolculuğunu planlayalım — birden fazla durağın olsa bile sırasını biz bulalım." | [+ Yeni Yolculuk Planla] |
| **Home** (deneyimli kullanıcı, boş gün) | Aktif/taslak yok ama geçmiş var | "Bugün için bir planın yok" | Son yolculuk özeti + hızlı tekrar planlama önerisi | [+ Yeni Yolculuk] + [Son Rotayı Tekrarla] |
| **Journey Builder — Start** | Hiç durak eklenmemiş | "Nereye gitmek istiyorsun?" | — | [Durak Ekle] / [Doğal Dille Anlat] |
| **Plan Sonuçları** (nadir durum) | Optimizasyon 0 geçerli plan üretti | "Bu duraklarla uygun bir plan bulamadık" | Hangi kısıtların çakıştığı açıkça listelenir (teknik doküman Bölüm 25.2) | [Kısıtları Düzenle] |
| **Geçmiş Listesi** | Hiç tamamlanmış yolculuk yok | "Henüz tamamlanmış bir yolculuğun yok" | — | [+ Yeni Yolculuk Planla] |
| **Gider Özeti** | Hiç `trip_expenses` kaydı yok | "Gider verisi burada birikecek" | "Bir yolculuğu tamamladığında otomatik olarak burada göreceksin." | [+ Yeni Yolculuk Planla] |
| **Araçlarım** | Hiç araç eklenmemiş | "Henüz bir aracın kayıtlı değil" | "Aracını eklersen yakıt/enerji maliyeti tahminlerin belirgin şekilde isabetli olur." | [+ Araç Ekle] |
| **Rota Üzeri Arama** | Sonuç bulunamadı | "Rotan üzerinde uygun bir sonuç bulunamadı" | Sapma mesafesini artırmayı öner | [Sapma Mesafesini Artır] |
| **Bildirimler** (varsa ayrı bir liste ekranı) | Hiç bildirim yok | "Henüz bir bildirimin yok" | — | Yok (pasif bilgi ekranı, CTA gerekmez) |

**Tasarım notu:** Boş durumlar asla yalnızca "Veri yok" gibi bilgilendirici bir cümleden ibaret olmamalı — her biri kullanıcıyı ürünün değerine geri bağlayan bir cümle + eylem içerir.

---

## 8. Loading States

### 8.1 Genel Prensip
İşlem süresi < 1 saniye ise spinner yeterlidir. **1-4 saniye** aralığındaki işlemler (optimizasyon, NLP parse — teknik doküman Bölüm 23.1'deki SLA hedefleri) için **anlamlı, aşamalı mesajlarla ilerleyen bir yükleme ekranı** kullanılır — kullanıcı sistemin "bir şeyler yaptığını", donmadığını hissetmeli.

### 8.2 Optimizasyon Loading (en kritik loading ekranı)
```
[Rota verileri toplanıyor...]      (0-1sn)
        ↓
[Trafik durumu kontrol ediliyor...] (1-2sn)
        ↓
[En iyi 3 plan hesaplanıyor...]     (2-4sn)
```
Aşamalar gerçek backend ilerlemesine 1:1 bağlı olmak zorunda değildir (backend senkron tek bir yanıt dönebilir) — burada amaç, tahmini süreye göre kullanıcıya **algısal ilerleme** vermektir. 4 saniyeyi aşan durumlarda (nadir, karmaşık istek) üçüncü mesaj sabit kalır, ekstra bir "biraz daha sürüyor, teşekkürler sabrın için" notu eklenmez ilk 8 saniyeye kadar; 8 saniyeyi aşarsa (teknik doküman Bölüm 8.3'teki async job eşiği) arayüz otomatik olarak "bu biraz uzun sürüyor, bildiğimiz zaman haber vereceğiz" moduna geçer ve kullanıcı ekranı terk edip Home'a dönebilir (job arka planda devam eder, bitince push bildirim).

### 8.3 NLP Parse Loading
Tek mesaj: "Anlattıklarını plana çeviriyoruz..." — 3-4 saniye hedefiyle daha basit tutulur (optimizasyon kadar çok aşamalı olmasına gerek yok).

### 8.4 Departure Suggestions Loading
"Trafik senaryoları hesaplanıyor..." — tek aşama.

### 8.5 Harita/Görsel Yükleme
`RouteMapView` içindeki polyline/marker'lar gelene kadar, haritanın altında `SkeletonBlock` (gri, hafif animasyonlu dikdörtgen) gösterilir — boş beyaz harita asla gösterilmez.

### 8.6 Liste Yüklemeleri (Geçmiş, Araçlarım, Gider Özeti)
3-4 adet `SkeletonBlock` satırı; gerçek veri geldiğinde yumuşak bir fade-in ile değişir (ani "pop" olmaz).

---

## 9. Error States

### 9.1 Genel Prensip
Hata mesajları (a) ne olduğunu **sade dilde** açıklar, (b) mümkünse **neden** olduğunu belirtir, (c) **her zaman** bir sonraki adımı sunar (yeniden dene, manuel devam et, destek). Teknik hata kodları/stack trace kullanıcıya asla gösterilmez (geliştirici modunda/log'da tutulur).

### 9.2 Hata Senaryoları ve Karşılıkları

| Senaryo | Kullanıcıya Gösterilen | Eylem |
|---|---|---|
| İnternet yok | "İnternet bağlantın yok gibi görünüyor" | [Tekrar Dene] — bağlantı gelince otomatik retry |
| Google Routes API zaman aşımı/erişilemez | "Harita servisine şu an ulaşamıyoruz" | [Tekrar Dene]; varsa son bilinen plan "(güncel değil)" etiketiyle gösterilmeye devam eder |
| NLP parse hatası/timeout | "Cümleni tam anlayamadık" | [Tekrar Yaz] / [Manuel Olarak Ekle] — manuel form her zaman erişilebilir kalır (Bölüm 13.4, teknik doküman) |
| Zaman penceresi çelişkisi (infeasible plan) | "İki durağın zaman kısıtı birlikte karşılanamıyor" + hangi ikisi olduğu | [Kısıtları Düzenle] |
| Rota bulunamadı (erişilemez koordinat) | "Bu adrese ulaşan bir rota bulamadık" | [Durağı Düzenle] / [Durağı Kaldır] |
| JWT süresi dolmuş (401) | Sessizce refresh token ile yenilenir; başarısızsa "Oturumun sona ermiş, tekrar giriş yapar mısın?" | [Giriş Yap] |
| Rate limit (429) | "Çok sık istek gönderdin, birkaç saniye sonra tekrar dene" | [Tekrar Dene] (buton birkaç saniye devre dışı) |
| Genel sunucu hatası (5xx) | "Bir şeyler ters gitti, bu bizim tarafımızdaki bir sorun" | [Tekrar Dene] + [Destek ile İletişime Geç] |
| GPS/konum alınamıyor | "Konumunu şu an alamıyoruz" | [Başlangıç Noktasını Elle Gir] |
| Şarj molası için istasyon bulunamadı (EV) | "Bu plan aracının menzilini aşıyor ve yakınında uygun bir şarj istasyonu bulamadık" | [Farklı Araç Seç] / [Duraklara Göz At] |

### 9.3 Genel Hata / Çevrimdışı Ekranı (Tam Ekran)
Yalnızca uygulamanın temel işlevlerinin (Home'un bile) yüklenemediği ciddi durumlarda (örn. tamamen çevrimdışı açılış) gösterilir. İçerik: illüstrasyon + "Şu an çevrimdışısın" + [Tekrar Dene]. Bu ekran dışındaki tüm hatalar **inline** (ilgili ekranın içinde `InlineBanner` veya durum değişikliği olarak) gösterilir — kullanıcıyı tam ekran hata sayfalarına atmak asıl akıştan koparır ve mümkün olduğunca kaçınılır.

---

## 10. Permission Flows

### 10.1 Konum İzni (Location)

**Ne zaman istenir:** İlk kullanımda, Onboarding sonrası, priming ekranıyla (Bölüm 4, ekran #5). Kullanıcı reddederse, uygulama işlevsiz kalmaz — **manuel adres girişi** her zaman geçerli bir alternatiftir.

```
[Priming Ekranı]
"Konumuna neden ihtiyacımız var?"
"Başlangıç noktanı otomatik algılamak ve rotanı hesaplamak için."
[Konumuma İzin Ver] → sistem izin diyaloğu
        │
   ┌────┴────┐
   ▼         ▼
 Kabul     Red
   │         │
   ▼         ▼
Home'da   Home'da "Başlangıç noktan?" sorusu elle adres
otomatik  girişiyle karşılanır; Journey Builder'da her
konum     zaman "Başlangıcı Değiştir" ile manuel giriş
kullanılır mevcuttur.
```

**Arka plan konumu:** MVP'de **istenmez** (teknik doküman Bölüm 22.2/25.4'teki bilinçli kısıtlama). V2'de Aktif Yolculuk sırasında dinamik yeniden planlama için gerekebilir; o zaman ayrı, gerekçeli bir priming ekranı ile (yalnızca "Aktif Yolculuk" ekranına ilk girişte) istenir — Onboarding'e eklenmez, ihtiyaç anında istenir (just-in-time permission prensibi).

### 10.2 Bildirim İzni (Notifications)

**Ne zaman istenir:** Onboarding'de **değil**. İlk kez bir bildirime değer eylem gerçekleştiğinde istenir — örn. kullanıcı ilk kez bir "Departure Suggestion" için hatırlatma kurmak istediğinde veya ilk aktif yolculuğa girdiğinde ("Trafik değişirse haber verelim mi?"). Bağlamsal izin isteme, kabul oranını belirgin şekilde artırır.

```
Kullanıcı [Hatırlat] butonuna dokundu
        │
        ▼
[Priming] "Çıkış saatini kaçırmaman için hatırlatma göndermek istiyoruz"
[İzin Ver] → sistem diyaloğu
        │
   ┌────┴────┐
   ▼         ▼
 Kabul     Red
   │         │
   ▼         ▼
Bildirim   Hatırlatma özelliği sessizce devre dışı kalır;
kurulur    ekranda "Bildirimler kapalı, uygulama içinde
           yine de görebilirsin" notu — Ayarlar'dan
           tekrar açmaya yönlendirme sunulur.
```

### 10.3 Kamera İzni (V3, fiş fotoğrafı için)

Yalnızca kullanıcı Gider Girişi ekranında "Fiş Fotoğrafı Ekle" seçeneğine dokunursa istenir — asla önceden/varsayılan olarak istenmez.

### 10.4 Genel İzin Prensipleri

- **Just-in-time:** İzin, o izne ihtiyaç duyan eylemin **hemen öncesinde** istenir, toplu halde Onboarding'de değil.
- **Priming önce, sistem diyaloğu sonra:** Her izin isteğinden önce kullanıcıya *neden* gerektiği anlatılır — bu, iOS'un "izin bir kez reddedilirse tekrar sistem diyaloğu çıkmaz" kısıtlaması nedeniyle özellikle önemlidir (ilk istekte kabul oranını maksimize etmek gerekir).
- **Red asla engellemez:** Her izin reddi için tanımlı bir "azaltılmış ama çalışır" deneyim vardır.
- **Ayarlara yönlendirme:** Kullanıcı fikrini değiştirirse, ilgili ekranda her zaman "Ayarlar'dan izin verebilirsin" bağlantısı bulunur (sistem ayarlarına deep link).

---

## 11. Route Result UX

Bu bölüm, Plan Sonuçları ekranını (Bölüm 4-5, ekran #15) detaylandırır — ürünün en kritik "karar anı" ekranıdır.

### 11.1 Düzen (Layout)

```
┌─────────────────────────────────────┐
│  ← Geri          Plan Sonuçları      │
├─────────────────────────────────────┤
│  [Küçük harita önizleme — tüm       │
│   duraklar, seçili plana göre       │
│   vurgulanan rota]                   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ ⭐ ÖNERİLEN                   │    │  ← her zaman en üstte,
│  │ Dengeli Plan                  │    │    görsel olarak vurgulu
│  │ 1s 24dk · 45 km · ₺155        │    │    (kalın kenarlık/renk)
│  │ 🟢 Trafik riski düşük          │    │
│  │ [Neden bu plan? ▾]             │    │  ← ExplainabilityBadge
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ En Hızlı                      │    │
│  │ 1s 17dk · 48 km · ₺185        │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ En Ekonomik                   │    │
│  │ 1s 31dk · 43 km · ₺125        │    │
│  └─────────────────────────────┘    │
│                                       │
│  [Bu Planı Seç]  ← seçili karta bağlı │
└─────────────────────────────────────┘
```

### 11.2 Etkileşim Modeli
- Kartlardan biri varsayılan olarak **seçili** gelir: kullanıcının tercih profiline (`profileType`) karşılık gelen plan (bkz. teknik doküman Bölüm 11.3).
- Bir karta dokunmak onu **seçili** yapar (radio-button mantığı, kartlar arası tek seçim); kart genişleyip `ExplainabilityBadge` içeriğini gösterebilir.
- Kart üzerinde **ikinci kez** dokunmak (veya "Detay" bağlantısı) Plan Detayı ekranına gider (harita, durak sırası, ETA — tam görünüm).
- Alttaki `[Bu Planı Seç]` butonu her zaman seçili kartla senkron güncellenir (buton metni "Dengeli Planı Seç" gibi dinamik olabilir).

### 11.3 Karşılaştırma Netliği
Üç kart arasındaki **farklı olan** değerler (süre, maliyet gibi) görsel olarak vurgulanır (örn. en düşük maliyet yeşil renkte gösterilir) — kullanıcının satır satır karşılaştırma yapmasını kolaylaştırır. Aynı olan değerler nötr renkte kalır.

### 11.4 Planlar Çok Benzikse
Teknik doküman Bölüm 16.3'teki nötr mesaj senaryosu burada UI'a şöyle yansır: üç kart hâlâ gösterilir ama `ExplainabilityBadge` içeriği "Bu rotalar oldukça benzer, tercihinize göre herhangi birini seçebilirsiniz" olur ve "⭐ ÖNERİLEN" rozeti kaldırılır (yanlış kesinlik izlenimi vermemek için).

### 11.5 EV Şarj Molası Göstergesi
Bir plan şarj molası gerektiriyorsa (teknik doküman Bölüm 20.4), kart üzerinde 🔋 rozeti + "1 şarj molası (~25 dk)" notu görünür; bu bilgi maliyet/süre satırlarına zaten dahil edilmiştir, ayrıca toplamdan çıkarılmaz (şeffaflık).

### 11.6 Plan Detayı Ekranına Geçiş
Plan Detayı, tam ekran haritayı, durak-durak sırayı (`StopList`), her durağa tahmini varış saatini ve alt kısımda sabit `[Navigasyonu Başlat]` (birincil eylem) + `[Rota Üzeri Ara]` / `[Farklı Plan Seç]` (ikincil eylemler) butonlarını içerir.

---

## 12. Active Journey UX

### 12.1 Tasarım Modu Değişimi
Bölüm 1.2 prensibi gereği, Aktif Yolculuk ekranı planlama ekranlarından **kasıtlı olarak** farklı tasarlanır: daha büyük tipografi, daha az bilgi yoğunluğu, yüksek kontrast, tek elle kullanılabilir buton yerleşimi (ekranın alt yarısında).

### 12.2 Minimize Edilmiş Durum — "Aktif Yolculuk Şeridi"
Kullanıcı harici navigasyon uygulamasına geçtiğinde (Bölüm 3.2), SmartRoute arka planda kalır; herhangi bir sekmeye dönüldüğünde tab bar'ın üstünde ince bir şerit görünür:

```
┌─────────────────────────────────────┐
│ 🚗 Market'e gidiyorsun · 12 dk kaldı │  → dokununca tam ekran
└─────────────────────────────────────┘   Aktif Yolculuk ekranına açılır
```

### 12.3 Tam Ekran Aktif Yolculuk Görünümü

```
┌─────────────────────────────────────┐
│         Sıradaki Durak                │
│                                       │
│            🛒 Market                  │
│         Tahmini varış: 11:24          │
│                                       │
│   [TimelineStepper — dikey liste]     │
│   ✅ Kargo Şubesi (11:05'te tamamlandı)│
│   🔵 Market (şu an)                    │
│   ⚪ Eve Dönüş                          │
│                                       │
│   ┌───────────────────────────────┐  │
│   │      ✅ Vardım                 │  │  ← büyük, ekranın alt
│   └───────────────────────────────┘  │    yarısında, tek elle
│   [Navigasyonu Yeniden Aç]            │    ulaşılabilir
└─────────────────────────────────────┘
```

### 12.4 Yeniden Planlama Bildirimi
Trafik değişimi tetiklendiğinde (teknik doküman Bölüm 15), önce bir **push bildirimi** gönderilir (uygulama arka plandaysa); uygulama açıksa bir `BottomSheet` belirir:

```
⚠️ Önünüzde 23 dakikalık gecikme var
"Market'i önce ziyaret etmek toplam sürenizi
16 dakika azaltıyor."

[Rotayı Güncelle]        [Mevcut Planda Kal]
```

İki buton **eşit görsel ağırlıkta** tutulur (kullanıcıyı bir yöne zorlamamak için) — bu, Bölüm 5.33'teki Kalibrasyon Onayı ile aynı tasarım prensibini paylaşır.

### 12.5 Durak Tamamlama Akışı
"✅ Vardım" dokunulduğunda: (a) `TimelineStepper` güncellenir, (b) sıradaki durak varsa otomatik olarak yeni navigasyon deep-link'i tetiklenmeden önce kısa bir onay gösterilir ("Şimdi Eve Dönüş'e mi geçelim?" — kullanıcı isterse önce mola versin diye otomatik tetiklenmez), (c) son duraksa Trip Summary'ye geçilir.

### 12.6 Kritik Durak Uyarısı
Bir sonraki durak `critical` öncelikli ve zaman penceresine yaklaşılıyorsa (örn. son 15 dakika), `TimelineStepper`'daki ilgili satır kırmızımsı bir vurgu alır ve şeritte "⏰ Kargo Şubesi'ne 12:00'a kadar varman gerekiyor" notu belirir — bu tek istisnai durumda renk + metin birlikte agresif bir uyarı olarak kullanılır.

---

## 13. Accessibility

### 13.1 Dinamik Tip / Yazı Ölçeklendirme
Tüm metinler cihazın sistem yazı tipi boyutu ayarına (iOS Dynamic Type / Android font scale) uyum sağlar. Sabit piksel boyutlu metin kullanılmaz; `sp`/dinamik birimler tercih edilir. En kritik ekranlar (Aktif Yolculuk, Plan Sonuçları) büyük yazı tipi ayarlarında da taşma/kırpılma olmadan test edilir.

### 13.2 Renk Kontrastı
Tüm metin/arkaplan kombinasyonları WCAG AA (normal metin için minimum 4.5:1, büyük metin için 3:1) kontrast oranını karşılar. Bu özellikle `StatusChip` ve `ConfidenceBadge` gibi renkli küçük bileşenlerde titizlikle uygulanır.

### 13.3 Renk Körü Güvenli Tasarım
Durum bilgisi (trafik riski, ETA güveni, kritik durak uyarısı gibi) **asla yalnızca renkle** iletilmez — her zaman ikon ve/veya metin eşlik eder (örn. 🟢/🟠/🔴 yerine veya yanında "Düşük risk"/"Orta risk"/"Yüksek risk" metni). Bu, Bölüm 6.2'de tanımlanan `StatusChip` bileşeninin zorunlu bir kuralıdır.

### 13.4 Ekran Okuyucu (VoiceOver / TalkBack) Desteği
- Her interaktif öğe anlamlı bir `accessibilityLabel`e sahiptir (örn. bir `PlanCard` için "Dengeli plan, 1 saat 24 dakika, 155 lira, önerilen" gibi tek, birleşik bir okuma).
- `RouteMapView` gibi görsel-ağırlıklı bileşenler için, ekran okuyucu kullanıcılarına aynı bilgiyi **metinsel alternatif** olarak sunan bir liste görünümü sağlanır (örn. durak sırası + mesafe/süre metin listesi, harita görselinin "işitsel eşdeğeri").
- Modallar/BottomSheet açıldığında ekran okuyucu odağı otomatik olarak o içeriğe taşınır ve kapandığında tetikleyici öğeye geri döner.

### 13.5 Dokunma Hedefi Boyutu
Tüm dokunulabilir öğeler minimum 44×44pt (iOS) / 48×48dp (Android) boyutundadır — özellikle Aktif Yolculuk ekranındaki "Vardım" butonu ve harita üzerindeki marker'lar için titizlikle uygulanır.

### 13.6 Hareket Azaltma (Reduced Motion)
Kullanıcının sistem düzeyinde "Hareketi Azalt" ayarı açıksa, geçiş animasyonları (kart genişleme, sayfa geçişleri, skeleton shimmer) sadeleştirilmiş/anında versiyonlarla değiştirilir.

### 13.7 Haptik Geri Bildirim
Kritik onay eylemlerinde (plan seçimi, "Vardım" işaretleme, kalibrasyon onayı) hafif haptik titreşim kullanılır — bu hem dokunsal geri bildirim sağlar hem de görme zorluğu yaşayan kullanıcılar için ek bir doğrulama katmanıdır. Aşırı kullanılmaz (her dokunuşta değil, yalnızca anlamlı eylem tamamlandığında).

### 13.8 Form Erişilebilirliği
Durak Detayı, Araç Ekle gibi formlarda her alan açık bir `label` ile ilişkilendirilir (placeholder metin tek başına label yerine geçmez), hata mesajları ilgili alanın hemen altında hem görsel hem `accessibilityLiveRegion` ile duyurulur.

---

## 14. Design System

### 14.1 Renk Paleti (Semantik Token'lar)

Uygulama, ham renk değerleri yerine **semantik token'lar** üzerinden tasarlanır (kod tarafında `colors.primary`, `colors.success` gibi) — bu hem tutarlılığı sağlar hem de gelecekteki dark mode/tema değişikliklerini kolaylaştırır.

| Token | Kullanım |
|---|---|
| `primary` | Birincil butonlar, seçili durum vurguları, marka rengi |
| `primaryMuted` | Birincil rengin arka plan/hover/pasif hali |
| `success` | Düşük risk, tamamlanan durak, olumlu fark |
| `warning` | Orta risk, dikkat gerektiren ama engelleyici olmayan durumlar |
| `danger` | Yüksek risk, hata, kritik uyarı, infeasible plan |
| `neutral-50...900` | Metin, arka plan, kenarlık gri tonları (açık/koyu skala) |
| `surface` | Kart/panel arka planı |
| `surfaceElevated` | Modal/BottomSheet arka planı (hafif gölge ile ayrışır) |

**Not:** Renk isimleri kesin hex değerleri değil, token isimleridir — gerçek değerler görsel kimlik/marka çalışmasıyla birlikte belirlenir; bu doküman yalnızca **semantik yapıyı** zorunlu kılar.

### 14.2 Tipografi Ölçeği

| Seviye | Kullanım |
|---|---|
| `display` | Aktif Yolculuk'ta sıradaki durak adı gibi tek, dominant bilgi |
| `heading1` / `heading2` | Ekran başlıkları, kart başlıkları |
| `body` | Standart metin |
| `bodySmall` | İkincil bilgi, açıklama metinleri |
| `caption` | Etiketler, zaman damgaları, `StatusChip` içeriği |

Sistem fontu (iOS: San Francisco, Android: Roboto) kullanılması önerilir — özel font yüklemesi marka kimliği netleştiğinde değerlendirilebilir; MVP'de performans ve native-feel (Bölüm 1.6) önceliklidir.

### 14.3 Boşluk (Spacing) Sistemi
4pt tabanlı ölçek: `4, 8, 12, 16, 24, 32, 48` — tüm padding/margin değerleri bu ölçekten seçilir, keyfi piksel değerleri kullanılmaz. Bu, hem görsel tutarlılığı sağlar hem de AI destekli kod üretiminde (vibe coding) tutarlı bir kural olarak referans gösterilebilir.

### 14.4 Köşe Yarıçapı (Corner Radius)
| Bileşen | Yarıçap |
|---|---|
| Butonlar | Orta (örn. 12pt) |
| Kartlar (`PlanCard`, `StopCard`) | Büyük (örn. 16pt) |
| `StatusChip` | Tam yuvarlak (pill) |
| BottomSheet üst köşeleri | Büyük (örn. 20pt) |

### 14.5 Gölge / Yükseklik (Elevation)
Yalnızca **anlamlı katmanlaşmayı** göstermek için kullanılır: `surface` (0 gölge) < kart (hafif gölge) < `surfaceElevated`/BottomSheet/Modal (belirgin gölge) < Aktif Yolculuk şeridi (en üstte, en belirgin). Gölge dekoratif amaçla rastgele dağıtılmaz.

### 14.6 İkonografi
Tutarlı bir çizgi-ikon seti (örn. `lucide-react-native`) kullanılır. Emoji (🚗, 🔋, ⚠️ gibi), bu dokümanda ve olası ürün metinlerinde **hızlı anlaşılırlık ve sıcak ton** için kullanılmıştır, ancak üretim UI'ında ikon setiyle karışık/tutarsız kullanılmamalıdır — nihai üründe emoji kullanımı sınırlı ve bilinçli tutulmalı (örn. bildirim/durum mesajlarında kabul edilebilir, ama butonlarda/etiketlerde ikon seti tercih edilir). Bu doküman, hangisinin nerede kullanılacağına dair kesin bir stil rehberi taslağıdır; nihai karar görsel kimlik çalışmasında netleştirilir.

### 14.7 Hareket / Animasyon Prensipleri
- Geçişler kısa ve amaçlıdır (150-250ms); "eğlenceli" ama dikkat dağıtıcı olmayan bir his hedeflenir.
- Sayfa geçişleri platform konvansiyonuna uyar (iOS: sağdan kayma; Android: fade+scale).
- Loading state'lerdeki shimmer/skeleton animasyonu yavaş ve düşük kontrastlıdır (dikkat çekmez, sadece "aktif" olduğunu gösterir).
- Bölüm 13.6'daki "Hareketi Azalt" kuralına her zaman uyulur.

### 14.8 Karanlık Mod (Dark Mode)
MVP kapsamında **sistem ayarını takip eden** temel bir dark mode desteklenir (özel bir dark-mode-only tasarım çalışması MVP'ye dahil değildir); semantik token yapısı (Bölüm 14.1) bunu kolaylaştırmak için baştan bu şekilde kurgulanmıştır — token değerleri açık/koyu tema için ayrı tanımlanır, bileşen kodu değişmez.

### 14.9 Platform Uyumu (iOS / Android)
Uygulama React Native + Expo ile tek kod tabanından geliştirilir (teknik doküman Bölüm 6.1), ancak şu noktalarda platform-özel davranış korunur:
- Navigasyon geçiş animasyonları (Bölüm 14.7).
- İzin diyalog metinleri ve akışı (iOS ve Android'in kendi sistem dilleri).
- Deep link şemaları (teknik doküman Bölüm 7.4 — Apple Maps yalnızca iOS'ta anlamlıdır, Android'de Google Maps/varsayılan harita uygulamasına yönlendirilir).
- Alt güvenli alan (safe area) ve tab bar yüksekliği, her platformun kendi standardına göre hesaplanır.

---

**Doküman sonu.** Bu spec, teknik mimari dokümanıyla birlikte, ama ondan bağımsız olarak güncellenir — yeni bir ekran veya akış eklendiğinde önce burada (Bölüm 2-5) tanımlanır, ardından teknik dokümandaki ilgili backend/API bölümlerine referans verilir.
