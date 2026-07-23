import { Test, TestingModule } from '@nestjs/testing';
import { EprescribingService } from './eprescribing.service';
import { DrugInteractionService } from './drug-interaction.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('EprescribingService', () => {
  let service: EprescribingService;

  const mockPrisma = {
    medication: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };

  const mockEventEmitter = { emit: jest.fn() };
  const mockDrugInteraction = {
    checkInteractions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EprescribingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: DrugInteractionService, useValue: mockDrugInteraction },
      ],
    }).compile();

    service = module.get<EprescribingService>(EprescribingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createPrescription', () => {
    it('should create prescription with no safety alerts', async () => {
      mockDrugInteraction.checkInteractions.mockResolvedValue({
        hasInteractions: false,
        interactions: [],
        warnings: [],
        allergies: [],
      });
      mockPrisma.medication.create.mockResolvedValue({
        id: 'rx-1',
        name: 'Metformin',
        status: 'DRAFT',
      });

      const result = await service.createPrescription({
        patientId: 'patient-1',
        medicationName: 'Metformin',
        dosage: '500mg',
        frequency: 'twice daily',
        route: 'ORAL',
        quantity: 60,
        refills: 3,
        prescriberId: 'provider-1',
        isControlled: false,
      });

      expect(result.prescriptionId).toBe('rx-1');
      expect(result.status).toBe('DRAFT');
      expect(result.requiresOverride).toBe(false);
      expect(result.interactionWarnings).toHaveLength(0);
    });

    it('should flag prescription with contraindication', async () => {
      mockDrugInteraction.checkInteractions.mockResolvedValue({
        hasInteractions: true,
        interactions: [{
          severity: 'CONTRAINDICATED',
          drugA: 'Simvastatin',
          drugB: 'Clarithromycin',
          description: 'Risk of rhabdomyolysis',
          recommendation: 'Use alternative',
        }],
        warnings: [],
        allergies: [],
      });
      mockPrisma.medication.create.mockResolvedValue({
        id: 'rx-2',
        name: 'Clarithromycin',
        status: 'FLAGGED',
      });

      const result = await service.createPrescription({
        patientId: 'patient-1',
        medicationName: 'Clarithromycin',
        dosage: '500mg',
        frequency: 'twice daily',
        route: 'ORAL',
        quantity: 20,
        refills: 0,
        prescriberId: 'provider-1',
        isControlled: false,
      });

      expect(result.status).toBe('FLAGGED');
      expect(result.requiresOverride).toBe(true);
      expect(result.interactionWarnings).toHaveLength(1);
    });

    it('should flag prescription with allergy alert', async () => {
      mockDrugInteraction.checkInteractions.mockResolvedValue({
        hasInteractions: true,
        interactions: [],
        warnings: [],
        allergies: ['ALLERGY ALERT: Patient has documented allergy to "Penicillin"'],
      });
      mockPrisma.medication.create.mockResolvedValue({
        id: 'rx-3',
        name: 'Amoxicillin',
        status: 'FLAGGED',
      });

      const result = await service.createPrescription({
        patientId: 'patient-1',
        medicationName: 'Amoxicillin',
        dosage: '500mg',
        frequency: 'three times daily',
        route: 'ORAL',
        quantity: 30,
        refills: 0,
        prescriberId: 'provider-1',
        isControlled: false,
      });

      expect(result.requiresOverride).toBe(true);
      expect(result.allergyAlerts).toHaveLength(1);
    });
  });

  describe('overrideSafetyWarnings', () => {
    it('should override flagged prescription', async () => {
      mockPrisma.medication.findUnique.mockResolvedValue({
        id: 'rx-2',
        name: 'Clarithromycin',
        status: 'FLAGGED',
        notes: '',
      });
      mockPrisma.medication.update.mockResolvedValue({
        id: 'rx-2',
        status: 'DRAFT',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.overrideSafetyWarnings('rx-2', 'provider-1', 'Benefits outweigh risks');

      expect(mockPrisma.medication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rx-2' },
          data: expect.objectContaining({ status: 'DRAFT' }),
        }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should reject override for non-flagged prescription', async () => {
      mockPrisma.medication.findUnique.mockResolvedValue({
        id: 'rx-1',
        status: 'DRAFT',
      });

      await expect(
        service.overrideSafetyWarnings('rx-1', 'provider-1', 'reason'),
      ).rejects.toThrow('not in FLAGGED state');
    });
  });

  describe('transmitPrescription', () => {
    it('should transmit prescription and generate NCPDP message', async () => {
      mockPrisma.medication.findUnique.mockResolvedValue({
        id: 'rx-1',
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'twice daily',
        route: 'ORAL',
        quantity: 60,
        refills: 3,
        status: 'DRAFT',
        patientId: 'patient-1',
        notes: '',
        patient: { firstName: 'John', lastName: 'Doe', dateOfBirth: '1990-01-01' },
      });
      mockPrisma.medication.update.mockResolvedValue({
        id: 'rx-1',
        status: 'TRANSMITTED',
      });

      const result = await service.transmitPrescription('rx-1', 'NCPDP123', 'provider-1');

      expect(result.status).toBe('TRANSMITTED');
      expect(result.ncpdpMessage).toContain('NewRx');
      expect(result.ncpdpMessage).toContain('NCPDP123');
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should reject transmission of already transmitted prescription', async () => {
      mockPrisma.medication.findUnique.mockResolvedValue({
        id: 'rx-1',
        status: 'TRANSMITTED',
      });

      await expect(
        service.transmitPrescription('rx-1', 'NCPDP123', 'provider-1'),
      ).rejects.toThrow('Cannot transmit');
    });
  });

  describe('reconcileMedications', () => {
    it('should reconcile medications correctly', async () => {
      mockPrisma.medication.findMany.mockResolvedValue([
        { id: 'm1', name: 'Metformin', status: 'ACTIVE' },
        { id: 'm2', name: 'Lisinopril', status: 'ACTIVE' },
        { id: 'm3', name: 'Aspirin', status: 'ACTIVE' },
      ]);
      mockPrisma.medication.update.mockResolvedValue({});
      mockPrisma.medication.create.mockResolvedValue({ id: 'm4' });

      const result = await service.reconcileMedications('patient-1', [
        { name: 'Metformin', action: 'CONTINUE' },
        { name: 'Lisinopril', dosage: '20mg', action: 'MODIFY' },
        { name: 'Aspirin', action: 'DISCONTINUE' },
        { name: 'Atorvastatin', dosage: '40mg', action: 'ADD' },
      ]);

      expect(result.continued).toContain('Metformin');
      expect(result.modified).toContain('Lisinopril');
      expect(result.discontinued).toContain('Aspirin');
      expect(result.added).toContain('Atorvastatin');
      expect(result.unaccounted).toHaveLength(0);
    });
  });
});
