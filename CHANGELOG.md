# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-09

### Added
- **Monorepo Structure**: Set up foundational `backend/`, `mobile/`, and `.github/workflows/` directories.
- **Backend Setup**:
  - Initialized Spring Boot 3.3.2 project with Maven & Java 21.
  - Formed layer folders (`config`, `controller`, `service`, `repository`, `domain`, `dto`, `mapper`, `exception`, `client`).
  - Added PostGIS extension integration via Flyway (`V1__init.sql`).
  - Wired spring datasource and `/actuator/health` checker endpoint.
- **Mobile Setup**:
  - Seeded Expo SDK 57 app with TypeScript support.
  - Mapped folder routes according to technical blueprints (`(auth)`, `(tabs)/journey`, `(tabs)/history`, `(tabs)/profile`).
  - Designed "Hello SmartRoute" premium dashboard screen for verification.
  - Resolved CSS typescript module declarations.
- **Local Infra**: Established Docker Compose bindings for PostgreSQL 16 (PostGIS) and Redis services.
- **CI/CD Integrations**: Wrote workflow actions for backend compilation checks and mobile ESLint + TypeScript type verification.
