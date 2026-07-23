# Incident Response Plan

> **Last updated**: 2026-07-21
> **Status**: Initial — plan defined but not tested
> **Classification**: Confidential — Internal Use Only

## Purpose

This plan defines procedures for detecting, responding to, and recovering from security incidents and operational disruptions affecting the CareForge system. **This plan has not been validated through tabletop exercises or real incidents.**

## Scope

This plan covers:

- Security incidents (breaches, unauthorized access, malware)
- Operational incidents (outages, performance degradation)
- Data integrity incidents (corruption, unauthorized modification)
- Privacy incidents (PHI exposure, consent violations)
- Compliance incidents (regulatory violations)

## Incident Classification

### Severity Levels

| Level | Name | Description | Examples |
|-------|------|-------------|----------|
| **SEV-1** | Critical | Complete system unavailability or confirmed PHI breach | Ransomware, data exfiltration, total outage |
| **SEV-2** | High | Major functionality impaired or suspected breach | Partial outage, suspicious access patterns |
| **SEV-3** | Medium | Limited impact, contained issue | Single user compromise, minor data error |
| **SEV-4** | Low | Minimal impact, no PHI exposure | Failed login attempts, minor bugs |

### Incident Types

| Type | Category | Examples |
|------|----------|----------|
| **SEC-01** | Unauthorized Access | Account compromise, privilege escalation |
| **SEC-02** | Data Breach | PHI exposure, unauthorized disclosure |
| **SEC-03** | Malware | Ransomware, virus, trojan |
| **SEC-04** | Denial of Service | DDoS, resource exhaustion |
| **SEC-05** | Insider Threat | Malicious employee, data theft |
| **OPS-01** | System Outage | Server failure, network issue |
| **OPS-02** | Performance | Degradation, timeout |
| **OPS-03** | Data Corruption | Database error, file damage |
| **PRI-01** | Privacy Violation | Consent bypass, minimum necessary violation |
| **CMP-01** | Compliance | Regulatory violation, audit finding |

## Incident Response Team

### Roles and Responsibilities

| Role | Responsibility | Contact |
|------|---------------|---------|
| **Incident Commander** | Overall coordination, decisions | [To be assigned] |
| **Technical Lead** | Technical investigation, remediation | [To be assigned] |
| **Security Analyst** | Security analysis, forensics | [To be assigned] |
| **Communications Lead** | Internal/external communications | [To be assigned] |
| **Legal/Compliance** | Regulatory obligations, breach assessment | [To be assigned] |
| **Clinical Lead** | Patient safety impact assessment | [To be assigned] |

### Escalation Matrix

| Severity | Initial Response | Escalation (if unresolved) |
|----------|-----------------|---------------------------|
| SEV-1 | On-call engineer → Incident Commander → Executive | 15 min → 30 min → 1 hour |
| SEV-2 | On-call engineer → Technical Lead | 30 min → 2 hours |
| SEV-3 | On-call engineer | 2 hours |
| SEV-4 | Next business day | Backlog |

## Incident Response Phases

### Phase 1: Detection and Identification

**Objective**: Identify and classify the incident

**Activities**:

1. Monitor alerts from:
   - Security monitoring system (not yet implemented)
   - Application logs
   - User reports
   - Third-party notifications

2. Initial assessment:
   - What happened?
   - When did it start?
   - What systems are affected?
   - Is PHI involved?
   - Is it ongoing?

3. Classify severity and type

4. Notify appropriate personnel

**Detection Sources**:

| Source | Status | Notes |
|--------|--------|-------|
| SIEM/Security monitoring | ❌ Not implemented | Required for production |
| Application error logs | 🔶 Partial | Basic logging exists |
| Audit logs | 🔶 Partial | Not comprehensive |
| User reports | ✅ Available | Help desk process |
| Third-party alerts | ❌ Not implemented | No integrations |

### Phase 2: Containment

**Objective**: Prevent further damage

**Short-term containment**:

1. Isolate affected systems
   ```bash
   # Example: Block IP address
   iptables -A INPUT -s <IP> -j DROP
   
   # Example: Disable compromised account
   # Via admin API or database
   ```

2. Preserve evidence
   ```bash
   # Capture logs
   docker-compose logs --no-color > incident_$(date +%Y%m%d_%H%M%S).log
   
   # Database snapshot
   pg_dump -Fc careforge > incident_snapshot.dump
   ```

3. Implement temporary fixes
   - Disable affected features
   - Apply emergency patches
   - Increase monitoring

**Long-term containment**:

1. Apply permanent fixes
2. Rebuild compromised systems
3. Reset credentials
4. Update firewall rules

### Phase 3: Eradication

**Objective**: Remove the threat

1. Identify root cause
2. Remove malware/backdoors
3. Patch vulnerabilities
4. Reset all affected credentials
5. Review and update access controls

### Phase 4: Recovery

**Objective**: Restore normal operations

1. Restore from clean backups if necessary
2. Rebuild affected systems
3. Gradually restore services
4. Monitor for recurrence
5. Validate system integrity

**Recovery validation**:

- [ ] All systems operational
- [ ] No signs of compromise
- [ ] Data integrity verified
- [ ] Access controls validated
- [ ] Monitoring active
- [ ] Performance normal

### Phase 5: Post-Incident

**Objective**: Learn and improve

