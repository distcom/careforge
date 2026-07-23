# Known Limitations

> **Last updated**: 2026-07-21

This document lists all known limitations, incomplete features, and areas where the implementation does not meet production requirements.

## Critical Limitations

### 1. No Production Validation
- Zero automated tests (unit, integration, e2e) currently pass
- No CI pipeline has been run successfully
- No security audit or penetration test performed
- No clinical safety review conducted

### 2. Simulated Interoperability
- **HL7**: Generates/parses message strings locally. No MLLP transport, no durable message queues, no ACK/NAK state machine, no interface monitoring.
- **FHIR**: Maps database records to FHIR-like JSON. No profile validation, no SMART on FHIR, no conformance testing against official test suites.
- **C-CDA**: Assembles XML strings. No CDA schema validation, no template conformance checking, no official validator run.
- **X12 EDI**: Assembles 837P segment strings. No clearinghouse transport, no 999/277CA acknowledgement processing, no rejection handling.
- **ePrescribing**: Generates NCPDP-like XML. No certified pharmacy network integration, no actual prescription transmission, no formulary checks.

### 3. Hard-Coded Clinical Data
- Drug interaction database is a small hard-coded list (~20 pairs). Production requires a licensed medication knowledge base (e.g., First Databank, Medi-Span, GSDD).
- Growth chart LMS parameters are placeholder values. Production requires validated WHO/CDC data sets.
- Terminology code sets are empty. Production requires licensed ICD-10, CPT, SNOMED CT, LOINC, RxNorm data.

### 4. Incomplete Security
- MFA: TOTP library included but no enrollment/verification flow
- Contextual authorization: No patient-scoped, facility-scoped, or consent-based access control
- Break-glass: Audit model exists but no enforcement or override workflow
- Audit trail: Not append-only, no tamper evidence, no trusted timestamps
- Encryption at rest: Not implemented for database or backups
- Session management: No device tracking, no concurrent session limits

### 5. Incomplete Clinical Workflows
- No optimistic concurrency control on clinical records
- No version history or amendment tracking
- No note locking or co-signature workflow
- No corrected/entered-in-error states
- No consent enforcement on record access
- No sensitive record segmentation (42 CFR Part 2)
- No clinical decision support beyond basic drug interactions

### 6. Incomplete Billing
- Claim submission changes a status field only — no actual transmission
- No 999/277CA acknowledgement processing
- No 835 remittance parsing
- No denial/appeal workflow
- No eligibility inquiry (270/271)
- No secondary billing
- No patient statement generation
- No accounts receivable aging

### 7. Incomplete Scheduling
- No provider availability management
- No resource scheduling
- No holiday/blackout calendars
- No timezone or daylight-saving handling
- No recall or reminder system
- No waitlist management
- No overbooking policy

### 8. No Migration Tool
- No OpenEMR data migration tool exists
- No mapping tables, exception queues, or reconciliation reports
- No dry-run or resumability support

### 9. No Operational Readiness
- No monitoring/alerting configuration
- No runbooks or operational procedures
- No disaster recovery testing
- No backup encryption or offsite storage
- No WAL archiving for point-in-time recovery
- No load testing or capacity planning

### 10. No Accessibility
- No ARIA labels or roles
- No keyboard navigation testing
- No screen reader compatibility
- No WCAG 2.1 AA compliance verification

## Dependency Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| No package-lock.json committed | Non-reproducible builds | Must commit lockfile |
| No pinned container versions | Supply chain risk | Pin all image digests |
| No SBOM generated | Unknown transitive deps | Add CycloneDX generation |

## Regulatory Gaps

- **HIPAA**: No BAA framework, no minimum necessary enforcement, no breach notification workflow
- **ONC Certification**: No certification criteria mapping, no USCDI data elements validation
- **21st Century Cures Act**: No information blocking compliance, no API conformance evidence
- **State regulations**: No state-specific consent or reporting requirements
