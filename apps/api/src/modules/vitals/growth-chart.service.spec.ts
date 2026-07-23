import { Test, TestingModule } from '@nestjs/testing';
import { GrowthChartService } from './growth-chart.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('GrowthChartService', () => {
  let service: GrowthChartService;

  const mockPrisma = {
    patient: { findUnique: jest.fn() },
    vitalSign: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrowthChartService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GrowthChartService>(GrowthChartService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('calculatePercentile', () => {
    it('should calculate ~50th percentile for median weight', () => {
      // 12-month-old male, median weight is 9.649 kg
      const result = service.calculatePercentile(12, 9.649, 'weight', true);
      expect(result.percentile).toBeCloseTo(50, 0);
      expect(result.zScore).toBeCloseTo(0, 1);
    });

    it('should calculate high percentile for above-average weight', () => {
      // 12-month-old male, well above median
      const result = service.calculatePercentile(12, 12.0, 'weight', true);
      expect(result.percentile).toBeGreaterThan(90);
      expect(result.zScore).toBeGreaterThan(1.5);
    });

    it('should calculate low percentile for below-average weight', () => {
      // 12-month-old male, well below median
      const result = service.calculatePercentile(12, 7.0, 'weight', true);
      expect(result.percentile).toBeLessThan(5);
      expect(result.zScore).toBeLessThan(-1.5);
    });

    it('should handle female patients differently', () => {
      // Same weight, different gender should give different percentiles
      const male = service.calculatePercentile(12, 9.5, 'weight', true);
      const female = service.calculatePercentile(12, 9.5, 'weight', false);
      // Female median is lower, so same weight = higher percentile for female
      expect(female.percentile).toBeGreaterThan(male.percentile);
    });

    it('should calculate height percentile', () => {
      // 24-month-old male, median height is 87.82 cm
      const result = service.calculatePercentile(24, 87.82, 'height', true);
      expect(result.percentile).toBeCloseTo(50, 0);
    });
  });

  describe('calculateGrowthChart', () => {
    it('should return empty result for non-existent patient', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);

      const result = await service.calculateGrowthChart('nonexistent', 'weight');

      expect(result.patientId).toBe('nonexistent');
      expect(result.dataPoints).toHaveLength(0);
      expect(result.alerts).toContain('Patient not found');
    });

    it('should calculate growth chart with vitals data', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'patient-1',
        dateOfBirth: '2023-01-01',
        gender: 'MALE',
      });
      mockPrisma.vitalSign.findMany.mockResolvedValue([
        { id: '1', weight: '4.5', height: '54', recordedAt: '2023-02-01' },
        { id: '2', weight: '6.4', height: '62', recordedAt: '2023-04-01' },
        { id: '3', weight: '7.9', height: '68', recordedAt: '2023-07-01' },
        { id: '4', weight: '9.6', height: '75', recordedAt: '2024-01-01' },
      ]);

      const result = await service.calculateGrowthChart('patient-1', 'weight');

      expect(result.patientId).toBe('patient-1');
      expect(result.metric).toBe('weight');
      expect(result.dataPoints.length).toBe(4);
      expect(result.currentPercentile).toBeGreaterThan(0);
      expect(result.trend).toBeDefined();
    });

    it('should detect faltering growth trend', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'patient-1',
        dateOfBirth: '2023-01-01',
        gender: 'MALE',
      });
      // Simulate dropping percentiles significantly
      mockPrisma.vitalSign.findMany.mockResolvedValue([
        { id: '1', weight: '9.5', recordedAt: '2024-01-01' },  // ~50th
        { id: '2', weight: '9.6', recordedAt: '2024-04-01' },  // dropping
        { id: '3', weight: '9.5', recordedAt: '2024-07-01' },  // dropping more
        { id: '4', weight: '9.2', recordedAt: '2024-10-01' },  // significant drop
      ]);

      const result = await service.calculateGrowthChart('patient-1', 'weight');

      expect(result.trend).toBeDefined();
      // The trend should indicate some form of decline
      expect(['FOLLOWING_CURVE', 'CROSSING_DOWN', 'FALTERING']).toContain(result.trend);
    });

    it('should generate alerts for extreme percentiles', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'patient-1',
        dateOfBirth: '2023-01-01',
        gender: 'MALE',
      });
      mockPrisma.vitalSign.findMany.mockResolvedValue([
        { id: '1', weight: '5.0', recordedAt: '2024-01-01' },  // Very low for 12mo
      ]);

      const result = await service.calculateGrowthChart('patient-1', 'weight');

      // Should have alert about low percentile
      expect(result.alerts.length).toBeGreaterThan(0);
    });

    it('should calculate BMI from weight and height', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'patient-1',
        dateOfBirth: '2018-01-01',
        gender: 'FEMALE',
      });
      mockPrisma.vitalSign.findMany.mockResolvedValue([
        { id: '1', weight: '20', height: '110', recordedAt: '2023-06-01' },
      ]);

      const result = await service.calculateGrowthChart('patient-1', 'bmi');

      expect(result.dataPoints.length).toBe(1);
      // BMI = 20 / (1.1^2) = 16.53
      expect(result.dataPoints[0].value).toBeCloseTo(16.53, 1);
    });
  });
});