1. Conduct post-incident review (within 72 hours)
2. Document lessons learned
3. Update procedures
4. Implement preventive measures
5. Report to management/regulators if required

## PHI Breach Procedures

### Breach Assessment

When PHI may have been exposed:

1. **Identify the data involved**
   - What PHI was accessed/exposed?
   - How many patients affected?
   - What identifiers were involved?

2. **Assess the risk**
   - Was data actually acquired?
   - Was data encrypted?
   - Who had access?
   - What is the likelihood of misuse?

3. **Document the assessment**
   - Use HIPAA breach risk assessment factors
   - Consult legal counsel
   - Document decision rationale

### Notification Requirements

If breach is confirmed:

| Notification | Timeline | Method |
|--------------|----------|--------|
| Affected individuals | Within 60 days | Written notice |
| HHS Secretary | Within 60 days (or annual if <500) | Electronic portal |
| Media (if >500 in state) | Within 60 days | Press release |
| State AG (if required) | Per state law | Written notice |

### Notification Content

Individual notifications must include:

1. Description of the breach
2. Types of information involved
3. Steps individuals should take
4. What the organization is doing
5. Contact information for questions
6. Credit monitoring offer (if applicable)

## Operational Incident Procedures

### System Outage

1. **Immediate actions**
   - Assess scope and impact
   - Activate failover if available
   - Notify stakeholders
   - Implement downtime procedures

2. **Downtime procedures** (clinical)
   - Switch to paper documentation
   - Use cached patient information
   - Defer non-urgent operations
   - Establish manual processes

3. **Recovery**
   - Restore services
   - Reconcile downtime records
   - Verify data integrity
   - Document outage

### Performance Degradation

1. Identify bottleneck
2. Scale resources if possible
3. Implement rate limiting
4. Communicate with users
5. Monitor recovery

## Communication Procedures

### Internal Communication

| Audience | Method | Timing |
|----------|--------|--------|
| Incident team | Secure chat/phone | Immediate |
| Management | Email/phone | Per severity |
| All staff | Email/intranet | As needed |
| Clinical staff | Direct notification | Immediate for SEV-1/2 |

### External Communication

| Audience | Method | Timing | Approval |
|----------|--------|--------|----------|
| Patients | Written notice | Per legal requirement | Legal |
| Regulators | Formal notification | Per legal requirement | Legal |
| Media | Press release | As needed | Communications |
| Partners | Direct contact | As needed | Management |

## Evidence Preservation

### Chain of Custody

For security incidents requiring forensic analysis:

1. Document evidence collection
2. Use write-once media where possible
3. Calculate and record hashes
4. Limit access to evidence
5. Maintain custody log

### Evidence Types

| Type | Collection Method | Retention |
|------|-------------------|-----------|
| System logs | Export to secure storage | 1 year minimum |
| Database snapshots | pg_dump to encrypted storage | Per legal hold |
| Network captures | PCAP files | Per legal hold |
| Memory dumps | Volatility framework | Per legal hold |
| Disk images | Forensic imaging | Per legal hold |

## Testing and Maintenance

### Plan Testing

| Activity | Frequency | Method |
|----------|-----------|--------|
| Tabletop exercise | Annually | Scenario walkthrough |
| Technical drill | Annually | Simulated incident |
| Communication test | Semi-annually | Contact verification |
| Backup restoration | Quarterly | Test restore |

### Plan Review

This plan must be reviewed:

- Annually at minimum
- After every incident
- After significant system changes
- After regulatory changes
- After organizational changes

## Appendices

### Appendix A: Contact List

| Role | Name | Phone | Email | Backup |
|------|------|-------|-------|--------|
| Incident Commander | [TBD] | [TBD] | [TBD] | [TBD] |
| Technical Lead | [TBD] | [TBD] | [TBD] | [TBD] |
| Security Analyst | [TBD] | [TBD] | [TBD] | [TBD] |
| Legal Counsel | [TBD] | [TBD] | [TBD] | [TBD] |
| Clinical Lead | [TBD] | [TBD] | [TBD] | [TBD] |

### Appendix B: External Contacts

| Organization | Contact | Purpose |
|--------------|---------|---------|
| HHS OCR | [Portal] | Breach reporting |
| FBI IC3 | [Portal] | Cybercrime reporting |
| State AG | [TBD] | State breach notification |
| Cyber insurer | [TBD] | Insurance claim |

### Appendix C: Incident Report Template

```
INCIDENT REPORT
===============

Incident ID: [ID]
Date/Time Detected: [Timestamp]
Date/Time Resolved: [Timestamp]
Severity: [SEV-1/2/3/4]
Type: [SEC/OPS/PRI/CMP]

SUMMARY
-------
[Brief description of incident]

TIMELINE
--------
[Chronological events]

IMPACT
------
[Systems affected, users affected, PHI involved]

ROOT CAUSE
----------
[Underlying cause]

REMEDIATION
-----------
[Actions taken]

LESSONS LEARNED
---------------
[What to improve]

FOLLOW-UP ACTIONS
-----------------
[Preventive measures]
```

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-21 | Engineering | Initial version |

## Approval

This plan requires approval from:

- [ ] Engineering Manager
- [ ] Security Officer
- [ ] Compliance Officer
- [ ] Clinical Director
- [ ] Executive Sponsor
