# Clinical Hazard Log

> **Last updated**: 2026-07-21
> **Status**: Initial — hazards identified, clinical review pending
> **Standard**: Based on IEC 62304, ISO 14971 risk management principles

## Purpose

This hazard log identifies potential clinical safety hazards in the CareForge system, assesses their risk, and tracks mitigations. **No clinical workflow is approved for production use until qualified clinical reviewers have assessed and accepted the residual risk.**

## Risk Assessment Methodology

### Severity Levels

| Level | Description | Example |
|-------|-------------|---------|
| S1 | Negligible | Minor inconvenience, no patient impact |
| S2 | Minor | Temporary discomfort, no intervention needed |
| S3 | Moderate | Requires intervention, reversible harm |
| S4 | Major | Serious harm, permanent impairment |
| S5 | Critical | Death or life-threatening |

### Probability Levels

| Level | Description | Frequency |
|-------|-------------|-----------|
| P1 | Rare | < 1 in 100,000 uses |
| P2 | Unlikely | 1 in 10,000 – 1 in 100,000 |
| P3 | Possible | 1 in 1,000 – 1 in 10,000 |
| P4 | Likely | 1 in 100 – 1 in 1,000 |
| P5 | Frequent | > 1 in 100 |

### Risk Matrix

| | S1 | S2 | S3 | S4 | S5 |
|---|---|---|---|---|---|
| **P5** | M | H | H | C | C |
| **P4** | L | M | H | H | C |
| **P3** | L | M | M | H | C |
| **P2** | L | L | M | M | H |
| **P1** | L | L | L | M | M |

- **C (Critical)**: Unacceptable, must eliminate or reduce
- **H (High)**: Requires mitigation and clinical review
- **M (Medium)**: Requires mitigation or documented acceptance
- **L (Low)**: Acceptable with monitoring

## Hazard Register

### HZ-001: Drug Interaction False Negative

| Field | Value |
|-------|-------|
| **Hazard** | System fails to detect a clinically significant drug interaction |
| **Hazardous situation** | Provider prescribes contraindicated combination |
| **Harm** | Adverse drug event, patient injury or death |
| **Severity** | S5 (Critical) |
| **Probability** | P4 (Likely — hard-coded list incomplete) |
| **Initial Risk** | **C (Critical)** |
| **Cause** | Hard-coded interaction pairs in `drug-interaction.service.ts` |
| **Current mitigation** | Basic alert for 5 hard-coded pairs |
| **Residual risk** | **C (Critical)** — unacceptable |
| **Required action** | Integrate licensed drug knowledge base (e.g., FDB, First Databank, or equivalent) |
| **Status** | ❌ Open — production blocker |
| **Clinical review** | Pending |

### HZ-002: Drug Interaction False Positive

| Field | Value |
|-------|-------|
| **Hazard** | System incorrectly flags safe combination as dangerous |
| **Hazardous situation** | Provider ignores alerts (alert fatigue) or delays treatment |
| **Harm** | Delayed appropriate therapy |
| **Severity** | S3 (Moderate) |
| **Probability** | P3 (Possible) |
| **Initial Risk** | **M (Medium)** |
| **Cause** | Non-specific interaction data |
| **Current mitigation** | None |
| **Residual risk** | **M (Medium)** |
| **Required action** | Licensed knowledge base with severity grading |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

### HZ-003: Allergy Not Displayed at Point of Care

| Field | Value |
|-------|-------|
| **Hazard** | Patient allergy not visible during prescribing or order entry |
| **Hazardous situation** | Provider prescribes allergenic medication |
| **Harm** | Anaphylaxis, death |
| **Severity** | S5 (Critical) |
| **Probability** | P3 (Possible — UI not validated) |
| **Initial Risk** | **H (High)** |
| **Cause** | Allergy display not integrated into prescribing workflow |
| **Current mitigation** | Allergy model exists, basic CRUD |
| **Residual risk** | **H (High)** |
| **Required action** | Mandatory allergy display in prescribing UI, clinical validation |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

### HZ-004: Wrong Patient Selection

| Field | Value |
|-------|-------|
| **Hazard** | Provider accesses or documents on wrong patient record |
| **Hazardous situation** | Treatment based on wrong patient data |
| **Harm** | Incorrect treatment, missed diagnosis |
| **Severity** | S4 (Major) |
| **Probability** | P3 (Possible — no patient verification) |
| **Initial Risk** | **H (High)** |
| **Cause** | No patient identity verification at encounter start |
| **Current mitigation** | Patient search exists |
| **Residual risk** | **H (High)** |
| **Required action** | Patient identity verification workflow, duplicate detection |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

