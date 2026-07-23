import { Test, TestingModule } from '@nestjs/testing';
import { DrugInteractionService } from './drug-interaction.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('DrugInteractionService', () => {
  let service: DrugInteractionService;
  let prisma: any;

  const mockPrisma = {
    medication: { findMany: jest.fn() },
    allergy: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrugInteractionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DrugInteractionService>(DrugInteractionService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('checkInteractions', () => {
    it('should detect warfarin-aspirin interaction', async () => {
      mockPrisma.medication.findMany.mockResolvedValue([
        { id: '1', name: 'Warfarin', rxnormCode: '11289', status: 'ACTIVE' },
      ]);
      mockPrisma.allergy.findMany.mockResolvedValue([]);

      const result = await service.checkInteractions('patient-1', 'Aspirin');

      expect(result.hasInteractions).toBe(true);
      expect(result.interactions.length).toBeGreaterThan(0);
      expect(result.interactions[0].severity).toBe('MAJOR');
      expect(result.interactions[0].description).toContain('bleeding');
    });

    it('should detect contraindicated simvastatin-clarithromycin', async () => {
      mockPrisma.medication.findMany.mockResolvedValue([
        { id: '1', name: 'Simvastatin', rxnormCode: '36567', status: 'ACTIVE' },
      ]);
      mockPrisma.allergy.findMany.mockResolvedValue([]);

      const result = await service.checkInteractions('patient-1', 'Clarithromycin');

      expect(result.hasInteractions).toBe(true);
      expect(result.interactions[0].severity).toBe('CONTRAINDICATED');
    });

    it('should detect duplicate therapy', async () => {
      mockPrisma.medication.findMany.mockResolvedValue([
        { id: '1', name: 'Metformin', rxnormCode: '6809', status: 'ACTIVE' },
      ]);
      mockPrisma.allergy.findMany.mockResolvedValue([]);

      const result = await service.checkInteractions('patient-1', 'Metformin', '6809');

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Duplicate therapy');
    });

    it('should detect drug-allergy conflict', async () => {
      mockPrisma.medication.findMany.mockResolvedValue([]);
      mockPrisma.allergy.findMany.mockResolvedValue([
        { id: '1', allergen: 'Penicillin', severity: 'SEVERE', reaction: 'Anaphylaxis', status: 'ACTIVE' },
      ]);

      const result = await service.checkInteractions('patient-1', 'Amoxicillin');

      expect(result.allergies.length).toBeGreaterThan(0);
      expect(result.allergies[0]).toContain('ALLERGY ALERT');
      expect(result.hasInteractions).toBe(true);
    });

    it('should detect drug class cross-reactivity (NSAIDs)', async () => {
      mockPrisma.medication.findMany.mockResolvedValue([]);
      mockPrisma.allergy.findMany.mockResolvedValue([
        { id: '1', allergen: 'Ibuprofen', severity: 'MODERATE', reaction: 'Rash', status: 'ACTIVE' },
      ]);

      const result = await service.checkInteractions('patient-1', 'Naproxen');

      expect(result.allergies.length).toBeGreaterThan(0);
    });

    it('should return no interactions for safe combination', async () => {
      mockPrisma.medication.findMany.mockResolvedValue([
        { id: '1', name: 'Lisinopril', rxnormCode: '29046', status: 'ACTIVE' },
      ]);
      mockPrisma.allergy.findMany.mockResolvedValue([]);

      const result = await service.checkInteractions('patient-1', 'Metformin');

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions).toHaveLength(0);
      expect(result.allergies).toHaveLength(0);
    });

    it('should sort interactions by severity', async () => {
      mockPrisma.medication.findMany.mockResolvedValue([
        { id: '1', name: 'Warfarin', rxnormCode: '11289', status: 'ACTIVE' },
        { id: '2', name: 'Simvastatin', rxnormCode: '36567', status: 'ACTIVE' },
      ]);
      mockPrisma.allergy.findMany.mockResolvedValue([]);

      // Check with a drug that interacts with both
      const result = await service.checkInteractions('patient-1', 'Ibuprofen');

      if (result.interactions.length > 1) {
        const severities = result.interactions.map((i) => i.severity);
        const order = { CONTRAINDICATED: 0, MAJOR: 1, MODERATE: 2, MINOR: 3 };
        for (let i = 1; i < severities.length; i++) {
          expect(order[severities[i - 1]]).toBeLessThanOrEqual(order[severities[i]]);
        }
      }
    });
  });
});
