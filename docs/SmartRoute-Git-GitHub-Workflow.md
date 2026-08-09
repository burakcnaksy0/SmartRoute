# SmartRoute — Git & GitHub Workflow

**Versiyon:** 1.0
**Kapsam:** Bu doküman, projenin GitHub üzerinde nasıl organize edileceğini, branch stratejisini, commit mesaj standartlarını, pull request sürecini ve vibe coding sürecine özgü Git pratiklerini tanımlar. Diğer üç dokümanla (Teknik Mimari, Kullanım Kılavuzu, Mobile UX Spec) birlikte ama onlardan bağımsız yaşar; kod tabanının kendisi bu dokümana göre şekillenir.

**Neden ayrı bir doküman?** Vibe coding sürecinde AI'ye kod yazdırırken, disiplinsiz bir Git kullanımı (dev commit'ler, anlamsız mesajlar, uzun ömürlü tek bir branch) hem geçmişi okunamaz hale getirir hem de bir şeyler ters gittiğinde geri alma (revert) işlemini imkansızlaştırır. Bu doküman, her AI oturumunun **kod kadar Git geçmişini de** temiz bırakmasını sağlamak için vardır.

---

## İçindekiler

1. Repository Yapısı (Monorepo Kararı)
2. Branch Stratejisi
3. Branch İsimlendirme Kuralları
4. Commit Mesaj Standardı (Conventional Commits)
5. Faz Bazlı Branch/Commit Eşleştirmesi
6. Pull Request Süreci
7. Merge Stratejisi
8. Branch Koruma Kuralları
9. Etiketleme (Tagging) ve Release Yönetimi
10. .gitignore ve Hassas Bilgi Yönetimi
11. GitHub Issues Kullanımı
12. README Yapısı
13. Vibe Coding'e Özgü Git Pratikleri
14. Örnek Commit Geçmişi (Faz 3 Senaryosu)
15. CI/CD Tetikleyicileri

---

## 1. Repository Yapısı (Monorepo Kararı)

Proje **tek bir monorepo** olarak organize edilir (mobil uygulama, backend ve dokümantasyon aynı repository içinde):

```
smartroute/
├── mobile/                 # React Native + Expo uygulaması
├── backend/                 # Spring Boot uygulaması
├── docs/                     # Bu 4 doküman + ileride eklenecekler
│   ├── SmartRoute-Teknik-Mimari-Dokumantasyonu.md
│   ├── SmartRoute-Kullanim-Kilavuzu.md
│   ├── SmartRoute-Mobile-UX-Spec.md
│   └── SmartRoute-Git-GitHub-Workflow.md
├── .github/
│   ├── workflows/             # GitHub Actions pipeline'ları
│   │   ├── backend-ci.yml
│   │   └── mobile-ci.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
├── .gitignore
├── README.md
└── CHANGELOG.md
```

**Neden monorepo (multi-repo değil)?**
- Vibe coding sürecinde tek bir AI konuşması hem mobil hem backend'e dokunan bir özelliği (örn. Faz 3'te araç profili) aynı bağlamda uygulayabiliyor — iki ayrı repo arasında context taşımak sürtünme yaratır.
- Tek bir PR ile mobil + backend + doküman güncellemesi birlikte gözden geçirilebilir (örn. yeni bir API endpoint'i eklendiğinde hem backend kodu hem mobil client kodu hem de Teknik Mimari dokümanındaki API tablosu aynı PR'da güncellenir — tutarlılık garanti altına alınır).
- Solo/küçük ekip ölçeğinde multi-repo'nun sağladığı izolasyon avantajı (bağımsız deploy, bağımsız erişim kontrolü) şu an gereksiz karmaşıklık; proje büyüyüp ayrı ekipler oluştuğunda (örn. B2B panel ayrı bir ürün hattına dönüştüğünde) yeniden değerlendirilebilir.

---

## 2. Branch Stratejisi

Proje **basitleştirilmiş GitHub Flow** kullanır (tam `git-flow` değil — `develop` branch'i, `release/*` branch'leri gibi ek katmanlar solo/küçük ekip ölçeğinde gereksiz yük getirir):

```
main  ─────●───────●───────────●───────────●──────────▶
            \       \           \           \
             \       \           \           \
    feature/  ●──●──●●    feature/ ●──●──●    feature/ ●──●
    faz3-...              faz4-...              faz5-...
```

