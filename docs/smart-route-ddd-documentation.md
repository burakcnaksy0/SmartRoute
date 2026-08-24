# Smart-Route — Domain-Driven Design Dokümantasyonu

## 1. Business Vizyonu

Sıradan harita uygulamalarının bıraktığı boşluğu doldurarak, kullanıcının yalnızca *"nereye gideceğini"* söylemesinin yettiği; *"hangi sırayla ve nasıl"* gideceğinin ise gelişmiş yapay zekâ ve matematiksel algoritmalarla çözülüp kullanıcıya zaman ve para olarak geri döndüğü akıllı bir asistan sunmak.

**Ürün Vizyonu:** Kullanıcının rota planlama yükünü ortadan kaldıran, çok duraklı seyahat planlamasını yapay zekâ ve optimizasyon algoritmalarıyla otomatikleştiren akıllı ulaşım asistanı.

---

## 2. Domain / DDD

### 2.1 Domain Tanımı

**Intelligent Route Planning**

Kullanıcının birden fazla hedefini; zaman, mesafe, maliyet, kullanıcı tercihleri ve belirlenen kısıtlar doğrultusunda optimize edilmiş bir rota planına dönüştüren domain.

**Core Domain:** *Multi-Stop Route Optimization*
Sistemin temel rekabetçi değerini oluşturan business problemidir. Kullanıcının birden fazla destinasyonu için en uygun ziyaret sırasının ve rotanın belirlenmesini amaçlar.

### 2.2 Domain Problemi

Kullanıcının birden fazla hedefi için yalnızca hedefler arasındaki rotayı bulmak yeterli değildir. Bu hedeflerin hangi sırayla ziyaret edileceği ve hangi rota üzerinden gidileceği aşağıdaki faktörler dikkate alınarak belirlenmelidir:

- Mesafe
- Süre
- Maliyet
- Kullanıcı tercihleri
- Rota kısıtları
- Ulaşım türü

### 2.3 Domain Kavramları

| Kategori | Kavramlar |
|---|---|
| **Core Concepts** | RoutePlan, Destination, Stop, Route, Optimization, OptimizationResult, Constraint |
| **Supporting Concepts** | User, Preference, TravelMode |
| **Value Concepts** | Location, Coordinates, Distance, Duration, Cost |

### 2.4 Domain Davranışları

- Route Plan oluşturma
- Destination ekleme / kaldırma
- Route hesaplama
- Route optimizasyonu
- Constraint uygulama
- User Preference uygulama
- Optimization Result üretme
- Route Plan'ı yeniden optimize etme

### 2.5 Bounded Context'ler

#### Route Planning Context (Ana Business Context)

**Sorumlulukları:**
- Route Plan oluşturmak
- Destinasyonları yönetmek
- Rota kısıtlarını yönetmek
- Kullanıcı tercihlerini dikkate almak
- Optimize edilmiş rota planını üretmek

**Temel kavramlar:** RoutePlan, Destination, Stop, Route, Constraint, Preference, TravelMode, Optimization, OptimizationResult

#### User Context
#### Location Context

---

## 3. Use Case'ler

### 3.1 Aktörler

**User** — Sistemin ana aktörüdür. Rota planı oluşturur, destinasyonlarını belirler, tercih ve kısıtlarını tanımlar, optimize edilmiş rota planını alır.

**External Routing Provider** — Rota, mesafe, süre ve benzeri coğrafi/ulaşım verilerini sağlayan dış sistemler.

### 3.2 Core Use Case'ler

**3.2.1 Optimize Route Plan**
Birden fazla destinasyonun; mesafe, süre, maliyet, kullanıcı tercihleri ve rota kısıtları dikkate alınarak en uygun ziyaret sırasının belirlenmesi.

**3.2.2 Re-optimize Route Plan**
Mevcut rota planındaki destinasyon, tercih veya kısıtların değişmesi durumunda rotanın yeniden optimize edilmesi.

### 3.3 Supporting Use Case'ler

