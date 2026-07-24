# CareForge EHR - ONC Certification Readiness

## Overview
This document assesses CareForge EHR's readiness for ONC Health IT Certification under the 2015 Edition Cures Update.

## Certification Criteria Status

### §170.315(a) Clinical Information Reconciliation and Incorporation

| Criterion | Description | Status | Evidence |
|-----------|-------------|--------|----------|
| (a)(1) | C-CDA creation | ✅ | c-cda module |
| (a)(2) | C-CDA parsing | ✅ | c-cda module |
| (a)(3) | Clinical information reconciliation | ✅ | patient module |
| (a)(4) | Drug-drug interaction check | ✅ | clinical-decision-support |
| (a)(5) | Drug-allergy check | ✅ | clinical-decision-support |

### §170.315(b) Clinical Information Reconciliation

| Criterion | Description | Status | Evidence |
|-----------|-------------|--------|----------|
| (b)(1) | Transition of care/referral summary | ✅ | c-cda, referral modules |
| (b)(2) | Clinical information reconciliation | ✅ | patient module |
| (b)(3) | Electronic prescribing | ✅ | medication module |
| (b)(4) | Clinical information reconciliation | ✅ | medication reconciliation |
| (b)(5) | Common clinical data set | ✅ | fhir module |
| (b)(6) | Data export | ✅ | fhir $everything |
| (b)(7) | Data segmentation | ✅ | consent module |
| (b)(8) | Data access | ✅ | portal module |
| (b)(9) | Care plan | ✅ | care-plan module |

### §170.315(c) Clinical Decision Support

| Criterion | Description | Status | Evidence |
|-----------|-------------|--------|----------|
| (c)(1) | Clinical decision support | ✅ | clinical-decision-support |
| (c)(2) | Clinical decision support | ✅ | alerts, reminders |
| (c)(3) | Clinical decision support | ✅ | drug interaction |
| (c)(4) | Clinical decision support | ✅ | allergy checking |

### §170.315(d) Computerized Provider Order Entry

| Criterion | Description | Status | Evidence |
|-----------|-------------|--------|----------|
| (d)(1) | Computerized provider order entry | ✅ | laboratory, medication |
| (d)(2) | Clinical decision support | ✅ | CDS integration |
| (d)(3) | Order management | ✅ | laboratory module |
| (d)(4) | Drug formulary check | ✅ | medication module |
| (d)(5) | Drug-drug interaction | ✅ | clinical-decision-support |
| (d)(6) | Drug-allergy check | ✅ | clinical-decision-support |
| (d)(7) | Drug dose check | ✅ | medication module |
| (d)(8) | Drug duplicate check | ✅ | medication module |

### §170.315(e) Patient Engagement

| Criterion | Description | Status | Evidence |
|-----------|-------------|--------|----------|
| (e)(1) | View, download, transmit | ✅ | portal module |
| (e)(2) | Patient health information | ✅ | portal module |
| (e)(3) | Patient-specific education | ✅ | portal module |

### §170.315(f) Public Health Reporting

| Criterion | Description | Status | Evidence |
|-----------|-------------|--------|----------|
| (f)(1) | Immunization registry | ✅ | quality-reporting |
| (f)(2) | Syndromic surveillance | ✅ | quality-reporting |
| (f)(3) | Electronic case reporting | ✅ | quality-reporting |
| (f)(4) | Cancer registry | ✅ | quality-reporting |
| (f)(5) | Newborn screening | ⏳ | Planned |

### §170.315(g) Design and Performance

| Criterion | Description | Status | Evidence |
|-----------|-------------|--------|----------|
| (g)(1) | Automated numerator recording | ✅ | quality-reporting |
| (g)(2) | Automated measure calculation | ✅ | quality-reporting |
| (g)(3) | Safety-enhanced design | ✅ | clinical-safety-plan |
| (g)(4) | Quality management system | ✅ | testing-strategy |
| (g)(5) | Accessibility | ✅ | accessibility-statement |
| (g)(6) | Installation | ✅ | deployment-guide |
| (g)(7) | Privacy and security | ✅ | security-architecture |
| (g)(8) | Integrity | ✅ | audit module |
| (g)(9) | Trusted connection | ✅ | TLS 1.3 |
| (g)(10) | Auditing | ✅ | audit module |

### §170.315(h) Direct Project

| Criterion | Description | Status | Evidence |
|-----------|-------------|--------|----------|
| (h)(1) | Direct project | ⏳ | Planned |
| (h)(2) | Direct project edge | ⏳ | Planned |

## API Certification Criteria

### §170.315(g)(10) Standardized API

| Criterion | Description | Status | Evidence |
|-----------|-------------|--------|----------|
| API Access | FHIR R4 API | ✅ | fhir module |
| SMART on FHIR | OAuth 2.0 | ✅ | fhir module |
| US Core | US Core profiles | ✅ | fhir module |
| Patient Access | Patient API | ✅ | portal, fhir |

## Quality Measures

### Supported eCQMs
| Measure | Title | Status |
|---------|-------|--------|
| CMS122 | Diabetes: HbA1c Control | ✅ |
| CMS165 | Controlling High Blood Pressure | ✅ |
| CMS125 | Breast Cancer Screening | ✅ |
| CMS68 | Documentation of Current Medications | ✅ |
| CMS128 | Anti-depressant Medication Management | ✅ |

## Testing Requirements

### Test Procedures
- **API Testing**: FHIR R4 conformance testing
- **C-CDA Testing**: C-CDA validation testing
- **Security Testing**: Penetration testing
- **Usability Testing**: User-centered design testing

### Test Tools
- **FHIR Validator**: HL7 FHIR validation
- **C-CDA Validator**: C-CDA validation
- **Security Scanner**: OWASP ZAP, Burp Suite

## Certification Timeline

| Phase | Target Date | Status |
|-------|-------------|--------|
| Gap Analysis | Complete | ✅ |
| Implementation | Complete | ✅ |
| Internal Testing | Q3 2026 | 🔄 |
| ONC-ATCB Testing | Q4 2026 | ⏳ |
| Certification | Q1 2027 | ⏳ |

## Last Updated
2026-07-21
