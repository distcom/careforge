# Feature Parity Matrix (OpenEMR vs CareForge)

> **Last updated**: 2026-07-21
> **Status**: Initial assessment — requires detailed workflow-level breakdown

## Legend
- ✅ Implemented and validated
- 🔶 Partial (some code exists, incomplete workflow)
- 🔵 Simulated (generates output, no real operation)
- ❌ Not started

## Patient Management

| Capability | OpenEMR | CareForge | Gap |
|-----------|---------|-----------|-----|
| Patient registration | ✅ | 🔶 | No insurance capture at registration, no guarantor |
| Demographics editing | ✅ | 🔶 | CRUD exists, no UI edit forms |
| Patient search | ✅ | 🔶 | Basic pagination, no advanced filters |
| Patient merge | ✅ | 🔶 | Fuzzy match coded, no UI, no tests |
| Patient portal | ✅ | 🔶 | Basic endpoints, no full portal UI |
| Consent management | ✅ | 🔶 | Model exists, no enforcement |
| Sensitive record segmentation | ✅ | ❌ | 42 CFR Part 2 not implemented |
| Patient photo/attachments | ✅ | 🔶 | S3 upload exists, no photo workflow |

## Scheduling

| Capability | OpenEMR | CareForge | Gap |
|-----------|---------|-----------|-----|
| Appointment booking | ✅ | 🔶 | Basic CRUD, no availability check |
| Provider schedules | ✅ | ❌ | No schedule template model |
| Multi-facility calendar | ✅ | 🔶 | Facility field exists, no calendar UI |
| Recurring appointments | ✅ | 🔶 | Field exists, no expansion logic |
| Waitlist | ✅ | ❌ | Not implemented |
| Recall/reminders | ✅ | ❌ | Not implemented |
| Check-in/checkout | ✅ | ❌ | Not implemented |
| Conflict detection | ✅ | 🔶 | Provider-only, no resource conflicts |
| Overbooking policy | ✅ | ❌ | Not implemented |

## Clinical Documentation

| Capability | OpenEMR | CareForge | Gap |
|-----------|---------|-----------|-----|
| Encounter/visit notes | ✅ | 🔶 | SOAP fields exist, no templates |
| Clinical forms (LBF) | ✅ | ❌ | No form builder |
| Note signing | ✅ | 🔶 | Status change only, no co-signature |
| Note amendments | ✅ | ❌ | No amendment workflow |
| Note locking | ✅ | ❌ | Not implemented |
| Version history | ✅ | ❌ | Not implemented |
| Templates/macros | ✅ | ❌ | Not implemented |

## Medications & Prescribing

| Capability | OpenEMR | CareForge | Gap |
|-----------|---------|-----------|-----|
| Medication list | ✅ | 🔶 | CRUD exists |
| Drug interaction check | ✅ (via FDB) | 🔵 | Hard-coded pairs, no licensed source |
| ePrescribing | ✅ (via partner) | 🔵 | XML generation only, no transmission |
| Medication reconciliation | ✅ | 🔶 | List comparison, no clinical validation |
| Controlled substances | ✅ | ❌ | No EPCS |
| Formulary check | ✅ | ❌ | Not implemented |

## Laboratory

| Capability | OpenEMR | CareForge | Gap |
|-----------|---------|-----------|-----|
| Lab order creation | ✅ | 🔶 | Basic CRUD |
| HL7 order transmission | ✅ | 🔵 | String generation, no MLLP |
| HL7 result ingestion | ✅ | 🔵 | String parsing, no transport |
| Result review workflow | ✅ | 🔶 | Status change, no verification |
| Critical value alerting | ✅ | 🔶 | Event emitted, no notification delivery |
| Lab document attachment | ✅ | 🔶 | Document module exists |

## Billing

| Capability | OpenEMR | CareForge | Gap |
|-----------|---------|-----------|-----|
| Charge capture | ✅ | 🔶 | Basic create |
| Claim creation | ✅ | 🔶 | Groups charges |
| X12 837P submission | ✅ | 🔵 | String generation, no transport |
| 999/277CA processing | ✅ | ❌ | Not implemented |
| 835 remittance posting | ✅ | ❌ | Not implemented |
| Payment posting | ✅ | 🔶 | Basic create |
| Denial management | ✅ | ❌ | Not implemented |
| Patient statements | ✅ | ❌ | Not implemented |
| Eligibility (270/271) | ✅ | ❌ | Not implemented |
| Fee schedules | ✅ | 🔶 | Model + read endpoint |

## Interoperability

| Capability | OpenEMR | CareForge | Gap |
|-----------|---------|-----------|-----|
| HL7 v2.x interface | ✅ | 🔵 | No transport layer |
| FHIR API | ✅ (partial) | 🔶 | Basic mapping, no conformance |
| C-CDA export | ✅ | 🔵 | XML string, no validation |
| C-CDA import | ✅ | ❌ | Not implemented |
| Direct messaging | ✅ | ❌ | Not implemented |
| IHE profiles | ✅ (partial) | ❌ | Not implemented |

## Administration

| Capability | OpenEMR | CareForge | Gap |
|-----------|---------|-----------|-----|
| User management | ✅ | 🔶 | CRUD exists |
| Role/permission management | ✅ | 🔶 | CRUD exists |
| Facility management | ✅ | 🔶 | CRUD exists |
| Audit trail | ✅ | 🔶 | Event-based, not append-only |
| Backup/restore | ✅ | 🔶 | Secured, no encryption/offsite |
| System configuration | ✅ | 🔶 | Key-value store |
| Language/i18n | ✅ | 🔶 | Service exists, no translations |

## Summary

| Category | OpenEMR Features | CareForge Status |
|----------|-----------------|-----------------|
| Fully validated | — | 0 |
| Partial implementation | — | ~45 |
| Simulated only | — | 6 |
| Not started | — | ~30 |

**Overall parity**: ~15-20% of OpenEMR capability exists as partial code. No feature is validated end-to-end.
