# CareForge EHR - Testing Strategy

## Overview
This document describes the testing strategy for CareForge EHR, ensuring quality and reliability across all components.

## Testing Pyramid

```
        /\
       /  \      E2E Tests (10%)
      /____\
     /      \    Integration Tests (30%)
    /________\
   /          \  Unit Tests (60%)
  /____________\
```

## Unit Testing

### Framework
- **Test Runner**: Jest
- **Coverage Target**: 80% minimum
- **Mocking**: Jest mocks, ts-mockito

### Test File Naming
```
*.spec.ts - Unit tests
*.test.ts - Integration tests
*.e2e-spec.ts - End-to-end tests
```

### Example Unit Test
```typescript
describe('PatientService', () => {
  let service: PatientService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PatientService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get(PatientService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a patient', async () => {
      const dto = { firstName: 'John', lastName: 'Doe' };
      const expected = { id: 'uuid', ...dto };

      jest.spyOn(prisma.patient, 'create').mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(result).toEqual(expected);
      expect(prisma.patient.create).toHaveBeenCalledWith({ data: dto });
    });

    it('should throw error for duplicate MRN', async () => {
      jest.spyOn(prisma.patient, 'create').mockRejectedValue(new Error('Unique constraint'));

      await expect(service.create(dto)).rejects.toThrow();
    });
  });
});
```

### Coverage Requirements
| Component | Minimum Coverage |
|-----------|------------------|
| Services | 80% |
| Controllers | 70% |
| Utilities | 90% |
| Guards/Interceptors | 85% |

## Integration Testing

### Database Testing
- **Test Database**: Separate PostgreSQL instance
- **Migrations**: Run before test suite
- **Cleanup**: Truncate tables between tests
- **Seeding**: Test fixtures for common scenarios

### API Testing
```typescript
describe('PatientController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/patients (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'John', lastName: 'Doe' })
      .expect(201);

    expect(response.body.firstName).toBe('John');
  });

  it('/patients (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/patients')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

### External Service Mocking
- **FHIR Validator**: Mock FHIR validation responses
- **HL7 Parser**: Test with sample HL7 messages
- **X12 Parser**: Test with sample X12 transactions
- **Email Service**: Mock email delivery

## End-to-End Testing

### Framework
- **Browser Testing**: Playwright
- **API Testing**: Supertest
- **Test Data**: Seeded test database

### Test Scenarios
1. **Patient Registration Flow**
   - Create patient
   - Add demographics
   - Add insurance
   - Verify in patient list

2. **Clinical Documentation Flow**
   - Create encounter
   - Add vitals
   - Add diagnosis
   - Add note
   - Sign encounter

3. **Prescribing Flow**
   - Create prescription
   - Check drug interactions
   - Sign prescription
   - Transmit to pharmacy

4. **Billing Flow**
   - Create charge
   - Code charge
   - Review charge
   - Approve charge
   - Generate claim

### Running E2E Tests
```bash
# Start test environment
npm run test:e2e:setup

# Run tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

## Performance Testing

### Tools
- **Load Testing**: k6, Artillery
- **Stress Testing**: Gatling
- **Monitoring**: Prometheus, Grafana

### Test Scenarios
| Scenario | Users | Duration | Target |
|----------|-------|----------|--------|
| Normal Load | 100 | 30 min | < 200ms p95 |
| Peak Load | 500 | 15 min | < 500ms p95 |
| Stress Test | 1000 | 10 min | < 1000ms p95 |
| Soak Test | 100 | 4 hours | No memory leak |

### Performance Targets
| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 200ms |
| Database Query Time (p95) | < 50ms |
| Page Load Time | < 2s |
| Concurrent Users | 1000+ |
| Uptime | 99.9% |

## Security Testing

### Automated Scanning
- **OWASP ZAP**: Automated vulnerability scanning
- **npm audit**: Dependency vulnerability scanning
- **Snyk**: Continuous security monitoring

### Manual Testing
- **Penetration Testing**: Annual third-party assessment
- **Code Review**: Security-focused code reviews
- **Threat Modeling**: Quarterly threat model updates

### Test Cases
- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Authentication Bypass
- Authorization Bypass
- Session Hijacking
- Data Exposure

## Accessibility Testing

### Automated
- **axe-core**: WCAG 2.1 automated checks
- **Lighthouse**: Accessibility scoring
- **WAVE**: Visual accessibility evaluation

### Manual
- **Screen Reader Testing**: NVDA, JAWS, VoiceOver
- **Keyboard Navigation**: Full keyboard testing
- **Color Contrast**: WCAG AA contrast ratios
- **Zoom Testing**: 200% zoom verification

## Test Data Management

### Test Fixtures
```typescript
// fixtures/patient.fixture.ts
export const testPatient = {
  firstName: 'Test',
  lastName: 'Patient',
  dateOfBirth: '1980-01-15',
  gender: 'male',
  medicalRecordNumber: 'TEST001',
};

// fixtures/encounter.fixture.ts
export const testEncounter = {
  type: 'office',
  chiefComplaint: 'Test complaint',
  startTime: new Date().toISOString(),
};
```

### Data Factory
```typescript
// factories/patient.factory.ts
export class PatientFactory {
  static build(overrides = {}) {
    return {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      dateOfBirth: faker.date.past(50).toISOString().split('T')[0],
      gender: faker.helpers.arrayElement(['male', 'female']),
      ...overrides,
    };
  }

  static async create(overrides = {}) {
    const data = this.build(overrides);
    return prisma.patient.create({ data });
  }
}
```

## CI/CD Integration

### Pipeline Stages
```yaml
stages:
  - lint
  - unit-test
  - integration-test
  - e2e-test
  - security-scan
  - performance-test
  - deploy
```

### Test Commands
```bash
# Lint
npm run lint

# Unit tests with coverage
npm run test:cov

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Security scan
npm run security:scan
```

## Test Reporting

### Coverage Reports
- **Format**: HTML, LCOV, JSON
- **Location**: coverage/
- **CI Integration**: Codecov, Coveralls

### Test Results
- **Format**: JUnit XML
- **Location**: test-results/
- **CI Integration**: TestRail, Xray

## Quality Gates

### Merge Requirements
- [ ] All unit tests pass
- [ ] Coverage >= 80%
- [ ] No linting errors
- [ ] Security scan passes
- [ ] E2E tests pass (critical paths)

### Release Requirements
- [ ] All tests pass
- [ ] Performance targets met
- [ ] Security scan clean
- [ ] Accessibility audit passed
- [ ] Documentation updated

## Last Updated
2026-07-21
