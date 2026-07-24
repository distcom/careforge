# CareForge EHR - Disaster Recovery Plan

## Overview
This document describes the disaster recovery (DR) strategy for CareForge EHR, ensuring business continuity in the event of system failures or disasters.

## Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| RPO (Recovery Point Objective) | 1 hour | Maximum acceptable data loss |
| RTO (Recovery Time Objective) | 4 hours | Maximum acceptable downtime |
| MTD (Maximum Tolerable Downtime) | 24 hours | Maximum downtime before critical impact |

## Disaster Scenarios

### Scenario 1: Single Server Failure
- **Impact**: Service interruption
- **Detection**: Health check failure
- **Recovery**: Automatic failover to standby
- **RTO**: < 5 minutes

### Scenario 2: Database Failure
- **Impact**: Data unavailability
- **Detection**: Connection errors, health checks
- **Recovery**: Restore from replica or backup
- **RTO**: < 30 minutes

### Scenario 3: Data Center Outage
- **Impact**: Complete service loss
- **Detection**: Multiple health check failures
- **Recovery**: Failover to DR site
- **RTO**: < 4 hours

### Scenario 4: Data Corruption
- **Impact**: Invalid or lost data
- **Detection**: Data validation errors
- **Recovery**: Point-in-time recovery
- **RTO**: < 8 hours

### Scenario 5: Cybersecurity Incident
- **Impact**: Data breach, ransomware
- **Detection**: Security monitoring alerts
- **Recovery**: Isolate, restore from clean backup
- **RTO**: < 24 hours

## Backup Strategy

### Database Backups
| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Full Backup | Daily | 30 days | Encrypted, off-site |
| Incremental | Hourly | 7 days | Encrypted, off-site |
| WAL Archive | Continuous | 7 days | Encrypted, off-site |
| Logical Backup | Weekly | 90 days | Encrypted, off-site |

### File Backups
| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Document Storage | Daily | 30 days | Encrypted, off-site |
| Configuration | On change | 90 days | Version controlled |
| Application Code | On deploy | Indefinite | Git repository |

### Backup Validation
- **Automated restore testing**: Weekly
- **Backup integrity checks**: Daily
- **Restore time measurement**: Monthly

## Recovery Procedures

### Database Recovery
```bash
# 1. Stop application
systemctl stop careforge-api

# 2. Restore from backup
pg_restore -d careforge_prod /backups/latest.dump

# 3. Apply WAL files for point-in-time recovery
# (if needed)

# 4. Verify data integrity
psql -c "SELECT COUNT(*) FROM patient;"

# 5. Restart application
systemctl start careforge-api

# 6. Verify health
curl http://localhost:3000/health
```

### Application Recovery
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci

# 3. Run migrations
npx prisma migrate deploy

# 4. Build application
npm run build

# 5. Start application
npm run start:prod
```

### Full Site Recovery
1. **Provision infrastructure** (IaC or manual)
2. **Restore database** from off-site backup
3. **Restore file storage** from backup
4. **Deploy application** from repository
5. **Configure DNS** to point to new site
6. **Verify functionality** with test suite
7. **Notify users** of restoration

## High Availability Architecture

### Production Architecture
```
                    ┌─────────────┐
                    │   Load      │
                    │  Balancer   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌────▼────┐ ┌────▼────┐
        │  App      │ │  App    │ │  App    │
        │  Server 1 │ │ Server 2│ │ Server 3│
        └─────┬─────┘ └────┬────┘ └────┬────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │  Database   │
                    │  Primary    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Database   │
                    │  Replica    │
                    └─────────────┘
```

### Failover Procedures
1. **Detection**: Health check failure (3 consecutive failures)
2. **Isolation**: Remove failed node from load balancer
3. **Promotion**: Promote replica to primary (if DB failure)
4. **Recovery**: Repair or replace failed node
5. **Reintegration**: Add recovered node back to pool

## Testing

### DR Testing Schedule
| Test Type | Frequency | Description |
|-----------|-----------|-------------|
| Backup Restore | Weekly | Automated restore verification |
| Failover Test | Monthly | Simulated failover to standby |
| Full DR Test | Quarterly | Complete DR site activation |
| Tabletop Exercise | Annually | Scenario walkthrough with team |

### Test Procedures
1. **Backup Restore Test**
   - Restore latest backup to test environment
   - Verify data integrity
   - Measure restore time
   - Document results

2. **Failover Test**
   - Simulate primary failure
   - Verify automatic failover
   - Measure failover time
   - Verify data consistency

3. **Full DR Test**
   - Activate DR site
   - Redirect traffic
   - Verify full functionality
   - Measure recovery time
   - Document lessons learned

## Communication Plan

### Internal Communication
- **Incident Commander**: Designated lead for each incident
- **Status Updates**: Every 30 minutes during active incident
- **Channels**: Slack, email, phone tree

### External Communication
- **User Notification**: Status page updates
- **Customer Communication**: Email for extended outages
- **Regulatory Notification**: HIPAA breach notification if applicable

## Roles and Responsibilities

| Role | Responsibility |
|------|----------------|
| Incident Commander | Overall incident coordination |
| Technical Lead | Technical recovery decisions |
| Database Admin | Database recovery procedures |
| DevOps Engineer | Infrastructure recovery |
| Communications Lead | Stakeholder communication |
| Clinical Safety Officer | Clinical impact assessment |

## Maintenance

### Plan Review
- **Quarterly**: Review and update procedures
- **After incidents**: Incorporate lessons learned
- **After changes**: Update for infrastructure changes
- **Annually**: Full plan review and approval

### Training
- **New team members**: DR procedures training
- **Annual refresher**: DR procedures review
- **After major changes**: Updated procedures training

## Last Updated
2026-07-21
