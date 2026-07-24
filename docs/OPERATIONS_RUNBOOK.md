# CareForge EHR - Operations Runbook

## Overview
This runbook provides operational procedures for maintaining CareForge EHR in production.

## Daily Operations

### Morning Checklist
- [ ] Verify system health dashboard
- [ ] Check overnight error logs
- [ ] Review failed job queue
- [ ] Verify backup completion
- [ ] Check disk space utilization
- [ ] Review security alerts

### Health Monitoring
```bash
# Check API health
curl -s http://localhost:3000/health | jq

# Check database connectivity
psql -h localhost -U careforge_user -d careforge_prod -c "SELECT 1;"

# Check Redis connectivity
redis-cli ping

# Check disk space
df -h /var/lib/postgresql
```

### Log Review
```bash
# View recent errors
journalctl -u careforge-api --since "1 hour ago" | grep ERROR

# View audit log summary
psql -c "SELECT action, COUNT(*) FROM audit_log WHERE created_at > NOW() - INTERVAL '1 day' GROUP BY action;"
```

## Incident Response

### Severity Levels
| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| SEV1 | Complete outage | 15 minutes | CTO, On-call |
| SEV2 | Major feature down | 30 minutes | Team Lead |
| SEV3 | Minor issue | 4 hours | On-call |
| SEV4 | Cosmetic/low impact | 24 hours | Backlog |

### Incident Response Procedure
1. **Detect**: Monitoring alert or user report
2. **Assess**: Determine severity and impact
3. **Communicate**: Notify stakeholders
4. **Mitigate**: Apply fix or workaround
5. **Resolve**: Verify fix and close
6. **Review**: Post-incident review

### Common Issues

#### Database Connection Pool Exhausted
```bash
# Check active connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';"

# Restart application
sudo systemctl restart careforge-api
```

#### High Memory Usage
```bash
# Check memory usage
free -h
top -p $(pgrep -f "node.*careforge")

# Restart if necessary
sudo systemctl restart careforge-api
```

#### Slow Queries
```bash
# Find slow queries
psql -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Analyze query
EXPLAIN ANALYZE <query>;
```

## Backup and Recovery

### Backup Schedule
| Type | Frequency | Retention | Verification |
|------|-----------|-----------|--------------|
| Full DB | Daily | 30 days | Weekly restore test |
| Incremental | Hourly | 7 days | Daily |
| WAL Archive | Continuous | 7 days | Continuous |
| Files | Daily | 30 days | Weekly |

### Backup Commands
```bash
# Full database backup
pg_dump -h localhost -U careforge_user -F c careforge_prod > /backups/careforge_$(date +%Y%m%d).dump

# Verify backup
pg_restore -l /backups/careforge_$(date +%Y%m%d).dump | head -20

# Test restore
createdb careforge_test
pg_restore -h localhost -U careforge_user -d careforge_test /backups/careforge_$(date +%Y%m%d).dump
```

### Recovery Procedure
```bash
# Stop application
sudo systemctl stop careforge-api

# Restore database
dropdb careforge_prod
createdb careforge_prod
pg_restore -h localhost -U careforge_user -d careforge_prod /backups/careforge_$(date +%Y%m%d).dump

# Run migrations
cd /opt/careforge
npx prisma migrate deploy

# Start application
sudo systemctl start careforge-api

# Verify
curl http://localhost:3000/health
```

## Deployment Procedures

### Standard Deployment
```bash
# 1. Pull latest code
cd /opt/careforge
git pull origin main

# 2. Install dependencies
npm ci --production

# 3. Build
npm run build

# 4. Run migrations
npx prisma migrate deploy

# 5. Restart application
sudo systemctl restart careforge-api

# 6. Verify
curl http://localhost:3000/health
```

### Rollback Procedure
```bash
# 1. Identify previous version
git log --oneline -5

# 2. Checkout previous version
git checkout <previous-commit>

# 3. Rebuild and restart
npm ci --production
npm run build
sudo systemctl restart careforge-api

# 4. Verify
curl http://localhost:3000/health
```

### Database Migration Rollback
```bash
# Check migration status
npx prisma migrate status

# Rollback last migration (if supported)
npx prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup
pg_restore -h localhost -U careforge_user -d careforge_prod /backups/pre_migration.dump
```

## Performance Tuning

### Database Tuning
```sql
-- Check cache hit ratio
SELECT 
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;

-- Check index usage
SELECT 
  schemaname, relname, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_scan DESC;

-- Analyze tables
ANALYZE patient;
ANALYZE encounter;
```

### Application Tuning
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/health

# Monitor Node.js
node --inspect apps/api/dist/main.js
```

## Security Operations

### User Access Review
```sql
-- List active users
SELECT id, email, role, last_login_at FROM users WHERE is_active = true;

-- List failed login attempts
SELECT email, COUNT(*) as attempts 
FROM audit_log 
WHERE action = 'LOGIN_FAILED' 
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY email
HAVING COUNT(*) > 5;
```

### Audit Log Review
```sql
-- Recent administrative actions
SELECT * FROM audit_log 
WHERE action LIKE '%ADMIN%' 
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Data access patterns
SELECT user_id, entity_type, COUNT(*) as access_count
FROM audit_log
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY user_id, entity_type
ORDER BY access_count DESC;
```

### Security Patching
```bash
# Update dependencies
npm audit fix

# Update system packages
sudo apt-get update
sudo apt-get upgrade

# Restart services
sudo systemctl restart careforge-api
```

## Capacity Planning

### Monitoring Metrics
| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 75% | > 90% |
| Disk Usage | > 80% | > 90% |
| DB Connections | > 80% | > 95% |
| Response Time (p95) | > 500ms | > 1000ms |
| Error Rate | > 1% | > 5% |

### Scaling Procedures
```bash
# Horizontal scaling (add instance)
# Update load balancer configuration
# Add new server to pool

# Vertical scaling (increase resources)
# Stop application
sudo systemctl stop careforge-api

# Increase server resources (cloud console)

# Start application
sudo systemctl start careforge-api
```

## On-Call Procedures

### On-Call Rotation
- **Primary**: 24/7 coverage
- **Secondary**: Backup for primary
- **Escalation**: Engineering Manager

### On-Call Responsibilities
- Monitor alerts
- Respond to incidents
- Perform emergency fixes
- Document incidents
- Handoff to next on-call

### Contact Information
| Role | Contact |
|------|---------|
| On-Call Engineer | PagerDuty rotation |
| Engineering Manager | manager@careforge.health |
| CTO | cto@careforge.health |
| Security Team | security@careforge.health |

## Last Updated
2026-07-21
