# Release and Upgrade Policy

> **Last updated**: 2026-07-21

## Versioning

Semantic Versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking schema changes, API contract changes
- **MINOR**: New features, backward-compatible
- **PATCH**: Bug fixes, security patches

## Release Process

1. Feature branch → PR → CI passes → code review → merge to main
2. Release candidate tagged `vX.Y.Z-rc.N`
3. RC deployed to staging, smoke-tested
4. Release tagged `vX.Y.Z`, changelog generated
5. Container images built and published
6. Deployment via rolling update (zero-downtime)

## Upgrade Requirements

Every release MUST include:
- [ ] Database migration files (Prisma migrate)
- [ ] Migration tested from previous version
- [ ] Rollback migration tested
- [ ] Changelog with breaking changes highlighted
- [ ] Updated API documentation
- [ ] CI green on release tag

## Rollback Policy

- Database migrations must be reversible OR have a documented forward-fix
- Container images retained for last 10 releases
- Rollback procedure: deploy previous image + run down migration
- Data migrations (not schema) require separate rollback scripts

## Current State

- No releases have been made
- No migration files generated (only schema.prisma)
- No changelog
- No container registry configured
- No staging environment
