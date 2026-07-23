# Clinical Safety Case

> **Status**: NOT assessed — No clinical safety review has been performed
> **Last updated**: 2026-07-21

## Statement

This software has NOT been reviewed for clinical safety. It must NOT be used for patient care decisions without a qualified clinical safety assessment per IEC 62304 / ISO 14971.

## Known Clinical Safety Risks

### CS-1: Drug Interaction Data is Hard-Coded
- **Risk**: Missed interactions could lead to adverse drug events
- **Current state**: ~20 hard-coded interaction pairs
- **Required**: Licensed medication knowledge base (First Database, Medi-Span, or equivalent)
- **Severity**: Critical

### CS-2: No Dose Validation
- **Risk**: Overdose or subtherapeutic dosing not detected
- **Current state**: No dose range checking
- **Required**: Max daily dose, renal adjustment, pediatric dosing validation
- **Severity**: Critical

### CS-3: Growth Chart Data is Placeholder
- **Risk**: Incorrect percentile calculations could miss failure to thrive or obesity
- **Current state**: Placeholder LMS values
- **Required**: Validated WHO (0-2y) and CDC (2-20y) data sets
- **Severity**: High

### CS-4: No Clinical Decision Support
- **Risk**: Missed allergies, contraindications, duplicate therapy
- **Current state**: Basic drug-allergy check only
- **Required**: Comprehensive CDS with alert fatigue management
- **Severity**: High

### CS-5: No Result Verification Workflow
- **Risk**: Incorrect lab results could be acted upon without verification
- **Current state**: Results stored directly
- **Required**: Verification, correction, and entered-in-error states
- **Severity**: High

### CS-6: No Medication Reconciliation Validation
- **Risk**: Discrepancies between care transitions undetected
- **Current state**: List comparison only
- **Required**: Clinician-verified reconciliation with discrepancy resolution
- **Severity**: Medium

### CS-7: No Allergy Severity Enforcement
- **Risk**: Severe allergy not blocking prescription
- **Current state**: Allergy recorded but not enforced at prescribing time
- **Required**: Hard-stop for severe/life-threatening allergies
- **Severity**: Critical

## Required Before Clinical Use

1. Engage qualified clinical informaticist for safety review
2. Replace all hard-coded clinical data with licensed sources
3. Implement dose validation
4. Implement hard-stop allergy enforcement
5. Implement result verification workflow
6. Conduct failure mode and effects analysis (FMEA)
7. Document risk mitigations per ISO 14971
8. Conduct usability testing per IEC 62366
9. Obtain clinical governance approval
