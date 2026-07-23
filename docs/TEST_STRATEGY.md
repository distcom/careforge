# Test Strategy

> **Status**: Strategy defined — NO tests currently pass
> **Last updated**: 2026-07-21

## Current State

- **Unit tests**: 4 spec files exist (patient, drug-interaction, eprescribing, growth-chart, hl7, report-export) — none verified passing
- **Integration tests**: 0
- **E2E tests**: 1 scaffold file (`app.e2e-spec.ts`) — not verified
- **Authorization tests**: 0
- **Accessibility tests**: 0
- **Coverage**: Unknown (never measured)

## Required Test Pyramid

```
         /  E2E (Browser)  \        ~5%  — Critical user journeys
        / API E2E (Supertest) \     ~15% — Full request/response cycles
       / Integration (DB+Redis) \   ~30% — Service + infrastructure
      / Unit (Pure logic, mocked) \ ~50% — Business rules, validators
```

## Test Categories

### 1. Unit Tests (Priority: Immediate)
- Drug interaction checking logic
- Growth chart percentile calculations
- HL7 message parsing/generation
- FHIR resource mapping
- X12 segment generation
- C-CDA XML assembly
- Billing calculations (charge totals, balance)
- Scheduling conflict detection
- Input validation rules
- Token generation/rotation logic

### 2. Integration Tests (Priority: High)
- Prisma queries match schema (all models)
- Service methods with real database
- Redis operations (lockout, token storage)
- Event emission and handler execution
- Queue job processing

### 3. API E2E Tests (Priority: High)
Every endpoint must be tested with:
- Unauthenticated request → 401
- Wrong role → 403
- Correct role, valid data → 200/201
- Malformed input → 400
- Non-existent resource → 404
- Duplicate submission → 409

### 4. Authorization Matrix Tests (Priority: Critical)
| Role | Patient data (own) | Patient data (other) | Admin endpoints | Billing | Clinical |
|------|-------------------|---------------------|-----------------|---------|----------|
| patient | ✓ | ✗ | ✗ | ✗ | read-own |
| provider | ✓ | ✓ (assigned) | ✗ | ✗ | ✓ |
| staff | ✓ | ✓ | ✗ | partial | partial |
| biller | partial | partial | ✗ | ✓ | ✗ |
| admin | ✓ | ✓ | ✓ | ✓ | ✓ |

Each cell requires a positive AND negative test.

### 5. Clinical Safety Tests (Priority: Critical)
- Drug interaction: severe interaction blocks prescription
- Drug-allergy: known allergy blocks prescription
- Duplicate therapy: warning on same drug class
- Lab critical value: triggers notification
- Vital sign out-of-range: flagged
- Medication dose validation
- Allergy severity escalation

### 6. Concurrency & Idempotency Tests
- Concurrent encounter updates (optimistic locking)
- Duplicate HL7 message handling
- Concurrent appointment booking (same slot)
- Payment double-posting prevention
- Claim duplicate submission

### 7. Interoperability Conformance Tests
- HL7: Valid/invalid message handling, delimiter edge cases, null flavors
- FHIR: Resource validation against profiles, search parameter correctness
- C-CDA: Schema validation, template conformance
- X12: Segment validation, character escaping

### 8. Frontend Tests (Priority: Medium)
- Component rendering
- Form validation
- API error handling
- Keyboard navigation
- Screen reader compatibility
- Responsive layouts

## Tools

| Purpose | Tool |
|---------|------|
| Unit/Integration | Jest + ts-jest |
| API E2E | Supertest + @nestjs/testing |
| Browser E2E | Playwright |
| Accessibility | @axe-core/playwright |
| Mutation testing | Stryker |
| Coverage | Istanbul (via Jest) |
| Fuzz testing | fast-check (property-based) |

## Coverage Targets

| Code Area | Branch Coverage |
|-----------|----------------|
| Authorization logic | ≥ 95% |
| Clinical safety rules | ≥ 95% |
| Billing calculations | ≥ 90% |
| Service layer | ≥ 80% |
| Controllers | ≥ 70% |
| Overall | ≥ 75% |

## Definition of Test-Done

A feature's tests are complete when:
1. Happy path verified
2. All error paths verified (400, 401, 403, 404, 409, 500)
3. Authorization matrix verified (positive + negative)
4. Boundary conditions tested
5. Concurrent access tested where applicable
6. Clinical safety rules verified where applicable
7. Coverage thresholds met
8. No skipped or pending tests
