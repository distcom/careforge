# Domain Model

> **Last updated**: 2026-07-21
> **Source**: `apps/api/prisma/schema.prisma` (50+ models, 1112 lines)

## Core Entities

```
User ──┬── UserRole ──── Role ──── RolePermission ──── Permission
       ├── UserFacility ──── Facility
       ├── Patient (1:1 optional)
       ├── Encounter (provider)
       ├── Appointment (provider)
       ├── LabOrder (provider)
       ├── Prescription (prescriber)
       ├── Medication (prescriber)
       └── Payment (postedBy)

Patient ──┬── Encounter
           ├── Appointment
           ├── VitalSign
           ├── Condition
           ├── Medication
           ├── Allergy
           ├── Immunization
           ├── LabOrder
           ├── Charge
           ├── Claim
           ├── Payment
           ├── PatientInsurance
           ├── PatientContact
           ├── PatientConsent
           ├── CarePlan
           ├── Referral (referred)
           ├── MessageThread (participant)
           ├── TelehealthSession
           └── Document
```

## Clinical Domain

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Encounter | type, status, chiefComplaint, hpi, ros, physicalExam, assessment, plan, signedAt | patient, provider, facility, diagnoses, procedures, vitalSigns, charges |
| VitalSign | height, weight, bmi, systolic, diastolic, heartRate, temperature, respRate, spo2 | patient, encounter |
| Condition | icd10Code, snomedCode, description, status, onsetDate, resolvedDate | patient, encounter |
| Medication | rxnormCode, name, dosage, frequency, route, status, startDate, endDate | patient, encounter |
| Allergy | substance, reaction, severity, status, verified | patient |
| Immunization | cvxCode, name, administeredAt, lotNumber, administrationSite, status | patient |
| LabOrder | status, orderedAt, collectedAt, resultedAt, reviewedAt | patient, provider, items |
| LabOrderItem | testName, loincCode, value, unit, referenceRange, abnormalFlag | labOrder |

## Billing Domain

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Charge | cptCode, description, fee, units, status, serviceDate | patient, encounter |
| Claim | claimNumber, payerName, payerId, status, totalAmount, paidAmount | patient, items |
| ClaimItem | cptCode, description, fee, units | claim, charge |
| Payment | amount, method, source, status, postedById | patient, postedBy |
| FeeSchedule | name, facilityId, isActive | items |
| FeeScheduleItem | cptCode, description, fee | feeSchedule |

## Administrative Domain

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Appointment | type, status, startTime, endTime, duration, reason, isRecurring | patient, provider, facility, encounter |
| Facility | name, type, address, phone, isActive | — |
| MessageThread | subject, status | participants, messages |
| Message | body, readAt | thread, sender |
| Notification | type, title, body, readAt | user |
| TelehealthSession | roomCode, status, scheduledAt, startedAt, endedAt, participants | patient, provider |

## System Domain

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| AuditLog | action, resource, resourceId, userId, ipAddress, userAgent | user |
| SystemSetting | key, value, category | — |
| Task | title, status, priority, assignedToId, dueDate | — |
| CodeSet | name, system, version | values |
| CodeValue | code, display, parentCode | codeSet |

## Missing Domain Concepts (Not Yet Modeled)

- Provider availability/schedule templates
- Resource/equipment scheduling
- Consent enforcement rules
- Clinical document versions/amendments
- Prescription transmission records
- Clearinghouse message correlation
- Recall/reminder rules
- Waitlist entries
- Insurance eligibility verification results
