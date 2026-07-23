# HIPAA Control Matrix

> **Last updated**: 2026-07-21
> **Status**: Initial — controls identified but not independently assessed
> **Scope**: Technical safeguards for the supported deployment architecture

## Purpose

This matrix maps applicable HIPAA Security Rule requirements to technical implementations, deployment controls, administrative policies, and evidence. **HIPAA compliance requires organizational policies, workforce training, risk analysis, and independent assessment beyond source code.**

## Legend

- ✅ Implemented and tested
- 🔶 Partial (code exists, incomplete)
- ❌ Not implemented
- ⚠️ Requires administrative/operational control (not code-only)

## §164.312(a)(1) — Access Control

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| AC-001 | Unique user identification | `User` model with UUID, unique email | 🔶 | `schema.prisma` | No directory integration |
| AC-002 | Emergency access procedures | Not implemented | ❌ | — | No break-glass workflow |
| AC-003 | Automatic logoff | JWT expiry (15 min access, 7 day refresh) | 🔶 | `auth.service.ts` | No client-side enforcement |
| AC-004 | Encryption and decryption | TLS in transit only | 🔶 | — | No encryption at rest |
| AC-005 | Minimum necessary access | Role-based guards | 🔶 | `roles.guard.ts` | No patient-scoped authorization |
| AC-006 | Patient-scoped access | Not implemented | ❌ | — | No consent enforcement |

## §164.312(a)(2)(ii) — Emergency Access

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| EA-001 | Break-glass access | Not implemented | ❌ | — | Full workflow needed |
| EA-002 | Justification capture | Not implemented | ❌ | — | — |
| EA-003 | Post-access review | Not implemented | ❌ | — | — |
| EA-004 | Notification to affected parties | Not implemented | ❌ | — | — |
| EA-005 | Time-limited elevated access | Not implemented | ❌ | — | — |

## §164.312(b) — Audit Controls

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| AU-001 | Record access to PHI | `AuditLog` model, event-based | 🔶 | `audit.service.ts` | Not append-only, no read tracking |
| AU-002 | Record modifications | Event emitter on writes | 🔶 | `audit.service.ts` | No before/after values |
| AU-003 | Tamper evidence | Not implemented | ❌ | — | No hash chaining |
| AU-004 | Trusted timestamps | Database `createdAt` | 🔶 | `schema.prisma` | No external time source |
| AU-005 | Audit retention | Not configured | ❌ | — | No retention policy |
| AU-006 | Audit export | Not implemented | ❌ | — | No export API |
| AU-007 | Audit monitoring/alerting | Not implemented | ❌ | — | No SIEM integration |
| AU-008 | Prevent audit modification | Not enforced | ❌ | — | App can modify audit records |

## §164.312(c)(1) — Integrity

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| IN-001 | Prevent improper alteration | Database constraints | 🔶 | `schema.prisma` | No application-level validation |
| IN-002 | Detect alteration | Not implemented | ❌ | — | No checksums |
| IN-003 | Corrected/entered-in-error states | Status fields exist | 🔶 | `schema.prisma` | No workflow enforcement |
| IN-004 | Version history | Not implemented | ❌ | — | No audit trail for changes |
| IN-005 | Electronic signature | Not implemented | ❌ | — | No signing workflow |

## §164.312(d) — Person or Entity Authentication

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| PA-001 | Verify identity | Email + password | 🔶 | `auth.service.ts` | No identity proofing |
| PA-002 | MFA for privileged access | Not implemented | ❌ | — | No TOTP/WebAuthn |
| PA-003 | Password complexity | Basic validation | 🔶 | `auth.dto.ts` | No NIST 800-63 compliance |
| PA-004 | Account lockout | Redis-based (5 attempts, 15 min) | ✅ | `auth.service.ts` | Unit test needed |
| PA-005 | Session revocation | Redis key deletion | 🔶 | `auth.service.ts` | No device management |
| PA-006 | Secure password reset | Not implemented | ❌ | — | No reset workflow |
| PA-007 | Credential storage | bcrypt hashing | ✅ | `auth.service.ts` | — |

## §164.312(e)(1) — Transmission Security

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| TS-001 | TLS in transit | HTTPS required | ⚠️ | Deployment | Requires infrastructure config |
| TS-002 | Encryption at rest | Not implemented | ❌ | — | No database encryption |
| TS-003 | Message integrity | Not implemented | ❌ | — | No HMAC for API messages |
| TS-004 | Secure email/messaging | Not implemented | ❌ | — | No Direct messaging |

## §164.308(a)(1) — Security Management Process

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| SM-001 | Risk analysis | `THREAT_MODEL.md` exists | 🔶 | `docs/THREAT_MODEL.md` | Not formally conducted |
| SM-002 | Risk management | Mitigations documented | 🔶 | `docs/SECURITY_ARCHITECTURE.md` | Not tracked to closure |
| SM-003 | Sanction policy | Not implemented | ⚠️ | — | Administrative control |
| SM-004 | Information system activity review | Not implemented | ❌ | — | No review process |

## §164.308(a)(3) — Workforce Security

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| WS-001 | Authorization procedures | Role-based access | 🔶 | `roles.guard.ts` | No approval workflow |
| WS-002 | Termination procedures | Not implemented | ❌ | — | No deprovisioning |
| WS-003 | Access modification on role change | Not implemented | ❌ | — | No lifecycle automation |