| # | Use Case | Açıklama |
|---|---|---|
| 3.3.1 | Create Route Plan | Yeni bir rota planı oluşturulması |
| 3.3.2 | Add Destination | Mevcut rota planına yeni destinasyon eklenmesi |
| 3.3.3 | Remove Destination | Mevcut rota planından destinasyon kaldırılması |
| 3.3.4 | Configure Route Preferences | Optimizasyonda dikkate alınacak tercihlerin belirlenmesi |
| 3.3.5 | Configure Route Constraints | Optimizasyonu sınırlandıran kuralların belirlenmesi |
| 3.3.6 | Get Route Plan | Mevcut rota planının ve optimizasyon sonucunun sunulması |
| 3.3.7 | Save Route Plan | Rota planının daha sonra kullanılmak üzere kaydedilmesi |

### 3.4 AI-Assisted Use Case'ler

| # | Use Case | Açıklama |
|---|---|---|
| 3.4.1 | Interpret Route Request | Doğal dildeki rota isteğinin sistem tarafından anlaşılabilir gereksinimlere dönüştürülmesi |
| 3.4.2 | Extract Destinations | Doğal dilde belirtilen destinasyonların tespit edilmesi |
| 3.4.3 | Infer Route Preferences | Doğal dilde ifade edilen rota tercihlerinin belirlenmesi |

---

## 4. Mimari

### 4.1 Mimari Yaklaşım

Sistem, domain business kurallarını teknik altyapıdan ayırmak amacıyla **Domain-Driven Design** ve **Hexagonal Architecture** prensipleri doğrultusunda tasarlanacaktır.

İlk aşamada sistemin **modular monolith** olarak geliştirilmesi ve domain sınırlarının net biçimde ayrıştırılması planlanmaktadır. İlerleyen aşamalarda ölçeklenebilirlik, bağımsız deployment ve operasyonel gereksinimler doğrultusunda uygun bounded context'lerin bağımsız servislere ayrıştırılması mümkün olacaktır.

### 4.2 Mimari Katmanlar

| Katman | Sorumluluk |
|---|---|
| **API / Presentation Layer** | Sistem dışından gelen HTTP isteklerini karşılar ve ilgili application use case'lerini çağırır |
| **Application Layer** | Use case'lerin orkestrasyonundan sorumludur (Create Route Plan, Add Destination, Optimize Route Plan, Re-optimize Route Plan, Get Route Plan) |
| **Domain Layer** | Sistemin temel business kurallarını ve domain modelini içerir. Herhangi bir dış API, database veya framework implementasyonuna doğrudan bağımlı olmamalıdır |
| **Infrastructure Layer** | Database, cache, routing provider, geocoding provider ve AI provider gibi dış sistemlerle iletişimi gerçekleştirir |

### 4.3 Dış Sistem Entegrasyonu

Dış sistemlere doğrudan domain bağımlılığı oluşturulmaması için **Port & Adapter** yaklaşımı kullanılacaktır.

```
Domain/Application
       ↓
Routing Port
       ↓
Routing Adapter
       ↓
External Routing Provider
```

Aynı yaklaşım AI, geocoding ve diğer dış servis entegrasyonları için de uygulanacaktır.

### 4.4 İlk Deployment Stratejisi

Sistem başlangıçta **modular monolith** olarak ele alınacaktır. Bu tercih, erken aşamada gereksiz distributed-system karmaşıklığından kaçınmayı ve domain modelinin hızlı şekilde doğrulanmasını amaçlamaktadır.

İlerleyen aşamalarda bounded context'lerin bağımsız ölçeklenmesi veya deployment edilmesini gerektiren operasyonel ihtiyaçlar ortaya çıkarsa, ilgili modüller microservice olarak ayrıştırılabilecektir.

---

## 5. Non-Functional Requirements (NFR)

NFR'ler, sistemin hangi işlevleri gerçekleştireceğinden ziyade bu işlevleri hangi kalite, performans, güvenlik, güvenilirlik ve ölçeklenebilirlik seviyesinde gerçekleştirmesi gerektiğini tanımlar. Smart-Route için NFR'ler, ilerleyen mimari ve teknoloji kararlarının temel girdilerini oluşturacaktır.

