# 🏥 CareForge EHR Platform

> **Forging the future of healthcare** — A modern Electronic Health Records platform built with TypeScript, NestJS, Next.js, and PostgreSQL.

> ⚠️ **EXPERIMENTAL PROTOTYPE** — This software is NOT production-ready, NOT HIPAA compliant, NOT ONC certified, and NOT clinically safe for patient care. See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for honest feature status.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![NestJS](https://img.shields.io/badge/NestJS-10-red)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)
![Status](https://img.shields.io/badge/Status-Experimental-orange)

---

## Overview

CareForge is an EHR (Electronic Health Records) platform in active development. It aims to provide clinical, administrative, and billing tools with a focus on interoperability, security, and usability.

**Current state**: The codebase contains partial backend implementations for 26 domain modules with database models, service logic, and API endpoints. However, most features are incomplete workflows, simulated integrations, or untested code. No feature has been validated for production use.

### What Exists (Partial)

- 26 domain module scaffolds with service logic
- Prisma schema with 50+ models
- JWT auth with RBAC guards (deny-by-default)
- HL7 v2.x message generation/parsing (string-level, no transport)
- FHIR R4 resource mapping (no profile validation)
- C-CDA XML generation (no schema validation)
- X12 837P string generation (no clearinghouse transport)
- Drug interaction checking (hard-coded data, no licensed source)
- ePrescribing XML generation (no pharmacy network transmission)
- WebSocket gateway (no signaling server)
- Next.js frontend with basic dashboard pages

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

## Interoperability (Simulated — Not Validated)

> ⚠️ All interoperability features currently generate/parse strings locally. None perform actual network transmission, schema validation, or conformance testing.

### HL7 v2.x (String generation/parsing only)
- ORM^O01 message string generation
- ORU^R01 result string parsing
- ADT^A01/A04/A08 patient sync string parsing
- No MLLP transport, no durable queues, no ACK/NAK handling

### FHIR R4 (Basic mapping only)
- Patient, Encounter, Observation resource mapping
- No SMART on FHIR, no profile validation, no conformance testing

### C-CDA (XML string generation only)
- CCD XML string assembly
- No CDA schema validation, no template conformance

### X12 EDI (String generation only)
- 837P segment string assembly
- No clearinghouse transport, no 999/277CA processing

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

## Security (Partial — Not Audited)

> ⚠️ Security measures are partially implemented. No penetration testing or security audit has been performed.

- JWT + Refresh Tokens with rotation and reuse detection
- Deny-by-default global auth guard
- Role-Based Access Control (RBAC) with granular permissions
- Account lockout after failed attempts
- Rate limiting (100 req/60s per IP)
- Helmet.js security headers + CORS
- Input validation via class-validator
- Backup operations restricted to admin with path traversal protection
- **NOT implemented**: MFA enrollment, contextual authorization, break-glass, audit tamper evidence, encryption at rest

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
