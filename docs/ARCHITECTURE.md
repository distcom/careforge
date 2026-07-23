# Architecture

> **Last updated**: 2026-07-21

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Next.js Web │  │ Patient Portal│  │  FHIR Client │  │
│  │  (App Router)│  │  (self-svc)  │  │  (3rd party) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │ HTTPS            │ HTTPS            │ HTTPS
┌─────────┼──────────────────┼──────────────────┼─────────┐
│         ▼                  ▼                  ▼         │
│  ┌─────────────────────────────────────────────────┐    │
│  │           NestJS API (Modular Monolith)         │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │  Global Guards: JWT Auth + Rate Limit   │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │    │
│  │  │Identity│ │Patient │ │Encount.│ │Billing │   │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘   │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │    │
│  │  │Lab     │ │Meds    │ │Schedul.│ │Telehlth│   │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘   │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │    │
│  │  │FHIR    │ │HL7     │ │C-CDA   │ │X12 EDI │   │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘   │    │
│  └─────────────────────────────────────────────────┘    │
│                    Server Layer                          │
└───────┬──────────────┬──────────────┬───────────────────┘
        │              │              │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │PostgreSQL│   │  Redis  │   │   S3    │
   │   16    │   │   7     │   │ Storage │
   └─────────┘   └─────────┘   └─────────┘
```

## Design Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| Modular monolith | Simpler deployment, no distributed systems complexity | Harder to scale individual modules |
| Prisma ORM | Type-safe queries, migration management | Less control over raw SQL performance |
| Event-driven (EventEmitter) | Loose coupling between modules | In-process only, no durability guarantee |
| BullMQ for async | Durable job processing with retries | Requires Redis infrastructure |
| Deny-by-default auth | Security-first; explicit @Public() required | Must remember to mark public endpoints |

## Module Communication

- **Synchronous**: Direct service injection (NestJS DI)
- **Asynchronous**: EventEmitter2 (in-process domain events)
- **Background jobs**: BullMQ (Redis-backed queues)
- **Real-time**: Socket.IO (WebSocket gateway)

## Data Flow

1. Request → Global JWT Guard → Roles/Permissions Guard → Controller → Service → Prisma → PostgreSQL
2. Service emits domain event → Event handlers (audit, notification, billing auto-charge)
3. Background jobs: reminders, batch processing, notification delivery

## Deployment Topology (Target)

```
[Load Balancer / TLS termination]
    ├── [API Container × N] → [PostgreSQL Primary + Replica]
    │                       → [Redis Cluster]
    │                       → [S3-compatible Storage]
    └── [Web Container × N] (static + SSR)
```

## Not Yet Architected

- Service mesh / API gateway
- Distributed tracing (OpenTelemetry)
- Centralized logging (ELK/Loki)
- Metrics and alerting (Prometheus/Grafana)
- Secrets management (Vault)
- Multi-tenancy / organization isolation
