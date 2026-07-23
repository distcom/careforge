# Backup and Disaster Recovery

> **Status**: Partial — Basic backup exists, no DR plan tested
> **Last updated**: 2026-07-21

## Current Capabilities

| Feature | Status |
|---------|--------|
| Full database dump (pg_dump) | Implemented (admin-only, execFile) |
| Schema-only backup | Implemented |
| Compressed backups (gzip) | Implemented |
| Retention policy (max N backups) | Implemented |
| Backup integrity verification | Implemented (gzip -t) |
| Path traversal protection | Implemented |
| Admin-only access | Implemented |
| Audit logging of operations | Implemented |

## NOT Implemented

| Feature | Risk |
|---------|------|
| Backup encryption at rest | PHI exposure if storage compromised |
| Offsite/immutable storage | Single point of failure |
| Point-in-time recovery (WAL archiving) | Data loss between backups |
| Automated backup scheduling | Relies on manual trigger |
| Restore testing | Unverified restore capability |
| Disaster recovery runbook | No documented procedure |
| RPO/RTO definition | No recovery targets |
| Backup access logging (OS-level) | Application-only logging |
| Cross-region replication | Geographic single point of failure |

## Target Architecture

```
[PostgreSQL Primary]
    ├── WAL archiving → [S3/GCS immutable bucket]
    ├── Nightly pg_dump → [Encrypted S3 + cross-region copy]
    └── Streaming replica → [Standby in different AZ]

[Recovery]
    ├── PITR: Restore base backup + replay WAL to target timestamp
    ├── Full restore: Decrypt + pg_restore from latest dump
    └── Failover: Promote streaming replica
```

## Recovery Targets (To Be Defined)

| Metric | Target | Current |
|--------|--------|---------|
| RPO (Recovery Point Objective) | < 1 hour | Unknown (manual backups) |
| RTO (Recovery Time Objective) | < 4 hours | Untested |
| Backup frequency | Every 6 hours | On-demand only |
| Retention | 30 daily, 12 weekly, 12 monthly | 30 backups max |

## Required Actions

1. Enable WAL archiving (pg_basebackup + archive_command)
2. Implement backup encryption (AES-256 with managed keys)
3. Configure automated scheduling (cron or Kubernetes CronJob)
4. Set up offsite immutable storage (S3 Object Lock / GCS retention)
5. Document and test restore procedure quarterly
6. Define and validate RPO/RTO targets
7. Implement backup monitoring and alerting
