# License and Provenance

> **Last updated**: 2026-07-21

## Project License

CareForge is released under the **MIT License**.

## Clean-Room Statement

This codebase was written as a new implementation. It was NOT copied from OpenEMR or any other GPL-licensed EHR system. The architecture, code structure, and implementation are original work.

However, the following requires verification:

- [ ] No source code was adapted from GPL/AGPL projects
- [ ] No OpenEMR PHP code was translated to TypeScript
- [ ] All algorithm implementations (HL7 parsing, FHIR mapping, X12 generation) are original or derived from publicly available specifications
- [ ] No proprietary code was included without license

## Dependency Licenses

All runtime dependencies must be verified for license compatibility with MIT.

### Permitted Licenses
- MIT
- Apache-2.0
- BSD-2-Clause / BSD-3-Clause
- ISC
- 0BSD

### Requires Review
- LGPL (dynamic linking only)
- MPL-2.0 (file-level copyleft)

### Prohibited
- GPL-3.0 / AGPL-3.0 (unless entire project relicensed)
- SSPL
- BUSL
- Proprietary / commercial-only

### Key Dependencies to Verify

| Package | License | Status |
|---------|---------|--------|
| @nestjs/* | MIT | ✓ Compatible |
| prisma / @prisma/client | Apache-2.0 | ✓ Compatible |
| passport / passport-jwt | MIT | ✓ Compatible |
| bcrypt | MIT (with OpenSSL exception) | ✓ Compatible |
| bull | MIT | ✓ Compatible |
| ioredis | MIT | ✓ Compatible |
| helmet | MIT | ✓ Compatible |
| nodemailer | MIT (v6+) | ✓ Compatible |
| socket.io | MIT | ✓ Compatible |
| next | MIT | ✓ Compatible |
| react | MIT | ✓ Compatible |
| tailwindcss | MIT | ✓ Compatible |
| zod | MIT | ✓ Compatible |
| class-validator | MIT | ✓ Compatible |

## Clinical Data Provenance

| Data Source | License | Status |
|-------------|---------|--------|
| ICD-10-CM | Public domain (US govt) | Not included — must be loaded |
| CPT | AMA proprietary | NOT licensed — cannot distribute |
| SNOMED CT | National Library of Medicine | NOT licensed — requires UMLS license |
| LOINC | Regenstrief (free with registration) | NOT registered |
| RxNorm | Public domain (US govt) | Not included — must be loaded |
| CVX (vaccines) | Public domain (CDC) | Not included |
| Drug interactions | Hard-coded sample | NOT a licensed source — must replace |
| Growth chart LMS | Placeholder values | NOT validated WHO/CDC data |

## Standards Specifications

| Standard | Source | License |
|----------|--------|---------|
| HL7 v2.x | HL7 International | Specification licensed; implementation original |
| FHIR R4 | HL7 International | CC0 (spec); implementation original |
| C-CDA R2.1 | HL7 International | Specification licensed; implementation original |
| X12 837P | X12.org | Specification licensed; implementation original |
| NCPDP SCRIPT | NCPDP | Specification licensed; implementation original |

## Container Base Images

| Image | License | Status |
|-------|---------|--------|
| node:20-alpine | MIT (Node) + Alpine | ✓ Compatible |
| postgres:16 | PostgreSQL License | ✓ Compatible |
| redis:7-alpine | BSD-3-Clause | ✓ Compatible |

## Actions Required

1. Run `npx license-checker --production` and verify all transitive dependencies
2. Generate and commit SBOM (CycloneDX format)
3. Obtain UMLS license for SNOMED CT if needed
4. Register for LOINC if needed
5. Replace hard-coded drug interaction data with licensed source
6. Replace placeholder growth chart data with validated WHO/CDC data
7. Verify no CPT code distribution without AMA license