### Kurallar

- **`main`** her zaman **çalışır ve deploy edilebilir** durumdadır. Doğrudan `main`'e push edilmez — her değişiklik bir branch + PR üzerinden gelir (bkz. Bölüm 8, Branch Koruma Kuralları).
- Yeni bir özellik/faz üzerinde çalışmaya başlarken `main`'den bir **feature branch** açılır.
- Branch ömrü **kısa tutulur** — idealde birkaç gün, en fazla bir "Faz" süresi (teknik doküman Bölüm 28'deki fazlar doğal branch sınırlarıdır). Uzun yaşayan branch'ler `main`'den gitgide uzaklaşır ve merge çatışmaları büyür.
- Bir Faz birden fazla mantıksal parçaya bölünebiliyorsa (örn. Faz 3 hem backend hem mobil içeriyor), **tek bir büyük branch yerine 2-3 küçük, ardışık branch** tercih edilir (örn. `feature/faz3-vehicle-backend` → merge → `feature/faz3-vehicle-mobile-ui`). Küçük PR'lar hem AI'nin ürettiği kodu gözden geçirmeyi kolaylaştırır hem de bir sorun çıktığında geri alınacak alanı daraltır.

### Branch Türleri

| Tür | Amaç | `main`'den mi açılır | `main`'e mi merge edilir |
|---|---|---|---|
| `feature/*` | Yeni özellik/faz geliştirme | Evet | Evet (PR ile) |
| `fix/*` | Bug düzeltme | Evet | Evet (PR ile) |
| `docs/*` | Yalnızca dokümantasyon değişikliği | Evet | Evet (PR ile) |
| `chore/*` | Bağımlılık güncelleme, konfigürasyon, tooling | Evet | Evet (PR ile) |
| `refactor/*` | Davranışı değiştirmeyen kod iyileştirmesi | Evet | Evet (PR ile) |
| `hotfix/*` | Prod'da acil düzeltme gereken kritik hata | `main`'den (veya son tag'den) | Evet, doğrudan hızlandırılmış PR ile |

---

## 3. Branch İsimlendirme Kuralları

**Format:** `<tür>/<faz-no (varsa)>-<kısa-açıklama-kebab-case>`

**Örnekler:**
```
feature/faz1-proje-iskeleti
feature/faz3-journey-builder-backend
feature/faz3-journey-builder-mobile
feature/faz3-vehicle-profile
feature/faz8-ev-charging-stop
fix/optimize-timeout-google-api
fix/mobile-deep-link-android
docs/git-workflow-doc
chore/upgrade-expo-sdk
refactor/optimization-engine-scoring
hotfix/jwt-refresh-token-bug
```

**Kurallar:**
- Küçük harf, kelimeler arası tire (`-`), Türkçe karakter kullanılmaz (İngilizce teknik terimler + Türkçe kısa açıklama karışık kullanılabilir, örn. `feature/faz5-zaman-penceresi-optimizasyonu` kabul edilebilir, ama tutarlılık için mümkün olduğunca İngilizce teknik isimlendirme tercih edilir).
- Faz numarası varsa (teknik doküman Bölüm 28'deki fazlarla birebir eşleşir) branch adının başına eklenir — bu, GitHub'da branch listesini filtrelerken/sıralarken fazlara göre gruplamayı kolaylaştırır.
- Branch adı 50 karakteri geçmemeye çalışılır.

---

## 4. Commit Mesaj Standardı (Conventional Commits)

Proje [Conventional Commits](https://www.conventionalcommits.org/) standardını kullanır. Bu, hem okunabilir bir geçmiş sağlar hem de ileride otomatik CHANGELOG üretimi gibi araçlarla uyumludur.

**Format:**
```
<tip>(<kapsam>): <kısa açıklama, emir kipi, küçük harfle başlar, sonda nokta yok>

[opsiyonel gövde — neden bu değişiklik yapıldı, ne değişti]

[opsiyonel footer — örn. Breaking change notu, ilgili issue numarası]
```

### Tip Listesi

| Tip | Ne Zaman Kullanılır |
|---|---|
| `feat` | Yeni bir kullanıcı-görünür özellik |
| `fix` | Hata düzeltme |
| `docs` | Yalnızca dokümantasyon değişikliği |
| `style` | Kod davranışını etkilemeyen biçimlendirme (boşluk, noktalama vb.) |
| `refactor` | Davranışı değiştirmeyen kod yeniden yapılandırması |
| `perf` | Performans iyileştirmesi |
| `test` | Test ekleme/düzeltme |
| `chore` | Build süreci, bağımlılık, tooling değişikliği |
| `ci` | CI/CD pipeline değişikliği |

### Kapsam (Scope) Listesi

Proje için önerilen kapsamlar: `mobile`, `backend`, `journey`, `optimization`, `vehicle`, `expenses`, `nlp`, `auth`, `db`, `docs`, `ci`, `infra`.

### Örnekler

```
feat(backend): journey_stops tablosuna time_window alanları eklendi

feat(mobile): plan sonuçları ekranına ExplainabilityBadge bileşeni eklendi

fix(optimization): zaman penceresi çakışan duraklarda sonsuz döngü düzeltildi

Kritik önceliğe sahip iki durağın zaman penceresi fiziksel olarak
imkansız olduğunda OptimizationEngine sonsuz döngüye giriyordu.
Artık InfeasiblePlanException fırlatılıyor (Teknik Mimari Bölüm 25.2
ile uyumlu).

refactor(backend): GoogleRoutesProvider RoutingProvider arayüzü arkasına alındı

test(optimization): zaman penceresi edge case'leri için unit test eklendi

docs: araç profili bölümü teknik mimariye eklendi

chore(mobile): expo sdk 51'e yükseltildi

fix(mobile): android'de deep link yönlendirmesi düzeltildi

Google Maps deep link şeması android'de eksik parametre nedeniyle
hatalı açılıyordu.

Closes #42
```

### Kurallar
- Kısa açıklama **50 karakteri** geçmemeye çalışılır, emir kipiyle yazılır ("eklendi" değil "ekle" de kabul edilir ama proje boyunca **tutarlı** olunmalı — bu dokümanda geçmiş zaman/edilgen tercih edilmiştir, ekip/AI bu tercihe sadık kalır).
- Bir commit **tek bir mantıksal değişikliği** temsil eder — "birden fazla şey" yapan devasa commit'ler kabul edilmez (bkz. Bölüm 13, vibe coding pratikleri).
- Breaking change varsa footer'da `BREAKING CHANGE: <açıklama>` belirtilir (örn. bir API sözleşmesi geriye dönük uyumsuz şekilde değiştiyse).

---

## 5. Faz Bazlı Branch/Commit Eşleştirmesi

Teknik doküman Bölüm 28'deki 9 faz, doğal Git milestone'larıdır. Her faz için önerilen akış:

```
main
  │
  ├── feature/faz1-proje-iskeleti  → PR → main'e merge → tag: v0.1.0
  │
  ├── feature/faz2-auth-backend    → PR → main'e merge
  ├── feature/faz2-auth-mobile     → PR → main'e merge → tag: v0.2.0
  │
  ├── feature/faz3-journey-backend        → PR → main'e merge
  ├── feature/faz3-vehicle-profile        → PR → main'e merge
  ├── feature/faz3-journey-mobile-ui      → PR → main'e merge
  ├── feature/faz3-trip-expenses-basic    → PR → main'e merge → tag: v0.3.0 (MVP tamamlandı)
  │
  ├── ... (Faz 4-8 aynı desende devam eder)
  │
  └── feature/faz9-release-hazirligi → PR → main'e merge → tag: v1.0.0
```

Her faz tamamlandığında (o fazın tüm alt branch'leri `main`'e merge edildiğinde), **GitHub Milestone** olarak da işaretlenebilir (bkz. Bölüm 11) ve bir Git tag'i atılır (bkz. Bölüm 9). Bu, projenin GitHub'daki geçmişini teknik dokümandaki yol haritasıyla birebir okunabilir kılar — repository'e bakan biri (veya gelecekteki siz) "hangi commit/tag hangi faza karşılık geliyor" sorusuna anında cevap bulabilir.

---

## 6. Pull Request Süreci

### 6.1 PR Açma Kuralları
- Her feature/fix/docs/chore branch'i, `main`'e merge edilmeden önce bir PR'dan geçer — **doğrudan push yasak** (Bölüm 8).
- PR başlığı, commit mesaj formatına benzer şekilde yazılır: `feat(backend): araç profili CRUD endpoint'leri`.
- PR açıklaması, aşağıdaki şablonu kullanır (`.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
## Ne Değişti?
[Kısa özet]

## Hangi Fazla İlgili?
Faz [N] — [Teknik Mimari Bölüm X referansı]

## Nasıl Test Edildi?
- [ ] Backend unit testler geçti (`mvn test`)
- [ ] Backend integration testler geçti
- [ ] Mobil unit/component testler geçti (`npm test`)
- [ ] Manuel olarak [X senaryosu] test edildi

## Edge Case Kontrolü
Teknik Mimari Bölüm 25'ten ilgili edge case'ler:
- [ ] [İlgili edge case 1] ele alındı
- [ ] [İlgili edge case 2] ele alındı

## Ekran Görüntüsü / Demo (varsa, UI değişikliği için)
[görsel]

## Breaking Change?
- [ ] Evet (açıklama: ...)
- [ ] Hayır
```

Bu şablon, önceki dokümanlardaki (Teknik Mimari Bölüm 26, Test Stratejisi) test disiplinini ve (Bölüm 25) edge case kontrol listesini PR sürecine **somut bir kontrol noktası** olarak bağlar — "kod yazıldı" ile "kod PR'a hazır" arasına bilinçli bir eşik koyar.

### 6.2 Solo Geliştirici / AI Ortak-Pilotlu Senaryoda Review
Proje büyük ihtimalle solo (veya çok küçük ekip) + AI asistan ile geliştirileceği için klasik "başka bir insan onaylar" akışı her zaman mümkün olmayabilir. Bu durumda:
- PR yine de açılır (doğrudan `main`'e push edilmez) — bu, değişikliği **izole, gözden geçirilebilir bir birim** haline getirir.
- Geliştirici (siz), PR'ı **kendi kendine gözden geçirir** ("self-review") — GitHub'ın "Files changed" görünümünde diff'i satır satır okumak, AI'nin beklenmedik/ilgisiz bir dosyaya dokunup dokunmadığını görmek için önemlidir (bkz. Bölüm 13.3).
- CI (GitHub Actions) yeşil olmadan merge edilmez — otomatik testler, insan review'unun eksik olduğu senaryoda **birincil kalite kapısı** haline gelir.

---

## 7. Merge Stratejisi

**Squash and merge** varsayılan yöntemdir: bir feature branch'teki tüm commit'ler (AI oturumu sırasında oluşan küçük, sık commit'ler dahil) `main`'e tek bir temiz commit olarak birleşir.

**Neden squash?**
- Vibe coding sırasında bir branch içinde onlarca küçük commit oluşabilir (`wip`, `fix typo`, `AI önerisini uyguladı` gibi doğal ama `main` geçmişinde gürültü yaratacak commit'ler). Squash, bu ham geçmişi feature branch'te tutup `main`'i temiz ve okunabilir bırakır.
- `main`'deki her commit, doğrudan bir PR'a (ve dolayısıyla bir Faz/özellik parçasına) karşılık gelir — bu da Bölüm 5'teki faz-commit eşleştirmesini güçlendirir.

**İstisna:** `hotfix/*` branch'leri, aciliyet nedeniyle bazen tek commit olarak zaten temizdir; bunlarda "merge commit" veya "squash" fark etmez, karar geliştiriciye bırakılır.

---

## 8. Branch Koruma Kuralları

GitHub repository ayarlarında `main` branch'i için:

- ✅ **Doğrudan push engellenir** — tüm değişiklikler PR üzerinden gelir.
- ✅ **PR merge edilmeden önce CI kontrollerinin geçmesi zorunlu** (backend-ci.yml ve mobile-ci.yml — teknik doküman Bölüm 27.2).
- ✅ **Force-push ve branch silme `main` üzerinde engellenir.**
- ⚙️ **Review zorunluluğu** — takım büyüdükçe "en az 1 onay" kuralı eklenir; solo geliştirme aşamasında bu kural gevşetilebilir (yalnızca CI zorunluluğu yeterli), ama proje bir ekibe açıldığında ilk yapılacak sıkılaştırma budur.
- ⚙️ **Linear history zorunluluğu** (opsiyonel) — squash-merge stratejisiyle zaten doğal olarak sağlanır, ek olarak GitHub ayarında da zorunlu kılınabilir.

---

## 9. Etiketleme (Tagging) ve Release Yönetimi

Proje [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`) kullanır.

- **`v0.x.y`** — MVP öncesi/geliştirme aşaması sürümleri. Her faz tamamlandığında minor sürüm artırılır (örn. Faz 1 sonunda `v0.1.0`, Faz 2 sonunda `v0.2.0`).
- **`v1.0.0`** — Faz 9 (Yayınlama Hazırlığı) tamamlanıp App Store'a ilk sürüm gönderildiğinde.
- **`vX.Y.Z`** sonrası — `Z` (patch) bug fix'ler için, `Y` (minor) yeni özellikler için, `X` (major) geriye dönük uyumsuz büyük değişiklikler için kullanılır.

Her tag, GitHub Releases üzerinde kısa bir not ile eşleştirilir (o sürümde neyin tamamlandığı — ilgili Faz'a ve teknik doküman bölümlerine referansla). `CHANGELOG.md` dosyası (kök dizinde), Conventional Commits mesajlarından yarı-otomatik olarak (örn. `git-cliff` veya `standard-version` gibi bir araçla, V2+'ta) türetilebilir; MVP'de elle tutulan basit bir liste yeterlidir.

---

## 10. .gitignore ve Hassas Bilgi Yönetimi

**Kritik kural:** API anahtarları (Google Maps, Anthropic/Claude, JWT secret, veritabanı şifreleri) **asla** commit edilmez. Bu, Teknik Mimari Bölüm 22'deki (Güvenlik) prensiplerin Git tarafındaki karşılığıdır.

### `.gitignore` (kök dizin, özet)
```gitignore
# Ortam değişkenleri — GERÇEK DEĞERLER ASLA COMMIT EDİLMEZ
.env
.env.local
**/.env
!.env.example

# Backend (Java/Maven)
backend/target/
backend/.mvn/
*.class

# Mobile (Node/Expo)
mobile/node_modules/
mobile/.expo/
mobile/dist/
mobile/*.log

# IDE
.idea/
.vscode/
*.iml

# İşletim sistemi
.DS_Store
Thumbs.db

# Build/derived
*.apk
*.ipa
*.aab
```

### `.env.example` Prensibi
Gerçek `.env` dosyası yerine, repository'e **değerleri boş/placeholder** olan bir `.env.example` commit edilir:
```env
# backend/.env.example
DATABASE_URL=
DATABASE_USER=
DATABASE_PASSWORD=
GOOGLE_MAPS_API_KEY=
ANTHROPIC_API_KEY=
JWT_SECRET=
```
Yeni bir geliştirici (veya AI, yeni bir oturumda) bu dosyayı kopyalayıp kendi `.env`'ini oluşturur.

### Yanlışlıkla Sızan Anahtar Durumu
Eğer bir anahtar yanlışlıkla commit edilip push edilirse: (1) anahtar **derhal ilgili serviste (Google Cloud Console, Anthropic Console vb.) iptal edilip yenisi üretilir** — `git revert` veya history rewrite (`git filter-repo`) **tek başına yeterli değildir**, çünkü anahtar zaten görülmüş olabilir; (2) geçmişten temizlemek isteniyorsa `git filter-repo` ile branch geçmişi yeniden yazılır ve tüm collaborator'lar repoyu yeniden klonlar.

---

## 11. GitHub Issues Kullanımı

Teknik doküman Bölüm 28'deki her Faz, GitHub'da bir **Milestone** olarak açılır (`Faz 1 — Proje İskeleti`, `Faz 2 — Kimlik Doğrulama` vb.). Her Faz'ın alt görevleri (örn. Faz 3 için "vehicles tablosu", "Journey Builder UI", "trip_expenses temel akışı") ayrı **Issue**'lar olarak açılır ve ilgili Milestone'a bağlanır.

**Önerilen Label Seti:**
| Label | Anlamı |
|---|---|
| `faz-1` … `faz-9` | Hangi faza ait olduğu |
| `type:feature` / `type:bug` / `type:docs` / `type:chore` | Tür (commit tipiyle örtüşür) |
| `area:mobile` / `area:backend` / `area:docs` | Alan |
| `priority:high` / `priority:medium` / `priority:low` | Öncelik |
| `good-first-ai-task` | Kendi içinde net sınırları olan, tek bir AI oturumunda bitirilebilecek görevler (bkz. Bölüm 13) |

Bir commit/PR'ı ilgili issue'ya bağlamak için commit footer'ında veya PR açıklamasında `Closes #<issue-no>` kullanılır — issue, PR merge edildiğinde otomatik kapanır.

---

## 12. README Yapısı

Kök dizindeki `README.md`, projeye ilk bakan birinin (veya gelecekteki bir katkıcının) 2 dakikada projeyi anlamasını sağlar:

```markdown
# SmartRoute

[Kısa, 2-3 cümlelik ürün tanımı — Kullanım Kılavuzu Bölüm 1'den özetlenir]

## Dokümantasyon
- [Teknik Mimari](docs/SmartRoute-Teknik-Mimari-Dokumantasyonu.md)
- [Kullanım Kılavuzu](docs/SmartRoute-Kullanim-Kilavuzu.md)
- [Mobile UX Spec](docs/SmartRoute-Mobile-UX-Spec.md)
- [Git & GitHub Workflow](docs/SmartRoute-Git-GitHub-Workflow.md)

## Proje Yapısı
[Bölüm 1'deki monorepo ağacı]

## Kurulum
### Backend
\`\`\`bash
cd backend
cp .env.example .env   # kendi değerlerinizi girin
./mvnw spring-boot:run
\`\`\`

### Mobil
\`\`\`bash
cd mobile
cp .env.example .env
npm install
npx expo start
\`\`\`

## Katkı Sağlama
[Bölüm 2-7'ye kısa referans: branch/commit/PR kuralları]

## Yol Haritası
[Teknik Mimari Bölüm 28'e link + mevcut Faz durumu]

## Lisans
[Belirlenecek]
```

---

## 13. Vibe Coding'e Özgü Git Pratikleri

Bu bölüm, AI destekli geliştirme sürecinde Git disiplinini korumak için somut pratikler sunar.

### 13.1 Her Anlamlı Adımdan Sonra Commit
Bir AI oturumu sırasında büyük bir özelliği tek seferde bitirip **tek dev bir commit** atmak yerine, her mantıksal alt adım kendi commit'ini alır:
```
feat(backend): vehicles tablosu ve Flyway migration eklendi
feat(backend): VehicleService CRUD metodları eklendi
feat(backend): VehicleController endpoint'leri eklendi
test(backend): VehicleService unit testleri eklendi
```
Bu commit'ler feature branch içinde birikir, PR açıldığında Bölüm 7'deki squash-merge ile tek bir temiz commit'e dönüşür — yani **hem AI oturumu sırasında ayrıntılı geçmiş hem `main`'de temiz geçmiş** aynı anda elde edilir.

### 13.2 Prompt'ta Commit Talimatını Açıkça Ver
AI'ye kod yazdırırken, Mobile-UX-Spec ve Teknik Mimari dokümanlarındaki prompt şablonuna (Teknik Mimari Bölüm 29.2) benzer şekilde commit beklentisi de belirtilir:
> "...Bu değişikliği tamamladıktan sonra, Bölüm 4'teki commit mesaj standardına uygun bir commit mesajı öner (henüz commit etme, önce bana göster)."

Bu, AI'nin commit mesajını da bu dokümandaki standarda göre üretmesini sağlar; geliştirici mesajı gözden geçirip onaylar, sonra commit eder.

### 13.3 Commit Öncesi Diff Kontrolü
Her commit'ten önce `git diff --staged` (veya IDE'nin diff görünümü) ile **hangi dosyaların değiştiği** kontrol edilir. AI'nin talimat dışı bir dosyaya dokunup dokunmadığını (örn. ilgisiz bir konfigürasyon dosyasını "iyileştirme" adı altında değiştirmesi) yakalamanın en güvenilir yolu budur — bu, Teknik Mimari Bölüm 29.3'teki "AI'nin ilgisiz yerlerde büyük değişiklik yapması" riskinin Git tarafındaki kontrol noktasıdır.

### 13.4 Branch Başına Tek Faz/Alt-Görev
Bir feature branch'in kapsamı net tutulur (Bölüm 2, 5). AI'ye "hazır oldun mu bu arada şunu da ekleyelim" tarzı kapsam genişletmesi yaptırılmaz — yeni bir ihtiyaç çıkarsa, yeni bir branch/issue açılır. Bu, hem PR'ları küçük ve gözden geçirilebilir tutar hem de bir sorun çıktığında **hangi değişikliğin** soruna yol açtığını netleştirir.

### 13.5 Deneysel AI Çıktısı için Ayrı, "Atılabilir" Branch
AI'nin önerdiği büyük bir refactor veya alternatif bir algoritma yaklaşımı (örn. optimizasyon motorunun farklı bir sezgisel ile denenmesi) doğrudan mevcut feature branch üzerinde denenmez; `experiment/*` önekli, tamamen atılabilir bir branch'te denenir. Sonuç işe yararsa oradan gerçek feature branch'e kontrollü şekilde taşınır (cherry-pick veya yeniden uygulama); işe yaramazsa branch silinir, `main` hiç etkilenmez.

### 13.6 Rollback Kolaylığı İçin Küçük PR'lar
Bölüm 6-7'deki küçük PR + squash-merge stratejisi, doğrudan bir rollback avantajı sağlar: `main`'de bir sorun tespit edildiğinde, sorunlu `git revert <commit>` ile **tek commit'lik, net sınırlı bir değişiklik** geri alınabilir — büyük, çok-özellikli commit'lerde olduğu gibi "hangi kısmı geri alacağım" belirsizliği yaşanmaz.

---

## 14. Örnek Commit Geçmişi (Faz 3 Senaryosu)

Aşağıdaki örnek, Faz 3'ün (Temel Journey Builder + Araç Profili) gerçek bir Git geçmişinde nasıl görünebileceğini gösterir — feature branch içi (squash öncesi) ve `main`'deki hali (squash sonrası) yan yana:

**`feature/faz3-vehicle-profile` branch'i içinde (squash öncesi, ham geçmiş):**
```
a1b2c3d feat(backend): vehicles tablosu Flyway migration eklendi
d4e5f6a feat(backend): Vehicle entity ve repository eklendi
b7c8d9e feat(backend): VehicleService CRUD implementasyonu
c1a2b3c feat(backend): VehicleController REST endpoint'leri
e4f5g6h test(backend): VehicleService unit testleri
f7g8h9i fix(backend): araç silme sırasında journey_id null'a çekilmiyordu
j1k2l3m docs: teknik mimari bölüm 20 API tablosu güncellendi
```

**`main`'de (squash-merge sonrası, PR #17):**
```
x9y8z7w feat(backend): araç profili CRUD ve maliyet hesabına entegrasyon (#17)
```

Bu tek commit'in açıklama gövdesinde (GitHub'ın squash-merge sırasında otomatik topladığı) tüm alt commit mesajları özet olarak korunur — yani detay kaybolmaz, sadece `main`'in ana zaman çizelgesi sadeleşir.

---

## 15. CI/CD Tetikleyicileri

Teknik Mimari Bölüm 27.2'deki pipeline'ların branch/PR olaylarıyla ilişkisi:

| Olay | Tetiklenen Pipeline | Ne Yapar |
|---|---|---|
| Herhangi bir branch'e push (PR açıkken) | `backend-ci.yml` / `mobile-ci.yml` | Lint + unit + integration testler (Teknik Mimari Bölüm 26) |
| PR, `main`'e açıldığında | Aynı pipeline'lar, ek olarak **branch koruma kuralı** bu sonucu merge şartı yapar | Yeşil olmadan `[Merge]` butonu aktif olmaz |
| `main`'e merge (squash) | Pipeline + **staging deploy** adımı (Teknik Mimari Bölüm 27.2) | Backend staging ortamına otomatik deploy edilir |
| Bir `vX.Y.Z` tag'i push edildiğinde | **production deploy** (manuel onaylı) + `eas build --profile production` (mobil) | Prod'a kontrollü, onaylı yayın |

Bu tablo, bu dokümandaki branch/tag disiplinin Teknik Mimari dokümanındaki DevOps altyapısıyla nasıl bire bir örtüştüğünü gösterir — iki doküman birbirinden bağımsız okunsa da, pratikte aynı iş akışının iki farklı yüzüdür.

---

**Doküman sonu.** Yeni bir branch türü, commit kuralı veya süreç ihtiyacı ortaya çıktığında önce burada tanımlanır; kod tabanındaki gerçek pratik bu dokümanla senkron tutulur.
