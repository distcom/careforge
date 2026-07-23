# Security Architecture

> **Status**: Partial implementation — NOT audited
> **Last updated**: 2026-07-21

## Authentication

### Current Implementation
- JWT access tokens (15-minute expiry) + refresh tokens (7-day expiry)
- Refresh token rotation with single-use enforcement
- Refresh token reuse detection triggers full session revocation
- bcrypt password hashing (cost factor 12)
- Account lockout after 5 failed attempts (15-minute lockout via Redis)
- Password reset via single-use token stored in Redis (1-hour TTL)

### Not Implemented
- MFA enrollment and verification (TOTP library present, no flow)
- OAuth2/OIDC provider integration
- Device fingerprinting
- Concurrent session limits
- Password complexity policy enforcement beyond minimum length
- Secure password-reset email delivery (token generated, not sent)

## Authorization

### Current Implementation
- Global deny-by-default JWT guard (`GlobalJwtAuthGuard` via `APP_GUARD`)
- Endpoints explicitly marked `@Public()` bypass authentication
- Role-based access via `@Roles()` decorator + `RolesGuard`
- Permission-based access via `@RequirePermissions()` decorator + `PermissionsGuard`
- Backup operations restricted to `admin` role

### Not Implemented
- Contextual authorization (patient-scoped, facility-scoped)
- Organization/location-based access control
- Encounter-level authorization
- Consent-based access restrictions
- Proxy/guardian access
- Break-glass emergency access with justification
- Assignment-based access (provider-patient relationship)
- Negative authorization tests

## Data Protection

### Current Implementation
- Input validation via class-validator (whitelist + forbidNonWhitelisted)
- Helmet.js security headers
- CORS restricted to configured origins
- Rate limiting (100 requests/60 seconds per IP)
- Backup file path canonicalization and traversal protection
- Backup operations use `execFile` (no shell interpolation)

### Not Implemented
- Encryption at rest (database, backups, file storage)
- TLS enforcement (relies on reverse proxy)
- Field-level encryption for sensitive data (SSN, MRN)
- Data masking in logs
- PHI de-identification for analytics
- Secure file upload (no virus scanning, no content-type validation)

## Audit

### Current Implementation
- Event-driven audit logging via `AuditEventHandler`
- Captures: patient created, encounter completed, medication prescribed, lab critical, claim submitted, document uploaded, break-glass
- Backup operations logged with admin user ID

### Not Implemented
- Append-only audit storage (current: regular database table, mutable)
- Tamper evidence (hash chaining, digital signatures)
- Trusted timestamps
- Audit of all record reads (not just writes)
- Audit export and monitoring
- Retention controls
- Restricted audit access (admins can currently modify audit records)

## Network Security

### Current Implementation
- CORS configuration
- Helmet.js (CSP, HSTS, X-Frame-Options, etc.)
- Rate limiting

### Not Implemented
- Network segmentation
- WAF rules
- API gateway with request signing
- mTLS between services
- Database connection encryption enforcement
- Redis AUTH/TLS

## Threat Model Summary

See [THREAT_MODEL.md](./THREAT_MODEL.md) for detailed threat analysis.

## Security Testing Requirements (Not Yet Met)

- [ ] Authorization matrix tests (every role × every endpoint)
- [ ] Horizontal privilege escalation tests
- [ ] Vertical privilege escalation tests
- [ ] Session management tests (expiry, revocation, reuse)
- [ ] Input fuzzing on all endpoints
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] CSRF testing
- [ ] File upload attack testing
- [ ] Rate limit bypass testing
- [ ] Penetration test by qualified third party