### HZ-005: Duplicate Patient Records

| Field | Value |
|-------|-------|
| **Hazard** | Same patient has multiple records, data fragmented |
| **Hazardous situation** | Incomplete clinical picture, missed allergies/medications |
| **Harm** | Incorrect treatment, adverse event |
| **Severity** | S4 (Major) |
| **Probability** | P4 (Likely — no duplicate prevention) |
| **Initial Risk** | **H (High)** |
| **Cause** | No duplicate detection at registration |
| **Current mitigation** | Fuzzy match code exists but not enforced |
| **Residual risk** | **H (High)** |
| **Required action** | Mandatory duplicate check at registration, merge workflow |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

### HZ-006: Lost Lab Result

| Field | Value |
|-------|-------|
| **Hazard** | Lab result received but not reviewed or acted upon |
| **Hazardous situation** | Critical value not communicated to provider |
| **Harm** | Delayed treatment, patient deterioration |
| **Severity** | S4 (Major) |
| **Probability** | P3 (Possible — no tracking) |
| **Initial Risk** | **H (High)** |
| **Cause** | No result acknowledgement tracking, no escalation |
| **Current mitigation** | Event emitted on critical value, no delivery |
| **Residual risk** | **H (High)** |
| **Required action** | Result acknowledgement workflow, escalation rules, tracking |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

### HZ-007: Incorrect Lab Value Units

| Field | Value |
|-------|-------|
| **Hazard** | Lab value displayed or stored with wrong units |
| **Hazardous situation** | Provider misinterprets result magnitude |
| **Harm** | Incorrect dosing, treatment error |
| **Severity** | S4 (Major) |
| **Probability** | P2 (Unlikely — but no validation) |
| **Initial Risk** | **M (Medium)** |
| **Cause** | No unit validation against LOINC-defined units |
| **Current mitigation** | Unit field exists, no validation |
| **Residual risk** | **M (Medium)** |
| **Required action** | LOINC unit validation, reference range checking |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

### HZ-008: Unsigned Note Treated as Final

| Field | Value |
|-------|-------|
| **Hazard** | Draft or preliminary note used for clinical decisions |
| **Hazardous situation** | Treatment based on unverified documentation |
| **Harm** | Incorrect treatment |
| **Severity** | S3 (Moderate) |
| **Probability** | P3 (Possible — no visual distinction) |
| **Initial Risk** | **M (Medium)** |
| **Cause** | No clear draft/final status display |
| **Current mitigation** | Status field exists |
| **Residual risk** | **M (Medium)** |
| **Required action** | Clear visual status, signing workflow, access restrictions |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

### HZ-009: Note Overwrite Without History

| Field | Value |
|-------|-------|
| **Hazard** | Clinical note modified, original content lost |
| **Hazardous situation** | Cannot determine original clinical reasoning |
| **Harm** | Legal/clinical ambiguity, potential harm |
| **Severity** | S3 (Moderate) |
| **Probability** | P4 (Likely — no version history) |
| **Initial Risk** | **M (Medium)** |
| **Cause** | No version history implementation |
| **Current mitigation** | None |
| **Residual risk** | **M (Medium)** |
| **Required action** | Version history, amendment workflow, audit trail |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

### HZ-010: Concurrent Record Modification

| Field | Value |
|-------|-------|
| **Hazard** | Two providers edit same record simultaneously, one change lost |
| **Hazardous situation** | Lost clinical information |
| **Harm** | Incomplete record, potential treatment error |
| **Severity** | S3 (Moderate) |
| **Probability** | P2 (Unlikely in small practice) |
| **Initial Risk** | **M (Medium)** |
| **Cause** | No optimistic concurrency control |
| **Current mitigation** | None |
| **Residual risk** | **M (Medium)** |
| **Required action** | Optimistic locking, conflict resolution UI |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

### HZ-011: Medication Reconciliation Gap

| Field | Value |
|-------|-------|
| **Hazard** | Medication list incomplete at care transition |
| **Hazardous situation** | Duplicate therapy, interaction, or omission |
| **Harm** | Adverse drug event |
| **Severity** | S4 (Major) |
| **Probability** | P3 (Possible — no reconciliation workflow) |
| **Initial Risk** | **H (High)** |
| **Cause** | No structured reconciliation at admission/discharge/transfer |
| **Current mitigation** | Basic medication list |
| **Residual risk** | **H (High)** |
| **Required action** | Structured reconciliation workflow, source verification |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

