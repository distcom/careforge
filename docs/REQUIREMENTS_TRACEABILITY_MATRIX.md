# Requirements Traceability Matrix

> **Last updated**: 2026-07-21
> **Status**: Initial — requirements not yet formally defined with IDs

## Purpose

This matrix traces each requirement from definition through implementation, testing, and validation. Currently, requirements are implied by the specification document rather than formally numbered.

## Requirement Categories

### REQ-AUTH: Authentication & Authorization

| ID | Requirement | Implementation | Test | Status |
|----|------------|---------------|------|--------|
| AUTH-001 | JWT-based authentication | `auth.service.ts`, `jwt.strategy.ts` | None | Partial |
| AUTH-002 | Public registration creates patient-only accounts | `auth.service.ts` (role removed from DTO) | None | Partial |
| AUTH-003 | Staff accounts via admin provisioning only | `identity.controller.ts` (@Roles('admin')) | None | Partial |
| AUTH-004 | Deny-by-default global guard | `global-jwt-auth.guard.ts` (APP_GUARD) | None | Partial |
| AUTH-005 | Refresh token rotation | `auth.service.ts` (single-use + reuse detection) | None | Partial |
| AUTH-006 | Account lockout | `auth.service.ts` (Redis-based, 5 attempts) | None | Partial |
| AUTH-007 | MFA (TOTP) | Not implemented | None | Not started |
| AUTH-008 | Contextual authorization (patient-scoped) | Not implemented | None | Not started |
| AUTH-009 | Break-glass access | Not implemented | None | Not started |
| AUTH-010 | Session revocation | `auth.service.ts` (Redis key) | None | Partial |

### REQ-SEC: Security

| ID | Requirement | Implementation | Test | Status |
|----|------------|---------------|------|--------|
| SEC-001 | No fallback secrets | `auth.service.ts`, `jwt.strategy.ts` (fail on missing) | None | Partial |
| SEC-002 | Rate limiting | `ThrottlerModule` (100/60s) | None | Partial |
| SEC-003 | Backup access restricted to admin | `backup.controller.ts` (@Roles('admin')) | None | Partial |
| SEC-004 | No shell interpolation in backup | `backup.service.ts` (execFile) | None | Partial |
| SEC-005 | Path traversal protection | `backup.service.ts` (resolveSafePath) | None | Partial |
| SEC-006 | TURN credentials time-limited | `telehealth-session.service.ts` (HMAC) | None | Partial |
| SEC-007 | Telehealth role server-derived | `telehealth.controller.ts` | None | Partial |
| SEC-008 | Audit tamper evidence | Not implemented | None | Not started |
| SEC-009 | Encryption at rest | Not implemented | None | Not started |

### REQ-CLIN: Clinical

| ID | Requirement | Implementation | Test | Status |
|----|------------|---------------|------|--------|
| CLIN-001 | Patient CRUD | `patient.service.ts` | 1 spec file | Partial |
| CLIN-002 | Encounter SOAP notes | `encounter.service.ts` | None | Partial |
| CLIN-003 | Vital signs recording | `vitals.service.ts` | None | Partial |
| CLIN-004 | Drug interaction check | `drug-interaction.service.ts` | 1 spec file | Simulated |
| CLIN-005 | Growth charts | `growth-chart.service.ts` | 1 spec file | Simulated |
| CLIN-006 | Medication reconciliation | `eprescribing.service.ts` | 1 spec file | Partial |
| CLIN-007 | Optimistic concurrency | Not implemented | None | Not started |
| CLIN-008 | Version history | Not implemented | None | Not started |
| CLIN-009 | Consent enforcement | Not implemented | None | Not started |

### REQ-INTEROP: Interoperability

| ID | Requirement | Implementation | Test | Status |
|----|------------|---------------|------|--------|
| INT-001 | HL7 ORM generation | `hl7.service.ts` | 1 spec file | Simulated |
| INT-002 | HL7 ORU parsing | `hl7.service.ts` | 1 spec file | Simulated |
| INT-003 | FHIR R4 mapping | `fhir.service.ts` | None | Partial |
| INT-004 | C-CDA CCD generation | `ccda.service.ts` | None | Simulated |
| INT-005 | X12 837P generation | Billing service | None | Simulated |
| INT-006 | ePrescribing transmission | `eprescribing.service.ts` | 1 spec file | Simulated |
| INT-007 | MLLP transport | Not implemented | None | Not started |
| INT-008 | SMART on FHIR | Not implemented | None | Not started |

### REQ-BILL: Billing

| ID | Requirement | Implementation | Test | Status |
|----|------------|---------------|------|--------|
| BILL-001 | Charge capture | `billing.service.ts` | None | Partial |
| BILL-002 | Claim creation | `billing.service.ts` | None | Partial |
| BILL-003 | Claim submission (real) | Status change only | None | Simulated |
| BILL-004 | Payment posting | `billing.service.ts` | None | Partial |
| BILL-005 | 835 remittance | Not implemented | None | Not started |
| BILL-006 | Denial management | Not implemented | None | Not started |

## Traceability Gaps

- No requirement has a passing automated test
- No requirement has been validated by a domain expert
- No requirement has conformance evidence
- No requirement has security review evidence
- Requirements are not yet formally numbered in a requirements management tool
