# Threat Model

> **Status**: Initial assessment — NOT validated by security review
> **Last updated**: 2026-07-21
> **Methodology**: STRIDE

## System Boundaries

```
[Browser] → [Reverse Proxy/TLS] → [NestJS API] → [PostgreSQL]
                                        ↓              ↓
                                   [Redis]        [S3 Storage]
                                        ↓
                                   [BullMQ Workers]
```

## Threat Inventory

### T1: Authentication Bypass
| Attribute | Detail |
|-----------|--------|
| Category | Spoofing |
| Asset | User sessions, clinical data |
| Threat | Attacker obtains valid JWT without credentials |
| Current mitigation | Short token expiry (15min), refresh rotation, reuse detection |
| Residual risk | No MFA, no device binding, no anomaly detection |
| Status | **Partially mitigated** |

### T2: Privilege Escalation
| Attribute | Detail |
|-----------|--------|
| Category | Elevation of privilege |
| Asset | Admin functions, other patients' data |
| Threat | Patient role accesses admin endpoints or other patients' records |
| Current mitigation | Global deny-by-default guard, @Roles decorator, registration restricted to patient role |
| Residual risk | No contextual authorization (patient-scoped), no negative tests |
| Status | **Partially mitigated** |

### T3: PHI Data Exposure
| Attribute | Detail |
|-----------|--------|
| Category | Information disclosure |
| Asset | Patient health information |
| Threat | Unauthorized read of clinical records via API manipulation |
| Current mitigation | JWT required for all non-public endpoints |
| Residual risk | No patient-scoped authorization, no consent enforcement, no read auditing |
| Status | **High residual risk** |

### T4: Injection Attacks
| Attribute | Detail |
|-----------|--------|
| Category | Tampering |
| Asset | Database integrity |
| Threat | SQL injection, NoSQL injection, command injection |
| Current mitigation | Prisma ORM (parameterized queries), execFile for backup, class-validator input validation |
| Residual risk | Raw SQL in getDatabaseStats (parameterized via psql args), no WAF |
| Status | **Mostly mitigated** |

### T5: Backup Tampering/Theft
| Attribute | Detail |
|-----------|--------|
| Category | Tampering, Information disclosure |
| Asset | Database backups containing PHI |
| Threat | Attacker downloads, modifies, or deletes backups |
| Current mitigation | Admin-only access, path traversal protection, execFile |
| Residual risk | No encryption at rest, no integrity signatures, no offsite storage, no access logging beyond application log |
| Status | **Partially mitigated** |

### T6: Denial of Service
| Attribute | Detail |
|-----------|--------|
| Category | Denial of service |
| Asset | API availability |
| Threat | Resource exhaustion via API flooding |
| Current mitigation | Rate limiting (100 req/60s per IP) |
| Residual risk | No per-user limits, no request size limits, no connection pooling limits, no CDN |
| Status | **Partially mitigated** |

### T7: Supply Chain Attack
| Attribute | Detail |
|-----------|--------|
| Category | Tampering |
| Asset | Application integrity |
| Threat | Malicious dependency or container image |
| Current mitigation | None |
| Residual risk | No lockfile committed, no SBOM, no image pinning, no dependency review |
| Status | **Not mitigated** |

### T8: Interoperability Message Injection
| Attribute | Detail |
|-----------|--------|
| Category | Tampering, Spoofing |
| Asset | Clinical data integrity |
| Threat | Malicious HL7/FHIR/X12 messages inject false clinical data |
| Current mitigation | Basic parsing |
| Residual risk | No message authentication, no schema validation, no replay protection, no source verification |
| Status | **Not mitigated** |

### T9: Session Hijacking
| Attribute | Detail |
|-----------|--------|
| Category | Spoofing |
| Asset | User sessions |
| Threat | Token theft via XSS, MITM, or log exposure |
| Current mitigation | Short expiry, Helmet.js CSP, HTTPS expected via proxy |
| Residual risk | No token binding, no IP validation, tokens in localStorage (XSS-accessible) |
| Status | **Partially mitigated** |

### T10: Audit Log Tampering
| Attribute | Detail |
|-----------|--------|
| Category | Repudiation |
| Asset | Audit trail integrity |
| Threat | Admin modifies or deletes audit records to hide unauthorized access |
| Current mitigation | None |
| Residual risk | Audit table is mutable, no hash chaining, no restricted access |
| Status | **Not mitigated** |

## Risk Matrix

| Threat | Likelihood | Impact | Risk Level | Priority |
|--------|-----------|--------|-----------|----------|
| T3: PHI Exposure | High | Critical | **Critical** | P0 |
| T2: Privilege Escalation | Medium | Critical | **High** | P0 |
| T8: Message Injection | Medium | Critical | **High** | P1 |
| T10: Audit Tampering | Medium | High | **High** | P1 |
| T7: Supply Chain | Low | Critical | **Medium** | P2 |
| T5: Backup Theft | Low | Critical | **Medium** | P2 |
| T1: Auth Bypass | Low | High | **Medium** | P2 |
| T9: Session Hijack | Medium | Medium | **Medium** | P2 |
| T6: DoS | Medium | Medium | **Medium** | P3 |
| T4: Injection | Low | High | **Low** | P3 |

## Required Mitigations (Priority Order)

1. **P0**: Implement contextual authorization (patient-scoped, facility-scoped)
2. **P0**: Add negative authorization tests for every role × endpoint combination
3. **P1**: Implement message authentication and schema validation for HL7/FHIR/X12
4. **P1**: Make audit log append-only with hash chaining
5. **P2**: Commit lockfile, generate SBOM, pin container images
6. **P2**: Encrypt backups, add integrity signatures
7. **P2**: Implement MFA enrollment and verification
8. **P3**: Add per-user rate limits and request size limits
