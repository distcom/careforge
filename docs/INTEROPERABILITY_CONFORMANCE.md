# Interoperability Conformance

> **Status**: NOT validated — No conformance testing performed
> **Last updated**: 2026-07-21

## HL7 v2.x

| Aspect | Status | Evidence |
|--------|--------|----------|
| Message generation (ORM) | Simulated | String assembly in `hl7.service.ts` |
| Message parsing (ORU) | Simulated | String splitting in `hl7.service.ts` |
| MLLP transport | Not started | No TCP socket implementation |
| ACK/NAK handling | Not started | No state machine |
| Message validation | Not started | No profile validation |
| Delimiter/escaping | Partial | Basic pipe-delimited; no escape handling |
| Durable queue | Not started | No message persistence |
| Deduplication | Not started | No message ID tracking |
| Interface monitoring | Not started | No health metrics |

**Conformance test suites to run**: None identified yet. Requires HL7 v2.x validation tooling.

## FHIR R4

| Aspect | Status | Evidence |
|--------|--------|----------|
| Resource mapping | Partial | `fhir.service.ts` maps DB → JSON |
| CapabilityStatement | Not started | No `/metadata` endpoint |
| Search parameters | Not started | No `_search` support |
| Profile validation | Not started | No StructureDefinition validation |
| SMART on FHIR | Not started | No OAuth2 launch |
| OperationOutcome | Not started | No error resource |
| Resource versioning | Not started | No `_history` |
| Conditional operations | Not started | No `If-None-Exist` |
| Bulk data ($export) | Not started | — |

**Conformance test suites to run**: HL7 FHIR Validator, Touchstone, Inferno

## C-CDA R2.1

| Aspect | Status | Evidence |
|--------|--------|----------|
| CCD generation | Simulated | XML string in `ccda.service.ts` |
| Schema validation | Not started | No XSD validation |
| Template conformance | Not started | No template ID verification |
| Code system validation | Not started | No OID verification |
| Import/parsing | Not started | No C-CDA consumption |
| Provenance | Not started | No author/custodian validation |

**Conformance test suites to run**: HL7 C-CDA Validator, SITE C-CDA Scorecard

## X12 EDI

| Aspect | Status | Evidence |
|--------|--------|----------|
| 837P generation | Simulated | Segment string in billing service |
| 999 acknowledgement | Not started | — |
| 277CA status | Not started | — |
| 835 remittance | Not started | — |
| 270/271 eligibility | Not started | — |
| Clearinghouse transport | Not started | No SFTP/AS2 |
| Character escaping | Not started | — |

**Conformance test suites to run**: X12 acknowledgment validation, clearinghouse sandbox testing

## ePrescribing (NCPDP SCRIPT)

| Aspect | Status | Evidence |
|--------|--------|----------|
| NewRx generation | Simulated | XML string in `eprescribing.service.ts` |
| Pharmacy network transport | Not started | No Surescripts/DrFirst integration |
| Renewal request/response | Not started | — |
| Cancel message | Not started | — |
| Formulary check | Not started | — |
| Controlled substance (EPCS) | Not started | — |
| Identity proofing | Not started | — |

**Certification required**: Surescripts or equivalent certified network partner