### 5.1 Performance

**Gereksinimler:**
- Normal rota hesaplama işlemleri düşük gecikmeyle gerçekleştirilebilmelidir
- Multi-stop route optimization işlemleri kabul edilebilir süre içerisinde tamamlanmalıdır
- External API çağrılarının sistem performansına etkisi kontrol altında tutulmalıdır
- Gereksiz ve tekrarlayan hesaplamalar önlenmelidir
- Performans ölçümleri average response time yerine **P95 / P99 latency** değerleri üzerinden değerlendirilmelidir

**Başlangıç Hedefleri:**

| Operation | Target |
|---|---:|
| Normal Route Calculation | P95 < 2 saniye |
| Multi-Stop Optimization | P95 < 5 saniye |
| API Response Time | P95 < 2 saniye |

> Bu değerler başlangıç hedefleridir. Gerçek yük ve performans testleri sonucunda yeniden değerlendirilecektir.

### 5.2 Scalability

Sistem, kullanıcı ve rota taleplerindeki artışa paralel olarak yatay şekilde ölçeklenebilir olmalıdır. Özellikle route optimization işlemlerinin CPU ve hesaplama maliyetinin normal API işlemlerinden ayrıştırılabilmesi mümkün olmalıdır.

**Gereksinimler:**
- API katmanı horizontal scaling desteklemelidir
- Optimization workload'u gerektiğinde bağımsız olarak ölçeklendirilebilmelidir
- Artan kullanıcı sayısı sistemin tamamının yeniden tasarlanmasını gerektirmemelidir
- External API kullanımındaki artış kontrol altında tutulabilmelidir
- Database ve cache katmanlarının ölçeklenebilirliği göz önünde bulundurulmalıdır

### 5.3 Availability

**Başlangıç Hedefi:** Production ortamında minimum **%99.9 availability**

**Gereksinimler:**
- Tek bir instance'ın başarısız olması sistemin tamamının kullanılabilirliğini engellememelidir
- Kritik external service failure durumlarında sistem kontrollü şekilde davranmalıdır
- Health check mekanizmaları bulunmalıdır
- Kritik servislerin durumları izlenebilmelidir

### 5.4 Reliability

**Gereksinimler:**
- Geçersiz route planlarının oluşturulması engellenmelidir
- Optimization sonucunun domain kurallarını ihlal etmesine izin verilmemelidir
- External API hataları kontrollü şekilde ele alınmalıdır
- Geçici network problemleri için uygun retry mekanizmaları kullanılmalıdır
- Retry işlemleri sistem üzerinde duplicate işlem oluşturmamalıdır
- Kritik operasyonlarda timeout mekanizmaları bulunmalıdır
- Gerektiğinde circuit breaker mekanizması kullanılabilmelidir
- Kullanıcıya teknik hata detayları yerine anlamlı hata mesajları sunulmalıdır

### 5.5 Consistency

Route Plan ve Optimization sonuçları arasında tutarlılık korunmalıdır.

**Gereksinimler:**
- Optimization işlemi belirli bir Route Plan versiyonu üzerinden gerçekleştirilmelidir
- Route Plan değiştiğinde eski optimization sonucu geçersiz kabul edilebilmelidir
- Kullanıcıya güncel olmayan bir optimization sonucu sunulmamalıdır
- Distributed işlemler kullanıldığında veri tutarlılığı açıkça tanımlanmalıdır

**Örnek:**
```
RoutePlan v1
     |
     | Optimization
     v
OptimizationResult v1

User modifies destinations
     v
RoutePlan v2

OptimizationResult v1
        |
        X
   No longer valid
```

### 5.6 Idempotency

Özellikle route optimization gibi maliyetli işlemlerde aynı isteğin birden fazla kez gönderilmesi kontrol edilmelidir.

**Gereksinimler:**
- Aynı optimization request'inin tekrar gönderilmesi duplicate optimization işlemi oluşturmamalıdır
- Retry edilen request'ler güvenli şekilde tekrar çalıştırılabilmelidir
- Gerekli durumlarda idempotency key veya request identifier kullanılmalıdır

