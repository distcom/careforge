# CareForge EHR - API Documentation

## Overview
This document provides comprehensive API documentation for CareForge EHR.

## Base URL
```
Production: https://api.careforge.health/v1
Staging: https://staging-api.careforge.health/v1
Development: http://localhost:3000/v1
```

## Authentication

### JWT Authentication
All API requests require a valid JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Obtaining Tokens
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900
}
```

### Token Refresh
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

## Rate Limiting

| Tier | Requests/Minute | Burst |
|------|-----------------|-------|
| Standard | 100 | 20 |
| Premium | 500 | 100 |
| Enterprise | 2000 | 500 |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
```

## API Endpoints

### Patients

#### List Patients
```http
GET /patients?page=1&limit=20&search=john
```

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "medicalRecordNumber": "MRN001",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1980-01-15",
      "gender": "male"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

#### Get Patient
```http
GET /patients/:id
```

#### Create Patient
```http
POST /patients
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1980-01-15",
  "gender": "male",
  "address": "123 Main St",
  "city": "Anytown",
  "state": "CA",
  "zipCode": "90210",
  "phone": "555-123-4567"
}
```

### Encounters

#### List Encounters
```http
GET /encounters?patientId=uuid&status=COMPLETED
```

#### Create Encounter
```http
POST /encounters
Content-Type: application/json

{
  "patientId": "uuid",
  "providerId": "uuid",
  "type": "office",
  "startTime": "2026-07-21T09:00:00Z",
  "chiefComplaint": "Annual physical"
}
```

### Medications

#### List Medications
```http
GET /medications?patientId=uuid&status=ACTIVE
```

#### Create Prescription
```http
POST /medications
Content-Type: application/json

{
  "patientId": "uuid",
  "medicationName": "Lisinopril",
  "ndcCode": "00071012345",
  "dosage": "10mg",
  "frequency": "once daily",
  "route": "oral",
  "quantity": 30,
  "refills": 3
}
```

#### Sign Prescription
```http
POST /medications/:id/sign
Content-Type: application/json

{
  "electronicSignature": "base64-encoded-signature"
}
```

### FHIR R4 API

#### Capability Statement
```http
GET /fhir/metadata
```

#### Patient Search
```http
GET /fhir/Patient?name=John&birthdate=1980-01-15
```

#### Patient $everything
```http
GET /fhir/Patient/:id/$everything
```

### HL7 v2 Messaging

#### Process Inbound Message
```http
POST /hl7v2/inbound
Content-Type: text/plain

MSH|^~\&|SendingApp|SendingFac|ReceivingApp|ReceivingFac|20260721090000||ADT^A01|MSG00001|P|2.5.1
PID|1||MRN001||Doe^John||19800115|M
```

### X12 EDI

#### Generate 837 Claim
```http
POST /x12-edi/claims/837/:chargeId
```

#### Process 835 Remittance
```http
POST /x12-edi/remittance/835
Content-Type: text/plain

ISA*00*...*00*...*ZZ*SENDER...*ZZ*RECEIVER...*260721*0900*^*00501*000000001*0*P*:~
GS*HP*SENDER*RECEIVER*20260721*0900*1*X*005010X221A1~
ST*835*0001~
...
```

### C-CDA Documents

#### Generate CCD
```http
POST /c-cda/ccd/:patientId?download=true
```

Response: XML document with Content-Type: application/xml

## Error Responses

### Standard Error Format
```json
{
  "statusCode": 404,
  "message": "Patient not found",
  "error": "Not Found",
  "timestamp": "2026-07-21T09:00:00Z",
  "path": "/patients/invalid-id"
}
```

### Error Codes
| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource conflict |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Webhooks

### Event Types
- `patient.created`
- `patient.updated`
- `encounter.completed`
- `medication.prescribed`
- `lab.result.available`

### Webhook Payload
```json
{
  "event": "patient.created",
  "timestamp": "2026-07-21T09:00:00Z",
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

## SDKs

### JavaScript/TypeScript
```bash
npm install @careforge/sdk
```

```typescript
import { CareForgeClient } from '@careforge/sdk';

const client = new CareForgeClient({
  apiKey: 'your-api-key',
  environment: 'production'
});

const patients = await client.patients.list({ search: 'John' });
```

### Python
```bash
pip install careforge-sdk
```

```python
from careforge import Client

client = Client(api_key='your-api-key')
patients = client.patients.list(search='John')
```

## Changelog

### v1.5.0 (2026-07-21)
- Added X12 EDI endpoints
- Added C-CDA document generation
- Added HL7 v2 messaging
- Enhanced FHIR R4 support

### v1.4.0 (2026-06-15)
- Added quality reporting endpoints
- Added data migration API
- Enhanced e-prescribing workflow

## Support

- **Documentation**: https://docs.careforge.health
- **API Status**: https://status.careforge.health
- **Support Email**: api-support@careforge.health
- **Developer Forum**: https://community.careforge.health

## Last Updated
2026-07-21
