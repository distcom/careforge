import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health Check (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('Auth endpoints', () => {
    it('POST /api/v1/auth/login should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'invalid@test.com', password: 'wrong' })
        .expect(401);
    });

    it('POST /api/v1/auth/register should validate input', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'bad' })
        .expect(400);
    });
  });

  describe('Protected endpoints', () => {
    it('GET /api/v1/patients should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/patients')
        .expect(401);
    });

    it('GET /api/v1/fhir/r4/metadata should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/fhir/r4/metadata')
        .expect(401);
    });
  });
});
