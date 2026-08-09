# SmartRoute Monorepo

Welcome to the **SmartRoute** monorepo. SmartRoute is a multi-stop journey optimization application designed to plan, calculate, and select optimal route paths using advanced algorithms and external map integrations.

## Repository Structure

Following a unified monorepo approach, the codebase is structured as follows:

```
SmartRoute/
├── .github/workflows/          # GitHub Actions CI/CD pipelines
│   ├── backend-ci.yml          # Backend verification pipeline
│   └── mobile-ci.yml           # Mobile lint and typecheck pipeline
├── backend/                    # Spring Boot 3.x backend application
│   ├── src/main/java/com/smartroute/
│   │   ├── config/             # Config layer
│   │   ├── controller/         # API Controllers
│   │   ├── service/            # Core business logic services
│   │   ├── repository/         # Data access interfaces
│   │   ├── domain/             # Entities
│   │   ├── dto/                # Data Transfer Objects
│   │   ├── mapper/             # Object mappers
│   │   ├── exception/          # Global Exception handlers
│   │   └── client/             # Map API & external clients
│   ├── src/main/resources/
│   │   ├── db/migration/       # Flyway database migrations
│   │   └── application.properties
│   └── .env.example
├── mobile/                     # React Native Expo mobile application
│   ├── app/                    # File-system router screens (Expo Router)
│   │   ├── (auth)/             # Login and Registration flow
│   │   ├── (tabs)/             # Application primary tabs (Journey, History, Profile)
│   │   └── _layout.tsx         # Root application stack
│   ├── src/
│   │   ├── api/                # Network services and endpoints
│   │   ├── store/              # Zustand global state managers
│   │   ├── types/              # TS interface / type declarations
│   │   ├── components/         # Shared UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Helper utilities
│   │   └── constants/          # Application-wide themes and styles
│   └── .env.example
├── docs/                       # Architectural and standard guides
├── docker-compose.yml          # Local containerized infrastructure (PostGIS, Redis)
└── CHANGELOG.md                # Project version log
```

---

## 🛠 Local Development Setup

### 1. Database & Cache Infrastructure
SmartRoute uses **PostgreSQL 16 with PostGIS** for spatial routing and **Redis** for search caching. Spin them up with Docker Compose:

```bash
docker compose up -d
```

### 2. Backend Application Setup
The backend is powered by **Java 21** and **Spring Boot 3.x**.

- Copy backend environment template:
  ```bash
  cp backend/.env.example backend/.env
  ```
- Build the project using Maven:
  ```bash
  cd backend
  ./mvnw clean package
  ```
- Run the application:
  ```bash
  JAVA_HOME=/usr/lib/jvm/jdk-24.0.2-oracle-x64 ./mvnw spring-boot:run
  ```
- Verify health:
  ```bash
  curl http://localhost:8082/actuator/health
  ```

### 3. Mobile Application Setup
The mobile frontend is an **Expo (React Native)** application with **TypeScript**.

- Copy mobile environment template:
  ```bash
  cp mobile/.env.example mobile/.env
  ```
- Install dependencies:
  ```bash
  cd mobile
  npm install
  ```
- Start Expo development server (for iOS Expo Go or Web testing):
  ```bash
  npm run start
  # or specifically for web:
  npm run web
  ```

---

## 🚀 Continuous Integration (CI)

Our workflows automatically validate pull requests and pushes to `main` and `develop` branches:
- **Backend CI**: Formats, compile-checks, and builds the Java package.
- **Mobile CI**: Runs ESLint and checks TypeScript types (`npx tsc --noEmit`) to verify zero errors.
