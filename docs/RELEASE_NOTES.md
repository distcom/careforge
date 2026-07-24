# CareForge EHR - Release Notes

## Version 1.5.0 (2026-07-21)

### New Features
- **HL7 v2 Messaging Module**
  - ADT A01/A03/A08 message processing
  - ORM O01 order message handling
  - ORU R01 result message processing
  - MFN M02 master file notifications
  - Inbound message parsing and ACK generation
  - Outbound message generation

- **X12/EDI Claims Processing**
  - 837 Professional claim generation
  - 835 Remittance Advice processing
  - 270/271 Eligibility inquiry/response
  - Batch claim submission
  - Claims summary reporting

- **C-CDA Document Generation**
  - Continuity of Care Document (CCD)
  - Discharge Summary
  - Referral Summary
  - All required C-CDA sections
  - XML download support

- **Quality & Public Health Reporting**
  - CMS eCQM calculations (CMS122, CMS165, CMS125, CMS68, CMS128)
  - Immunization registry reporting (IIS)
  - Disease surveillance reporting
  - Cancer registry reporting
  - eCQM export functionality

- **Data Migration Tooling**
  - OpenEMR migration support
  - Preflight analysis
  - Dry run capability
  - Exception queue management
  - Reconciliation reports
  - Rollback support

### Enhancements
- **FHIR R4 Module**
  - SMART on FHIR authorization
  - 14 resource types supported
  - Patient/$everything operation
  - Provenance tracking
  - US Core profile references

- **E-Prescribing Workflow**
  - Complete eRx lifecycle (DRAFT → SIGNED → TRANSMITTED → FILLED → COMPLETED)
  - NCPDP message tracking
  - PDMP integration
  - Formulary checking
  - Renewal chain tracking
  - Controlled substance handling

- **Coding & Charge Capture**
  - Coding workflow (PENDING → CODED → REVIEWED → APPROVED → BILLED)
  - ICD-10 and CPT code assignment
  - Charge review and approval
  - Coding summary reports

- **Consent Management**
  - Consent tracking and enforcement
  - Privacy restriction management
  - Consent revocation
  - Audit logging

- **Clinical Decision Support**
  - Drug interaction checking
  - Allergy cross-reactivity alerts
  - Duplicate order detection
  - Clinical reminders
  - Alert severity levels

### Bug Fixes
- Fixed patient search pagination
- Fixed encounter date validation
- Fixed medication dosage calculation
- Fixed lab result unit conversion
- Fixed billing amount rounding

### Security
- Enhanced audit logging coverage
- Added rate limiting to authentication endpoints
- Improved session management
- Updated dependency security patches

### Documentation
- Added comprehensive API documentation
- Added deployment guide
- Added operations runbook
- Added security architecture documentation
- Added HIPAA control matrix
- Added clinical safety plan
- Added interoperability conformance statement
- Added ONC certification readiness assessment
- Added data migration plan
- Added disaster recovery plan
- Added accessibility statement
- Added testing strategy
- Added privacy impact assessment
- Added incident response plan
- Added business continuity plan
- Added risk assessment
- Added performance baseline
- Added vendor management procedures
- Added training materials

---

## Version 1.4.0 (2026-06-15)

### New Features
- **Patient Portal**
  - Patient self-service access
  - Secure messaging
  - Appointment scheduling
  - Bill payment
  - Health record viewing

- **Telehealth Module**
  - Video visit scheduling
  - Virtual waiting room
  - Visit documentation
  - Recording management

- **Reporting & Analytics**
  - Operational reports
  - Clinical reports
  - Financial reports
  - Custom report builder
  - Dashboard widgets

### Enhancements
- Improved scheduling with resource management
- Enhanced lab workflow with result interpretation
- Added document versioning
- Improved insurance eligibility verification
- Enhanced referral tracking

### Bug Fixes
- Fixed scheduling conflict detection
- Fixed lab result notification
- Fixed document upload size limit
- Fixed insurance claim formatting

---

## Version 1.3.0 (2026-05-01)

### New Features
- **Billing Module**
  - Charge capture
  - Claim generation
  - Payment posting
  - Denial management
  - Patient statements

- **Insurance Module**
  - Payer management
  - Eligibility verification
  - Coverage tracking
  - Authorization management

### Enhancements
- Improved patient registration workflow
- Enhanced clinical note templates
- Added vital signs trending
- Improved medication reconciliation

---

## Version 1.2.0 (2026-04-01)

### New Features
- **Laboratory Module**
  - Lab order management
  - Result processing
  - Critical value alerts
  - Result trending

- **Immunization Module**
  - Immunization tracking
  - CVX code support
  - Lot number tracking
  - Registry reporting

### Enhancements
- Improved encounter documentation
- Enhanced problem list management
- Added allergy cross-reactivity checking
- Improved search functionality

---

## Version 1.1.0 (2026-03-01)

### New Features
- **Clinical Documentation**
  - SOAP note templates
  - Clinical note editor
  - Diagnosis coding
  - Procedure documentation

- **Medication Management**
  - Medication list
  - Prescription writing
  - Drug interaction checking
  - Formulary support

### Enhancements
- Improved patient demographics
- Enhanced scheduling
- Added vital signs capture
- Improved audit logging

---

## Version 1.0.0 (2026-02-01)

### Initial Release
- Patient registration and demographics
- Provider management
- Scheduling and appointments
- Basic encounter documentation
- User authentication and authorization
- Audit logging
- FHIR R4 API (basic)
- Administrative functions

---

## Upgrade Instructions

### From 1.4.x to 1.5.0
```bash
# 1. Backup database
pg_dump careforge_prod > backup_pre_150.sql

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm ci

# 4. Run migrations
npx prisma migrate deploy

# 5. Rebuild
npm run build

# 6. Restart
sudo systemctl restart careforge-api
```

### Database Migrations
- Added HL7 message tracking tables
- Added X12 transaction tracking tables
- Added C-CDA document tracking tables
- Added quality measure tables
- Added migration job tracking tables

### Configuration Changes
- Added HL7 configuration options
- Added X12 EDI configuration options
- Added C-CDA template configuration
- Added quality reporting configuration

---

## Known Issues

| Issue | Impact | Workaround | Status |
|-------|--------|------------|--------|
| Complex table navigation | Screen reader users | Use keyboard shortcuts | 🔄 In Progress |
| Chart accessibility | Visual impairment | Data table alternative | 🔄 In Progress |
| Large report generation | Performance | Schedule off-peak | ⏳ Planned |

---

## Support

- **Documentation**: https://docs.careforge.health
- **Support Portal**: https://support.careforge.health
- **Email**: support@careforge.health
- **Phone**: 1-800-555-0123

## Last Updated
2026-07-21