## §164.308(a)(4) — Information Access Management

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| IA-001 | Isolating healthcare clearinghouse | N/A (no clearinghouse) | — | — | — |
| IA-002 | Access authorization | Role + permission guards | 🔶 | `roles.guard.ts` | No patient/facility scoping |
| IA-003 | Access establishment/modification | Admin endpoints exist | 🔶 | `identity.controller.ts` | No approval workflow |

## §164.308(a)(5) — Security Awareness and Training

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| SA-001 | Security reminders | Not implemented | ⚠️ | — | Administrative control |
| SA-002 | Protection from malicious software | Dependency scanning in CI | 🔶 | `.github/workflows/ci.yml` | No endpoint protection |
| SA-003 | Log-in monitoring | Not implemented | ❌ | — | No anomaly detection |
| SA-004 | Password management | Basic requirements | 🔶 | `auth.dto.ts` | No NIST compliance |

## §164.308(a)(6) — Security Incident Procedures

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| SI-001 | Incident identification | Not implemented | ❌ | — | No detection capability |
| SI-002 | Incident response | `INCIDENT_RESPONSE_PLAN.md` | 🔶 | `docs/INCIDENT_RESPONSE_PLAN.md` | Not tested |
| SI-003 | Breach notification | Not implemented | ❌ | — | No notification workflow |

## §164.308(a)(7) — Contingency Plan

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| CP-001 | Data backup plan | `backup.service.ts` | 🔶 | `backup.service.ts` | No encryption, no offsite |
| CP-002 | Disaster recovery plan | `BACKUP_AND_DISASTER_RECOVERY.md` | 🔶 | `docs/BACKUP_AND_DISASTER_RECOVERY.md` | Not tested |
| CP-003 | Emergency mode operation | Not implemented | ❌ | — | No downtime procedures |
| CP-004 | Testing and revision | Not performed | ❌ | — | No DR testing |
| CP-005 | Applications and data criticality | Not documented | ❌ | — | No criticality analysis |

## §164.308(a)(8) — Evaluation

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| EV-001 | Periodic technical evaluation | Not performed | ❌ | — | No penetration testing |
| EV-002 | Periodic non-technical evaluation | Not performed | ⚠️ | — | Administrative control |

## §164.310 — Physical Safeguards

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| PS-001 | Facility access controls | Not applicable | ⚠️ | — | Deployment infrastructure |
| PS-002 | Workstation use | Not applicable | ⚠️ | — | Organizational policy |
| PS-003 | Workstation security | Not applicable | ⚠️ | — | Organizational policy |
| PS-004 | Device and media controls | Not applicable | ⚠️ | — | Organizational policy |

## §164.314 — Organizational Requirements

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| OR-001 | Business associate agreements | Not applicable | ⚠️ | — | Legal/contractual |
| OR-002 | Group health plan requirements | Not applicable | ⚠️ | — | Organizational |

## §164.316 — Documentation

| Control ID | Requirement | Implementation | Status | Evidence | Gap |
|------------|-------------|---------------|--------|----------|-----|
| DO-001 | Policies and procedures | Partial documentation | 🔶 | `docs/` | Incomplete |
| DO-002 | Documentation retention | Not defined | ❌ | — | No retention schedule |
| DO-003 | Availability for inspection | Not established | ⚠️ | — | Administrative |

## Summary

| Category | Controls | Implemented | Partial | Not Started | Admin Only |
|----------|----------|-------------|---------|-------------|------------|
| Access Control | 6 | 0 | 4 | 2 | 0 |
| Emergency Access | 5 | 0 | 0 | 5 | 0 |
| Audit Controls | 8 | 0 | 3 | 5 | 0 |
| Integrity | 5 | 0 | 2 | 3 | 0 |
| Authentication | 7 | 2 | 3 | 2 | 0 |
| Transmission Security | 4 | 0 | 0 | 3 | 1 |
| Security Management | 4 | 0 | 2 | 1 | 1 |
| Workforce Security | 3 | 0 | 1 | 2 | 0 |
| Information Access | 3 | 0 | 2 | 0 | 0 |
| Security Awareness | 4 | 0 | 2 | 1 | 1 |
| Security Incident | 3 | 0 | 1 | 2 | 0 |
| Contingency Plan | 5 | 0 | 2 | 3 | 0 |
| Evaluation | 2 | 0 | 0 | 1 | 1 |
| Physical Safeguards | 4 | 0 | 0 | 0 | 4 |
| Organizational | 2 | 0 | 0 | 0 | 2 |
| Documentation | 3 | 0 | 1 | 1 | 1 |
| **Total** | **68** | **2** | **23** | **31** | **11** |

## Critical Gaps Requiring Immediate Attention

1. **No encryption at rest** — PHI stored unencrypted in database
2. **No break-glass emergency access** — Cannot access records in emergency
3. **Audit not tamper-evident** — Can be modified by application
4. **No MFA** — Privileged access not protected
5. **No patient-scoped authorization** — Horizontal privilege escalation possible
6. **No incident detection** — Cannot identify breaches
7. **No backup encryption** — Backup files unprotected
8. **No DR testing** — Recovery procedures unvalidated

## Compliance Statement

**This system is NOT HIPAA compliant.** Source code controls alone do not establish compliance. The following are required but not yet complete:

1. Formal risk analysis and risk management
2. Administrative policies and procedures
3. Workforce training program
4. Business associate agreements
5. Physical safeguards assessment
6. Independent security assessment
7. Breach notification procedures
8. Documentation retention schedule
9. Periodic evaluation process
10. Organizational commitment and oversight
