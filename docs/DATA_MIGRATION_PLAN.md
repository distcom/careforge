# Data Migration Plan (OpenEMR → CareForge)

> **Status**: Not started — No migration tool exists
> **Last updated**: 2026-07-21

## Scope

Migrate all clinical and administrative data from an existing OpenEMR (MySQL) installation to CareForge (PostgreSQL).

## Source Schema (OpenEMR)

Key tables: `users`, `patient_data`, `form_encounter`, `forms`, `billing`, `claims`, `insurance_data`, `lists` (allergies/problems), `prescriptions`, `immunizations`, `lab_orders`, `documents`, `notes`, `audit_details`

## Migration Approach

### Phase 1: Schema Mapping
- Map OpenEMR tables to CareForge Prisma models
- Create mapping tables for field transformations
- Document data type conversions (MySQL → PostgreSQL)
- Identify unmapped fields and data loss risks

### Phase 2: Tool Development
- CLI migration tool with:
  - Dry-run mode (validate without writing)
  - Resumable checkpoints
  - Idempotent re-runs
  - Exception queue for failed records
  - Record-count reconciliation
  - Hash verification for data integrity
  - Referential integrity checks
  - Rollback capability

### Phase 3: Data Migration Order
1. Terminology/code sets
2. Users and roles
3. Facilities
4. Patients and identifiers
5. Contacts and proxy relationships
6. Insurance
7. Appointments
8. Encounters and forms
9. Diagnoses and problems
10. Allergies
11. Medications and prescriptions
12. Immunizations
13. Lab orders and results
14. Documents
15. Charges and claims
16. Payments
17. Messages
18. Consents
19. Audit records

### Phase 4: Validation
- Record count comparison (source vs target)
- Checksum verification on critical fields
- Referential integrity validation
- Clinician spot-check reports
- Parallel-run comparison (read both systems)

## Not Implemented

- No migration code exists
- No mapping tables defined
- No exception handling
- No reconciliation reports
- No rollback mechanism
- No parallel-run tooling