**Örnek:**
```
Client
  |
  | POST /route-plans/{id}/optimize
  | Idempotency-Key: abc-123
  v
System
  |
  +---- First Request  -> Optimization
  |
  +---- Duplicate      -> Existing Result
```

### 5.7 Security

**Gereksinimler:**
- Kullanıcı authentication mekanizması bulunmalıdır
- Kullanıcıların yalnızca yetkili oldukları kaynaklara erişmesine izin verilmelidir
- API endpoint'leri uygun authorization kontrollerine sahip olmalıdır
- Tüm network iletişimi HTTPS üzerinden gerçekleştirilmelidir
- Kullanıcı girdileri güvenli şekilde validate edilmelidir
- Secrets ve API key'ler source code içerisinde tutulmamalıdır
- External API credentials güvenli şekilde yönetilmelidir
- Rate limiting uygulanmalıdır
- Hatalı authentication ve authorization girişimleri izlenebilmelidir

### 5.8 Privacy

**Gereksinimler:**
- Kullanıcı konum verileri yalnızca gerekli amaçlar doğrultusunda işlenmelidir
- Kullanıcıya ait kayıtlı rota ve konum verilerine yalnızca yetkili kullanıcı erişebilmelidir
- Hassas veriler gereksiz şekilde loglanmamalıdır
- Location history tutuluyorsa retention policy tanımlanmalıdır
- Kullanıcı verilerinin silinmesi durumunda ilgili verilerin lifecycle'ı tanımlanmalıdır
- KVKK ve gerektiğinde GDPR gibi ilgili veri koruma gereksinimleri değerlendirilmelidir

### 5.9 Observability

```
Observability
    |
    +-- Logs
    |
    +-- Metrics
    |
    +-- Traces
```

**Gereksinimler:**
- Kritik business operasyonları loglanmalıdır
- Loglarda correlation/request ID bulunmalıdır
- Route optimization süresi ölçülmelidir
- Optimization başarı ve başarısızlık oranları izlenebilmelidir
- External API response time ölçülmelidir
- External API failure oranları takip edilmelidir
- API latency değerleri P95/P99 olarak ölçülebilmelidir
- Kritik servislerin health durumu izlenebilmelidir

**Önemli Metrikler:**
```
route.optimization.duration
route.optimization.success
route.optimization.failure
route.optimization.destination.count
route.optimization.distance
external.routing.latency
external.routing.failure
ai.request.latency
ai.request.failure
api.request.latency
api.request.error.rate
```

### 5.10 Maintainability

Sistem, business logic ile infrastructure implementasyonlarının birbirinden ayrılmasını sağlamalıdır.

**Gereksinimler:**
- Domain logic external service'lere doğrudan bağımlı olmamalıdır
- Domain layer database implementation detaylarını bilmemelidir
- External API integrations Port & Adapter yaklaşımıyla gerçekleştirilebilmelidir
- Business logic framework bağımlılığından mümkün olduğunca bağımsız tutulmalıdır
- Kod modüler ve test edilebilir olmalıdır
- Bounded Context sınırları korunmalıdır
- Yeni bir routing provider'ın mevcut domain logic'i değiştirmeden eklenebilmesi mümkün olmalıdır

**Örnek:**
```
Domain
  |
  v
RoutingPort
  |
  +-- OpenRouteServiceAdapter
  |
  +-- GoogleMapsAdapter
  |
  +-- OtherRoutingAdapter
```
Domain, hangi provider'ın kullanıldığını bilmez.

### 5.11 Testability

Core business logic bağımsız şekilde test edilebilir olmalıdır. Özellikle **Multi-Stop Route Optimization** domain'i yüksek test coverage'a sahip olmalıdır.

**Gereksinimler:**
- Domain logic external API olmadan test edilebilmelidir
- Optimization algoritmaları unit test edilebilmelidir
- Domain business rules test edilmelidir
- Constraint ve preference davranışları test edilmelidir
- Integration testleri external dependencies'den mümkün olduğunca izole edilebilmelidir
- Kritik API endpoint'leri integration testlere sahip olmalıdır

