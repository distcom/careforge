# Operations Runbook

> **Last updated**: 2026-07-21
> **Status**: Initial — procedures defined but not validated
> **Audience**: Operations team, on-call engineers, system administrators

## Purpose

This runbook provides operational procedures for deploying, monitoring, maintaining, and troubleshooting the CareForge system. **These procedures have not been validated in a production environment.**

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                        │
│                    (TLS termination)                        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │   API    │    │   API    │    │   API    │
        │ Server 1 │    │ Server 2 │    │ Server N │
        │ (NestJS) │    │ (NestJS) │    │ (NestJS) │
        └────┬─────┘    └────┬─────┘    └────┬─────┘
             │               │               │
             └───────────────┼───────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │PostgreSQL│        │  Redis   │        │   S3     │
  │ Primary  │        │ Cluster  │        │ Storage  │
  └────┬─────┘        └──────────┘        └──────────┘
       │
       ▼
  ┌──────────┐
  │PostgreSQL│
  │ Replica  │
  └──────────┘
```

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All CI checks pass on the release branch
- [ ] Database migration tested on staging
- [ ] Rollback procedure documented and tested
- [ ] Backup completed within last 24 hours
- [ ] On-call engineer identified and available
- [ ] Maintenance window scheduled (if required)
- [ ] Stakeholders notified
- [ ] Monitoring dashboards reviewed (baseline established)

### Deployment Steps

1. **Verify current state**
   ```bash
   # Check current version
   curl -s https://api.careforge.example/health | jq .version
   
   # Check database migration status
   npx prisma migrate status
   ```

2. **Create backup**
   ```bash
   # Full database backup
   pg_dump -Fc careforge > backup_$(date +%Y%m%d_%H%M%S).dump
   
   # Verify backup
   pg_restore -l backup_*.dump | head -20
   ```

3. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```

4. **Deploy application**
   ```bash
   # Pull latest images
   docker-compose pull
   
   # Rolling update
   docker-compose up -d --no-deps --scale api=3 api
   ```

5. **Verify deployment**
   ```bash
   # Health check
   curl -s https://api.careforge.example/health | jq .
   
   # Check logs
   docker-compose logs --tail=100 api
   ```

6. **Post-deployment validation**
   - [ ] Health endpoint returns 200
   - [ ] Database connectivity confirmed
   - [ ] Redis connectivity confirmed
   - [ ] Test user can log in
   - [ ] Test patient record accessible
   - [ ] No error spike in monitoring

### Rollback Procedure

**Trigger conditions:**
- Health check fails after 5 minutes
- Error rate exceeds 5%
- Critical functionality unavailable
- Database corruption detected

**Rollback steps:**

1. **Stop new deployments**
   ```bash
   # Disable auto-scaling
   # Block CI/CD pipeline
   ```

2. **Restore previous version**
   ```bash
   docker-compose down
   docker-compose -f docker-compose.previous.yml up -d
   ```

3. **Restore database if migrated**
   ```bash
   # Only if migration was destructive
   pg_restore -d careforge -c backup_*.dump
   ```

4. **Verify rollback**
   ```bash
   curl -s https://api.careforge.example/health | jq .
   ```

5. **Document incident**
   - Create incident report
   - Notify stakeholders
   - Schedule post-mortem

## Monitoring

### Health Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `/health` | Basic liveness | `{"status": "ok"}` |
| `/health/ready` | Readiness check | `{"status": "ready", "dependencies": {...}}` |
| `/health/live` | Liveness check | `{"status": "alive"}` |

### Key Metrics

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| API response time (p95) | > 500ms | > 2000ms |
| API error rate | > 1% | > 5% |
| Database connection pool usage | > 70% | > 90% |
| Redis memory usage | > 70% | > 90% |
| Disk usage | > 75% | > 90% |
| CPU usage | > 70% | > 90% |
| Memory usage | > 75% | > 90% |
| Active sessions | > 80% capacity | > 95% capacity |

### Log Levels

| Level | Usage | Alert |
|-------|-------|-------|
| ERROR | Failures requiring attention | Immediate |
| WARN | Potential issues | Review within 1 hour |
| INFO | Normal operations | No alert |
| DEBUG | Detailed diagnostics | No alert |

