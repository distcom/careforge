# CareForge EHR - Interoperability Conformance Statement

## Overview
This document describes CareForge EHR's conformance to healthcare interoperability standards.

## FHIR R4 Conformance

### Supported Resources
| Resource | Read | Search | Create | Update | Delete | History |
|----------|------|--------|--------|--------|--------|---------|
| Patient | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Encounter | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Condition | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Observation | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| MedicationRequest | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| AllergyIntolerance | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Immunization | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Procedure | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| CarePlan | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Coverage | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Consent | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| DocumentReference | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| ServiceRequest | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| DiagnosticReport | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Provenance | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### US Core Profiles
- US Core Patient
- US Core Encounter
- US Core Condition
- US Core Observation
- US Core MedicationRequest
- US Core AllergyIntolerance
- US Core Immunization
- US Core Procedure
- US Core CarePlan
- US Core Coverage
- US Core DocumentReference

### SMART on FHIR
- **Authorization Endpoint**: `/fhir/smart/authorize`
- **Token Endpoint**: `/fhir/smart/token`
- **Introspection Endpoint**: `/fhir/smart/introspect`
- **Revocation Endpoint**: `/fhir/smart/revoke`
- **Scopes Supported**: patient/*.read, user/*.read, offline_access

### Operations
- **Patient/$everything**: Complete patient data export
- **CapabilityStatement**: `/fhir/metadata`

## HL7 v2 Conformance

### Supported Message Types
| Message Type | Direction | Description |
|--------------|-----------|-------------|
| ADT^A01 | Inbound/Outbound | Admit/Visit Notification |
| ADT^A03 | Inbound/Outbound | Discharge/End Visit |
| ADT^A08 | Inbound/Outbound | Update Patient Information |
| ORM^O01 | Inbound/Outbound | Order Message |
| ORU^R01 | Inbound/Outbound | Observation Result |
| MFN^M02 | Inbound | Master File Notification |
| ACK | Outbound | Acknowledgment |

### Segment Support
- MSH (Message Header)
- EVN (Event Type)
- PID (Patient Identification)
- PV1 (Patient Visit)
- ORC (Common Order)
- OBR (Observation Request)
- OBX (Observation Result)
- MFI (Master File Identification)
- MFE (Master File Entry)
- CDM (Charge Description Master)

### Encoding
- **Version**: 2.5.1
- **Character Set**: ASCII
- **Field Separator**: |
- **Component Separator**: ^
- **Subcomponent Separator**: &
- **Repetition Separator**: ~
- **Escape Character**: \

## C-CDA Conformance

### Document Types
| Document Type | Template ID | Status |
|---------------|-------------|--------|
| Continuity of Care Document | 2.16.840.1.113883.10.20.22.1.2 | ✅ |
| Discharge Summary | 2.16.840.1.113883.10.20.22.1.8 | ✅ |
| Referral Note | 2.16.840.1.113883.10.20.22.1.14 | ✅ |

### Section Support
| Section | Template ID | Status |
|---------|-------------|--------|
| Allergies | 2.16.840.1.113883.10.20.22.2.6.1 | ✅ |
| Medications | 2.16.840.1.113883.10.20.22.2.1.1 | ✅ |
| Problem List | 2.16.840.1.113883.10.20.22.2.5.1 | ✅ |
| Vital Signs | 2.16.840.1.113883.10.20.22.2.4.1 | ✅ |
| Procedures | 2.16.840.1.113883.10.20.22.2.7.1 | ✅ |
| Results | 2.16.840.1.113883.10.20.22.2.3.1 | ✅ |
| Immunizations | 2.16.840.1.113883.10.20.22.2.2.1 | ✅ |
| Plan of Care | 2.16.840.1.113883.10.20.22.2.10 | ✅ |
| Encounters | 2.16.840.1.113883.10.20.22.2.22.1 | ✅ |

## X12 EDI Conformance

### Supported Transactions
| Transaction | Description | Direction |
|-------------|-------------|-----------|
| 837 | Professional Claim | Outbound |
| 835 | Remittance Advice | Inbound |
| 270 | Eligibility Inquiry | Outbound |
| 271 | Eligibility Response | Inbound |
| 999 | Acknowledgment | Inbound |
| 277 | Claim Status | Inbound |

### Implementation Guides
- **837P**: 005010X222A1
- **835**: 005010X221A1
- **270/271**: 005010X279A1

## NCPDP SCRIPT Conformance

### Supported Transactions
| Transaction | Description | Status |
|-------------|-------------|--------|
| NewRx | New Prescription | ✅ |
| RefillRequest | Refill Request | ✅ |
| RefillResponse | Refill Response | ✅ |
| CancelRx | Cancel Prescription | ✅ |
| RxFill | Fill Notification | ✅ |

### Version
- **NCPDP SCRIPT**: 2017071

## Terminology Support

### Code Systems
| Code System | OID | Usage |
|-------------|-----|-------|
| ICD-10-CM | 2.16.840.1.113883.6.90 | Diagnoses |
| CPT | 2.16.840.1.113883.6.12 | Procedures |
| SNOMED CT | 2.16.840.1.113883.6.96 | Clinical terms |
| LOINC | 2.16.840.1.113883.6.1 | Lab/Observations |
| RxNorm | 2.16.840.1.113883.6.88 | Medications |
| CVX | 2.16.840.1.113883.6.59 | Immunizations |
| NDC | 2.16.840.1.113883.6.69 | Drug products |

## Direct Messaging
- **Status**: Planned
- **Protocol**: Direct Project specifications
- **Transport**: SMTP with S/MIME

## IHE Profiles
- **Status**: Planned
- **Profiles**: XDS.b, XCA, PIX/PDQ

## Last Updated
2026-07-21
