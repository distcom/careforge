# CareForge EHR - Security Architecture

## Overview
This document describes the security architecture of CareForge EHR, including authentication, authorization, encryption, and audit capabilities.

## Security Principles

1. **Deny by Default**: All routes require authentication unless explicitly marked public
2. **Least Privilege**: Users receive minimum permissions necessary for their role
3. **Defense in Depth**: Multiple security layers protect sensitive data
4. **Audit Everything**: All access and modifications are logged
5. **Encrypt Everywhere**: Data encrypted at rest and in transit

## Authentication

### JWT-Based Authentication
- **Token Type**: JSON Web Tokens (JWT)
- **Algorithm**: RS256 (RSA Signature with SHA-256)
- **Access Token Lifetime**: 15 minutes
- **Refresh Token Lifetime**: 7 days
- **Token Storage**: HttpOnly, Secure, SameSite cookies

### Multi-Factor Authentication (MFA)
- TOTP-based second factor
- SMS backup codes
- Recovery codes for account recovery

### Session Management
- Automatic logout after 15 minutes of inactivity
- Concurrent session limits
- Session revocation capability

## Authorization

### Role-Based Access Control (RBAC)
```
Roles:
- ADMIN: Full system access
- PROVIDER: Clinical access to assigned patients
- NURSE: Clinical support access
- BILLING: Financial data access
- FRONT_DESK: Scheduling and registration
- PATIENT: Own record access via portal
```

### Permission Model
- Granular permissions per resource and action
- Permission inheritance through roles
- Deny-by-default global guard

### Data-Level Security
- Patient data segmentation
- Provider-patient relationship enforcement
- Consent-based access restrictions

## Encryption

### Data at Rest
- **Database**: AES-256 encryption via PostgreSQL pgcrypto
- **File Storage**: AES-256 encryption for documents
- **Backups**: Encrypted backup files

### Data in Transit
- **Protocol**: TLS 1.3 minimum
- **Certificates**: Let's Encrypt or enterprise CA
- **HSTS**: Strict-Transport-Security headers enforced

### Key Management
- Environment-based key storage
- Key rotation procedures
- No hardcoded secrets

## Audit Logging

### Audit Events
All of the following are logged:
- Authentication events (login, logout, failed attempts)
- Authorization decisions (granted, denied)
- Data access (read, create, update, delete)
- Administrative actions
- Security events (password changes, MFA)

### Audit Record Structure
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "userId": "user-uuid",
  "action": "ACTION_TYPE",
  "entityType": "EntityType",
  "entityId": "entity-uuid",
  "ipAddress": "client-ip",
  "userAgent": "client-ua",
  "details": {}
}
```

### Audit Retention
- Minimum 6 years (HIPAA requirement)
- Immutable audit records
- Regular audit log review

## API Security

### Rate Limiting
- Per-user rate limits
- Per-IP rate limits
- Burst protection

### Input Validation
- DTO validation with class-validator
- SQL injection prevention via Prisma ORM
- XSS protection via output encoding

### CORS
- Configurable allowed origins
- Credentials support for authenticated requests

## Infrastructure Security

### Network Security
- VPC isolation
- Security groups / firewall rules
- Private subnets for databases
- NAT gateway for outbound traffic

### Container Security
- Non-root containers
- Read-only filesystems where possible
- Minimal base images
- Regular vulnerability scanning

### Database Security
- Connection pooling with limits
- Query timeout enforcement
- Row-level security for patient data
- Encrypted connections (SSL)

## Security Monitoring

### Alerting
- Failed authentication alerts
- Unusual access patterns
- Privilege escalation attempts
- Data exfiltration detection

### Logging
- Centralized log aggregation
- Security event correlation
- Real-time alerting

## Incident Response

### Detection
- Security monitoring
- User reports
- Automated scanning

### Response
- Incident classification
- Containment procedures
- Eradication and recovery
- Post-incident review

## Compliance

### HIPAA
- Administrative safeguards
- Physical safeguards
- Technical safeguards
- Breach notification procedures

### SOC 2
- Security controls
- Availability controls
- Confidentiality controls

## Last Updated
2026-07-21
