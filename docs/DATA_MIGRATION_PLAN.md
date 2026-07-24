# CareForge EHR - Data Migration Plan

## Overview
This document describes the data migration strategy for transitioning from OpenEMR to CareForge EHR.

## Migration Scope

### Data Categories
| Category | Source Table(s) | Target Model | Priority |
|----------|----------------|--------------|----------|
| Patient Demographics | patient_data | Patient | P0 |
| Providers | users | User | P0 |
| Encounters | form_encounter | Encounter | P0 |
| Conditions | lists | Condition | P0 |
| Allergies | lists (allergy) | Allergy | P0 |
| Medications | prescriptions | Prescription | P0 |
| Immunizations | immunizations | Immunization | P1 |
| Lab Orders | procedure_order | LabOrder | P1 |
| Lab Results | procedure_result | LabResult | P1 |
| Documents | documents | Document | P1 |
| Billing | billing, claims | Charge, Claim | P2 |
| Scheduling | openemr_postcalendar | Appointment | P2 |
| Notes | form_notes | ClinicalNote | P2 |

## Migration Phases

### Phase 1: Planning (Week 1-2)
- [ ] Data inventory and mapping
- [ ] Migration tool configuration
- [ ] Test environment setup
- [ ] Rollback plan documentation

### Phase 2: Test Migration (Week 3-4)
- [ ] Dry run with sample data
- [ ] Data validation testing
- [ ] Performance benchmarking
- [ ] Issue identification and resolution

### Phase 3: Production Migration (Week 5-6)
- [ ] Final data extraction
- [ ] Data transformation
- [ ] Data loading
- [ ] Validation and reconciliation

### Phase 4: Post-Migration (Week 7-8)
- [ ] Data quality verification
- [ ] User acceptance testing
- [ ] Issue resolution
- [ ] Legacy system decommissioning

## Data Mapping

### Patient Data Mapping
```
OpenEMR patient_data → CareForge Patient
- pid → medicalRecordNumber
- fname → firstName
- lname → lastName
- mname → middleName
- DOB → dateOfBirth
- sex → gender
- ss → ssn
- street → address
- city → city
- state → state
- postal_code → zipCode
- phone_home → phone
```

### Encounter Data Mapping
```
OpenEMR form_encounter → CareForge Encounter
- encounter → externalId
- date → startTime
- provider_id → providerId
- facility_id → locationId
- reason → chiefComplaint
```

## Migration Tools

### CareForge Migration Module
- **Preflight Analysis**: Data quality assessment
- **Dry Run**: Test migration without committing
- **Mapping Templates**: Configurable field mappings
- **Exception Queue**: Failed record management
- **Reconciliation**: Post-migration validation
- **Rollback**: Point-in-time recovery

### API Endpoints
```
POST /migration/jobs - Create migration job
POST /migration/jobs/:id/preflight - Run preflight analysis
POST /migration/jobs/:id/dry-run - Execute dry run
POST /migration/jobs/:id/execute - Execute migration
GET /migration/jobs/:id/exceptions - View exceptions
POST /migration/jobs/:id/rollback - Rollback migration
```

## Data Validation

### Validation Rules
1. **Required Fields**: All mandatory fields populated
2. **Data Types**: Correct data types after conversion
3. **Referential Integrity**: Foreign key relationships maintained
4. **Code Validation**: ICD-10, CPT, NDC codes valid
5. **Date Validation**: Dates in valid ranges
6. **Duplicate Detection**: No duplicate records created

### Reconciliation Reports
- Record count comparison (source vs target)
- Field-level validation summary
- Exception report with resolution status
- Data quality score

## Risk Mitigation

### Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss | High | Full backup before migration |
| Data corruption | High | Validation at each stage |
| Downtime | Medium | Off-hours migration window |
| Performance | Medium | Batch processing, indexing |
| Rollback failure | High | Tested rollback procedures |

### Rollback Plan
1. **Pre-migration backup**: Full database backup
2. **Rollback point**: Create restore point before migration
3. **Rollback procedure**: Documented step-by-step rollback
4. **Rollback testing**: Tested in staging environment
5. **Rollback window**: 72-hour rollback availability

## Performance Considerations

### Batch Processing
- **Batch size**: 1000 records per batch
- **Parallel processing**: Multiple workers for independent tables
- **Progress tracking**: Real-time migration progress
- **Resume capability**: Resume from last successful batch

### Indexing Strategy
- Disable non-essential indexes during load
- Rebuild indexes after migration
- Analyze tables for query optimization

## Security Considerations

### Data Protection
- **Encryption in transit**: TLS for data transfer
- **Encryption at rest**: Encrypted backup files
- **Access control**: Restricted migration team access
- **Audit logging**: All migration actions logged

### PHI Handling
- **Minimum necessary**: Only required data migrated
- **De-identification**: Test data de-identified
- **Secure disposal**: Secure deletion of temporary files

## Timeline

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Planning Complete | Week 2 | ⏳ |
| Test Migration | Week 4 | ⏳ |
| Production Migration | Week 6 | ⏳ |
| Post-Migration Complete | Week 8 | ⏳ |

## Success Criteria

- [ ] 100% of P0 data migrated successfully
- [ ] 99%+ of P1 data migrated successfully
- [ ] 95%+ of P2 data migrated successfully
- [ ] Zero data loss for critical records
- [ ] All validation rules pass
- [ ] User acceptance testing complete
- [ ] Performance within acceptable limits

## Last Updated
2026-07-21