**Örnek:**
```
Input:
  Origin: A
  Destinations: B, C, D
  Constraint: Avoid Toll Roads
  Preference: Shortest
        |
        v
   Optimization
        |
        v
Expected Valid Route
```

### 5.12 Cost Efficiency

Sistem, external API ve infrastructure maliyetlerini kontrollü tutmalıdır. Özellikle şu servislerin kullanım maliyetleri dikkate alınmalıdır: Routing API, Geocoding API, AI API, Database, Cache, Compute, Storage.

**Gereksinimler:**
- Gereksiz external API çağrıları önlenmelidir
- Tekrarlanan route ve location verileri gerektiğinde cache'lenebilmelidir
- Distance matrix gibi tekrar kullanılabilir sonuçlar uygun durumlarda yeniden kullanılmalıdır
- AI API çağrıları kontrol altında tutulmalıdır
- API provider rate limit'leri dikkate alınmalıdır
- Infrastructure resource consumption izlenmelidir

### 5.13 Usability

**Gereksinimler:**
- Kullanıcı minimum miktarda bilgi girerek route plan oluşturabilmelidir
- Optimization sonucu anlaşılır şekilde sunulmalıdır
- Kullanıcıya toplam mesafe, tahmini süre ve tahmini maliyet gibi önemli bilgiler gösterilmelidir
- Optimization işleminin uzun sürmesi durumunda kullanıcıya işlem durumu gösterilmelidir
- Hatalar kullanıcı açısından anlaşılabilir mesajlarla gösterilmelidir

### 5.14 Resilience

External servislerin başarısız olması sistemin tamamının çökmesine neden olmamalıdır.

**Gereksinimler:**
- Routing provider unavailable olduğunda kontrollü fallback davranışı bulunmalıdır
- AI provider unavailable olduğunda sistem mümkün olan durumlarda AI olmadan temel route planning işlemlerini gerçekleştirebilmelidir
- Timeout mekanizmaları kullanılmalıdır
- Retry yalnızca uygun hata türlerinde uygulanmalıdır
- Circuit breaker gerektiğinde kullanılmalıdır
- External dependency failure durumları observability sistemi tarafından izlenmelidir

**Örnek:**
```
Route Planning
      |
      +------> Routing Provider
      |
      |       SUCCESS
      |          |
      |          v
      |       Continue
      |
      |       FAILURE
      |          |
      |          v
      |    Retry / Fallback
      |          |
      |          v
      |     Controlled Error
```

### 5.15 NFR Özeti

| Category | Requirement | Initial Target / Principle |
|---|---|---|
| Performance | Normal Route Calculation | P95 < 2s |
| Performance | Multi-Stop Optimization | P95 < 5s* |
| Scalability | API Scaling | Horizontal scaling |
| Availability | Production Availability | ≥ %99.9* |
| Reliability | External Failures | Graceful failure |
| Consistency | Route Plan / Result | Version-aware |
| Idempotency | Duplicate Requests | Prevented |
| Security | Unauthorized Access | Not permitted |
| Privacy | Location Data | Protected |
| Observability | Critical Operations | Logs + Metrics + Traces |
| Maintainability | Domain Independence | Infrastructure agnostic |
| Testability | Core Domain | Independently testable |
| Cost Efficiency | External APIs | Controlled usage |
| Usability | Route Result | Clear and understandable |
| Resilience | External Dependencies | Timeout + Retry + Fallback |

\* İşaretli değerler başlangıç hedefleridir. Gerçek yük, benchmark ve production verileri doğrultusunda yeniden değerlendirilecektir.

---

## 6. Sıradaki Adım: Scale / Capacity Planning

Bu bölümden sonra doğal sıra **Scale / Capacity Planning**'e geçmek. Orada varsayımlar konularak şu zincir hesaplanacak:

```
DAU → Peak RPS → Günlük Route Request → Optimization Workload → DB Büyümesi → External API Çağrı Sayısı
```

Bu hesaplar, mimaride Kafka / Redis / worker / microservice gibi bileşenlerin gerçekten gerekip gerekmediğini belirleyecek.