### Alert Escalation

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| Critical (P1) | 15 minutes | On-call → Team Lead → Engineering Manager |
| High (P2) | 1 hour | On-call → Team Lead |
| Medium (P3) | 4 hours | On-call |
| Low (P4) | Next business day | Backlog |

## Troubleshooting

### Common Issues

#### API Not Responding

1. Check container status
   ```bash
   docker-compose ps
   docker-compose logs --tail=50 api
   ```

2. Check resource usage
   ```bash
   docker stats
   ```

3. Check database connectivity
   ```bash
   docker-compose exec db psql -U careforge -c "SELECT 1"
   ```

4. Check Redis connectivity
   ```bash
   docker-compose exec redis redis-cli ping
   ```

#### Database Connection Exhausted

1. Check connection count
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

2. Identify long-running queries
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC;
   ```

3. Kill problematic queries if necessary
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <PID>;
   ```

#### High Memory Usage

1. Identify memory consumers
   ```bash
   docker stats --no-stream
   ```

2. Check for memory leaks
   ```bash
   # Node.js heap dump
   kill -USR2 <PID>
   ```

3. Restart if necessary
   ```bash
   docker-compose restart api
   ```

#### Redis Issues

1. Check Redis status
   ```bash
   docker-compose exec redis redis-cli info
   ```

2. Check memory
   ```bash
   docker-compose exec redis redis-cli info memory
   ```

3. Clear cache if necessary (use with caution)
   ```bash
   docker-compose exec redis redis-cli FLUSHDB
   ```

## Backup and Recovery

### Backup Schedule

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Full database | Daily | 30 days | S3 + offsite |
| Incremental (WAL) | Continuous | 7 days | S3 |
| Application config | On change | Indefinite | Git |
| File storage | Daily | 30 days | S3 cross-region |

### Backup Verification

Monthly backup verification procedure:

1. Restore backup to isolated environment
2. Run integrity checks
3. Verify record counts
4. Test critical workflows
5. Document results
6. Report to management

### Recovery Procedures

See [BACKUP_AND_DISASTER_RECOVERY.md](./BACKUP_AND_DISASTER_RECOVERY.md) for detailed recovery procedures.

## Security Operations

### Access Review

Quarterly access review:

1. Export user list
2. Review with department managers
3. Disable terminated employees
4. Review privileged access
5. Document review completion

### Security Patching

| Component | Patch Frequency | Process |
|-----------|-----------------|---------|
| OS packages | Monthly | Automated + manual review |
| Application dependencies | Weekly | Dependabot + manual review |
| Database | Per vendor advisory | Maintenance window |
| Container base images | Monthly | Rebuild and redeploy |

### Incident Response

See [INCIDENT_RESPONSE_PLAN.md](./INCIDENT_RESPONSE_PLAN.md) for security incident procedures.

## Capacity Planning

### Current Capacity (Estimate)

| Resource | Current | Projected Growth |
|----------|---------|------------------|
| Database storage | ~10 GB | +2 GB/month |
| File storage | ~50 GB | +10 GB/month |
| API requests | ~10K/day | +20%/month |
| Concurrent users | ~50 | +10/month |

### Scaling Triggers

| Metric | Action |
|--------|--------|
| Database > 80% capacity | Add storage or archive |
| API p95 > 1s consistently | Add API instances |
| Concurrent users > 80% capacity | Scale horizontally |
| File storage > 80% | Add storage or tier |

## Maintenance Windows

### Scheduled Maintenance

- **Frequency**: Monthly (first Sunday, 2-4 AM local)
- **Notification**: 72 hours advance notice
- **Duration**: Maximum 2 hours
- **Activities**: Security patches, database maintenance, upgrades

### Emergency Maintenance

- **Authorization**: Engineering Manager or on-call lead
- **Notification**: As soon as possible
- **Documentation**: Required within 24 hours

## Support Procedures

### User Support Escalation

| Level | Contact | Response Time |
|-------|---------|---------------|
| L1 (User) | Help desk | 4 hours |
| L2 (Technical) | Operations team | 2 hours |
| L3 (Engineering) | Development team | 1 hour |
| L4 (Vendor) | Third-party support | Per SLA |

### Known Issues

Track in issue tracker. Current known issues:

1. See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-21 | Engineering | Initial version |

## Review Schedule

This runbook must be reviewed:

- After every major deployment
- After every incident
- Quarterly at minimum
- When architecture changes significantly