### HZ-012: Prescription Transmission Failure

| Field | Value |
|-------|-------|
| **Hazard** | Prescription not received by pharmacy |
| **Hazardous situation** | Patient cannot obtain medication |
| **Harm** | Delayed treatment, withdrawal |
| **Severity** | S3 (Moderate) |
| **Probability** | P5 (Frequent — simulated only) |
| **Initial Risk** | **H (High)** |
| **Cause** | No real transmission, XML generation only |
| **Current mitigation** | None |
| **Residual risk** | **H (High)** |
| **Required action** | Certified ePrescribing network integration |
| **Status** | ❌ Open — production blocker |
| **Clinical review** | Pending |

### HZ-013: Wrong Dose Calculation

| Field | Value |
|-------|-------|
| **Hazard** | Incorrect dose calculated or displayed |
| **Hazardous situation** | Overdose or underdose |
| **Harm** | Toxicity or therapeutic failure |
| **Severity** | S5 (Critical) |
| **Probability** | P2 (Unlikely — no calculation) |
| **Initial Risk** | **H (High)** |
| **Cause** | No dose calculation, no weight-based validation |
| **Current mitigation** | None |
| **Residual risk** | **H (High)** |
| **Required action** | Dose range validation, pediatric weight-based checks |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

### HZ-014: Telehealth Misidentification

| Field | Value |
|-------|-------|
| **Hazard** | Wrong participant joins telehealth session |
| **Hazardous situation** | PHI disclosed to unauthorized person |
| **Harm** | Privacy breach, incorrect treatment |
| **Severity** | S3 (Moderate) |
| **Probability** | P2 (Unlikely — server-derived roles) |
| **Initial Risk** | **M (Medium)** |
| **Cause** | No identity verification at session join |
| **Current mitigation** | Server-derived roles (recently fixed) |
| **Residual risk** | **M (Medium)** |
| **Required action** | Identity verification, waiting room, admission control |
| **Status** | 🔶 Partial |
| **Clinical review** | Pending |

### HZ-015: System Downtime During Active Care

| Field | Value |
|-------|-------|
| **Hazard** | System unavailable during patient care |
| **Hazardous situation** | No access to records, orders, or results |
| **Harm** | Delayed treatment, clinical error |
| **Severity** | S4 (Major) |
| **Probability** | P3 (Possible — no HA) |
| **Initial Risk** | **H (High)** |
| **Cause** | Single instance, no failover |
| **Current mitigation** | None |
| **Residual risk** | **H (High)** |
| **Required action** | High availability, downtime procedures, local cache |
| **Status** | ❌ Open |
| **Clinical review** | Pending |

## Risk Summary

| Risk Level | Count | Hazards |
|------------|-------|---------|
| Critical (C) | 1 | HZ-001 |
| High (H) | 7 | HZ-003, HZ-004, HZ-005, HZ-006, HZ-011, HZ-012, HZ-013, HZ-015 |
| Medium (M) | 6 | HZ-002, HZ-007, HZ-008, HZ-009, HZ-010, HZ-014 |
| Low (L) | 0 | — |

## Production Blockers

The following hazards must be resolved before any production use:

1. **HZ-001**: Drug interaction false negative — requires licensed knowledge base
2. **HZ-012**: Prescription transmission failure — requires certified network

## High-Priority Mitigations Required

1. **HZ-003**: Allergy display at point of care
2. **HZ-004**: Patient identity verification
3. **HZ-005**: Duplicate patient prevention
4. **HZ-006**: Lab result acknowledgement and escalation
5. **HZ-011**: Medication reconciliation workflow
6. **HZ-013**: Dose validation
7. **HZ-015**: High availability and downtime procedures

## Clinical Review Status

**No hazard has been reviewed by qualified clinical personnel.** This log requires:

1. Clinical domain expert review of each hazard
2. Validation of severity and probability estimates
3. Acceptance or rejection of residual risk levels
4. Sign-off on mitigation adequacy
5. Periodic review schedule establishment

## Maintenance

This hazard log must be:

- Updated when new hazards are identified
- Updated when mitigations are implemented
- Reviewed after any clinical incident
- Reviewed at each major release
- Reviewed annually at minimum
- Available for regulatory inspection
