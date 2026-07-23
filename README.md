# 🏥 CareForge EHR Platform

> **Forging the future of healthcare** — A modern, comprehensive Electronic Health Records platform built from the ground up with TypeScript, NestJS, Next.js, and PostgreSQL.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![NestJS](https://img.shields.io/badge/NestJS-10-red)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Overview

CareForge is a full-featured, enterprise-grade EHR (Electronic Health Records) platform designed for modern healthcare practices. It provides a complete suite of clinical, administrative, and billing tools with a focus on interoperability, security, and usability.

### Key Highlights

- **26 domain modules** covering the full clinical workflow
- **HL7 v2.x** message processing (ORM, ORU, ADT)
- **FHIR R4** API endpoints for interoperability
- **C-CDA/CCD** document generation for care continuity
- **X12 EDI 837P** claim generation for billing
- **ePrescribing** with NCPDP SCRIPT standard
- **Drug interaction checking** (drug-drug, drug-allergy, duplicate therapy)
- **Real-time** WebSocket notifications + WebRTC telehealth
- **Pediatric growth charts** (WHO/CDC LMS percentiles)
- **i18n** support for 8 languages
- **Patient merge/deduplication** with fuzzy matching
- **Database backup/restore** utilities

---

## Architecture

```
careforge/
├── apps/
│   ├── api/          # NestJS 10 REST API (modular monolith)
│   └── web/          # Next.js 14 frontend (App Router + Tailwind)
├── packages/
│   ├── shared/       # Shared types, constants, validation
│   ├── fhir/         # FHIR R4 type definitions & mappers
│   └── ui/           # Reusable React component library
├── turbo.json        # Turborepo pipeline config
└── package.json      # Workspace root
```

### Backend (apps/api)

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 10 (modular monolith) |
| ORM | Prisma 5 with PostgreSQL 16 |
| Auth | JWT + Passport.js with RBAC |
| Real-time | Socket.IO WebSocket gateway |
| Queue | BullMQ (Redis-backed) |
| Events | NestJS EventEmitter (event-driven architecture) |
| Cache | Redis |
| Storage | S3-compatible object storage |
| Mail | Nodemailer |
| Docs | Swagger/OpenAPI auto-generated |

### Frontend (apps/web)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| State | Zustand |
| HTTP | Custom typed API client |

---

## Domain Modules

| Module | Description |
|--------|-------------|
| **Identity** | Authentication, authorization, RBAC, MFA |
| **Patient** | Demographics, contacts, consents, merge/dedup |
| **Scheduling** | Appointments, provider schedules, recurring visits |
| **Encounter** | Clinical visits, SOAP notes, diagnoses, procedures |
| **Vitals** | Vital signs recording, trends, growth charts |
| **Condition** | Problem list, ICD-10/SNOMED coding |
| **Medication** | Medications, prescriptions, drug interactions, ePrescribing |
| **Allergy** | Allergy/intolerance tracking with severity |
| **Immunization** | Vaccine records, CVX codes, series tracking |
| **Laboratory** | Lab orders, results, HL7 integration |
| **Procedure** | CPT-coded procedures with laterality |
| **Document** | File uploads, signing, C-CDA generation |
| **Care Plan** | Care plans with goals and tracking |
| **Referral** | Provider referrals with urgency levels |
| **Billing** | Charges, claims (X12 837P), payments, fee schedules |
| **Insurance** | Payer management, patient coverage |
| **Reporting** | Dashboard stats, census, revenue, exports (CSV/PDF) |
| **Messaging** | Secure provider-patient messaging threads |
| **Portal** | Patient portal (self-service) |
| **Notification** | In-app + email notifications |
| **Telehealth** | WebRTC video visits with waiting rooms |
| **Terminology** | ICD-10, CPT, SNOMED, LOINC, RxNorm code sets |
| **Facility** | Multi-facility management |
| **Audit** | Full audit trail with break-glass access |
| **Admin** | System settings, roles, permissions, tasks |
| **FHIR** | FHIR R4 resource endpoints |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL 16
- Redis 7+
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/distcom/careforge.git
cd careforge

# Install dependencies
npm install

# Set up environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your database and Redis connection strings

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed initial data (roles, permissions, admin user)
npm run db:seed
```

### Development

```bash
# Start all services (API + Web) with hot reload
npm run dev

# API only (http://localhost:4000)
npm run dev --filter=api

# Web only (http://localhost:3000)
npm run dev --filter=web
```

### API Documentation

Once the API is running, Swagger docs are available at:
```
http://localhost:4000/api/docs
```

---

## Environment Variables

### API (apps/api/.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | — |
| `JWT_EXPIRES_IN` | Token expiry | `15m` |
| `PORT` | API port | `4000` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |
| `S3_ENDPOINT` | Object storage endpoint | — |
| `S3_BUCKET` | Storage bucket name | — |
| `SMTP_HOST` | Mail server host | — |

### Web (apps/web/.env.local)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API base URL | `http://localhost:4000/api/v1` |

---

## API Endpoints (Overview)

All endpoints are prefixed with `/api/v1` and require JWT Bearer authentication unless noted.

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/forgot-password` |
| Patients | `GET/POST /patients`, `GET/PUT/DELETE /patients/:id`, `POST /patients/merge` |
| Encounters | `GET/POST /encounters`, `GET/PUT /encounters/:id`, `POST /encounters/:id/sign` |
| Scheduling | `GET/POST /appointments`, `PUT /appointments/:id/status` |
| Vitals | `GET/POST /patients/:id/vitals`, `GET /patients/:id/vitals/growth-chart` |
| Medications | `GET/POST /patients/:id/medications`, `POST /patients/:id/medications/eprescribe` |
| Lab Orders | `GET/POST /lab-orders`, `POST /lab-orders/hl7/ingest` |
| Billing | `GET/POST /billing/charges`, `GET/POST /billing/claims`, `POST /billing/claims/:id/submit` |
| Documents | `GET/POST /patients/:id/documents`, `GET /patients/:id/documents/ccda/ccd` |
| Telehealth | `GET/POST /telehealth/sessions`, `POST /telehealth/sessions/:roomCode/join` |
| Reports | `GET /reports/dashboard`, `POST /reports/export/*` |
| FHIR | `GET /fhir/Patient`, `GET /fhir/Encounter`, `GET /fhir/Observation` |
| Admin | `GET /admin/users`, `GET /admin/roles`, `GET /admin/settings` |

---

## Interoperability

### HL7 v2.x
- **ORM^O01** — Incoming/outgoing lab orders
- **ORU^R01** — Lab results ingestion with abnormal flagging
- **ADT^A01/A04/A08** — Patient demographics sync
- Automatic ACK response generation

### FHIR R4
- Patient, Encounter, Observation, Condition, AllergyIntolerance, MedicationRequest, Immunization resources
- Bundle responses with pagination
- Capability statement at `/fhir/metadata`

### C-CDA
- Continuity of Care Document (CCD) generation
- Includes: demographics, allergies, medications, conditions, vitals, immunizations, encounters
- XML output compliant with HL7 C-CDA R2.1

### X12 EDI
- 837P professional claim generation
- Segment-level formatting (ISA, GS, ST, CLM, SV1, SE, GE, IEA)

---

## Testing

```bash
# Run all tests
npm test

# Run tests for a specific workspace
npm test --filter=api

# E2E tests
npm run test:e2e
```

---

## Database

The Prisma schema defines **50+ models** covering:
- Identity & access (User, Role, Permission, Facility)
- Patient management (Patient, Contact, Consent, Insurance)
- Clinical records (Encounter, VitalSign, Condition, Medication, Allergy, Immunization)
- Laboratory (LabOrder, LabOrderItem)
- Billing (Charge, Claim, ClaimItem, Payment, FeeSchedule)
- Documents & care plans
- Messaging & notifications
- Telehealth sessions
- Terminology (CodeSet, CodeValue)
- System (AuditLog, SystemSetting, Task)

```bash
# View schema
cat apps/api/prisma/schema.prisma

# Open Prisma Studio (visual database browser)
cd apps/api && npx prisma studio
```

---

## Security

- **JWT + Refresh Tokens** with configurable expiry
- **Role-Based Access Control (RBAC)** with granular permissions
- **MFA** support (TOTP)
- **Break-glass access** with audit logging
- **Helmet.js** security headers + CORS
- **Input validation** via class-validator (whitelist + forbidNonWhitelisted)
- **Full audit trail** on all clinical data access
- **Soft deletes** on sensitive records

---

## Tech Stack Summary

| Category | Technology |
|----------|-----------|
| Language | TypeScript 5.4 (strict mode) |
| Backend | NestJS 10, Prisma 5, PostgreSQL 16 |
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Monorepo | Turborepo 2.0 |
| Real-time | Socket.IO, WebRTC |
| Queue | BullMQ + Redis |
| Auth | Passport.js, JWT, bcrypt |
| Testing | Jest, Supertest |
| Docs | Swagger/OpenAPI |
| Standards | HL7 v2.x, FHIR R4, C-CDA R2.1, X12 837P, NCPDP SCRIPT |

---

## License

MIT © 2024 CareForge

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `refactor:` — Code refactoring
- `test:` — Tests
- `chore:` — Build/tooling
