# Software Bill of Materials (SBOM)

> **Last updated**: 2026-07-21
> **Format**: Manual inventory (CycloneDX generation pending CI)

## Runtime Dependencies (apps/api)

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| @nestjs/common | ^10.3.8 | MIT | Core framework |
| @nestjs/core | ^10.3.8 | MIT | Core framework |
| @nestjs/platform-express | ^10.3.8 | MIT | HTTP adapter |
| @nestjs/platform-socket.io | ^10.3.8 | MIT | WebSocket adapter |
| @nestjs/websockets | ^10.3.8 | MIT | WebSocket support |
| @nestjs/config | ^3.2.2 | MIT | Configuration |
| @nestjs/jwt | ^10.2.0 | MIT | JWT tokens |
| @nestjs/passport | ^10.0.3 | MIT | Auth framework |
| @nestjs/swagger | ^7.3.1 | MIT | API docs |
| @nestjs/event-emitter | ^2.0.4 | MIT | Domain events |
| @nestjs/schedule | ^4.0.2 | MIT | Cron jobs |
| @nestjs/throttler | ^5.1.2 | MIT | Rate limiting |
| @nestjs/bull | ^10.1.1 | MIT | Queue integration |
| @prisma/client | ^5.14.0 | Apache-2.0 | Database ORM |
| passport | ^0.7.0 | MIT | Auth middleware |
| passport-jwt | ^4.0.1 | MIT | JWT strategy |
| bcrypt | ^5.1.1 | MIT | Password hashing |
| bull | ^4.12.2 | MIT | Job queue |
| class-transformer | ^0.5.1 | MIT | DTO transformation |
| class-validator | ^0.14.1 | MIT | Input validation |
| compression | ^1.7.4 | MIT | Response compression |
| helmet | ^7.1.0 | MIT | Security headers |
| ioredis | ^5.4.1 | MIT | Redis client |
| minio | ^8.0.0 | Apache-2.0 | Object storage |
| nodemailer | ^6.9.13 | MIT | Email |
| otplib | ^12.0.1 | MIT | TOTP (MFA) |
| socket.io | ^4.7.5 | MIT | Real-time |
| uuid | ^9.0.1 | MIT | ID generation |
| zod | ^3.23.8 | MIT | Schema validation |

## Runtime Dependencies (apps/web)

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| next | ^14.2.3 | MIT | Frontend framework |
| react | ^18.3.1 | MIT | UI library |
| react-dom | ^18.3.1 | MIT | DOM rendering |
| zustand | ^4.5.2 | MIT | State management |
| tailwindcss | ^3.4.3 | MIT | Styling |

## Infrastructure

| Component | Version | License |
|-----------|---------|---------|
| PostgreSQL | 16 | PostgreSQL License |
| Redis | 7 | BSD-3-Clause |
| Node.js | 20 LTS | MIT |

## SBOM Generation

Automated SBOM generation via CycloneDX is configured in CI but has not yet been run:
```bash
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
```

## Actions Required

- [ ] Commit package-lock.json for reproducible builds
- [ ] Run and commit CycloneDX SBOM
- [ ] Verify all transitive dependency licenses
- [ ] Set up Dependabot/Renovate for vulnerability alerts
- [ ] Pin container image versions to digests
