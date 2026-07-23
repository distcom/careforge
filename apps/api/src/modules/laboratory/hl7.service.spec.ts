import { Test, TestingModule } from '@nestjs/testing';
import { Hl7Service } from './hl7.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('Hl7Service', () => {
  let service: Hl7Service;

  const mockPrisma = {
    patient: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    labOrder: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  };

  const mockEventEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Hl7Service,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<Hl7Service>(Hl7Service);
  });

  afterEach(() => jest.clearAllMocks());

  describe('parseMessage', () => {
    it('should parse a valid ORU message', () => {
      const raw = 'MSH|^~\\&|Lab|LabSys|CareForge|EHR|20240101120000||ORU^R01|CTRL123|P|2.5.1\rPID|1||MRN001||Doe^John||19900101|M\rOBR|1|||CBC^Complete Blood Count|||||||20240101100000\rOBX|1|NM|WBC^White Blood Count||7.5|10*3/uL|4.5-11.0|N||F';

      const result = service.parseMessage(raw);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message!.messageType).toBe('ORU');
      expect(result.message!.triggerEvent).toBe('R01');
      expect(result.message!.controlId).toBe('CTRL123');
      expect(result.message!.segments.has('PID')).toBe(true);
      expect(result.message!.segments.has('OBR')).toBe(true);
      expect(result.message!.segments.has('OBX')).toBe(true);
    });

    it('should reject empty message', () => {
      const result = service.parseMessage('');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty message');
    });

    it('should reject message not starting with MSH', () => {
      const result = service.parseMessage('PID|1||12345');
      expect(result.success).toBe(false);
      expect(result.error).toContain('MSH');
    });
  });

  describe('processMessage - ORU', () => {
    it('should process lab results for existing patient and order', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', firstName: 'John', lastName: 'Doe' });
      mockPrisma.labOrder.findFirst.mockResolvedValue({ id: 'lab-1', testCode: 'CBC', status: 'ORDERED' });
      mockPrisma.labOrder.update.mockResolvedValue({ id: 'lab-1', status: 'RESULTED' });

      const raw = 'MSH|^~\\&|Lab|LabSys|CareForge|EHR|20240101120000||ORU^R01|CTRL456|P|2.5.1\rPID|1||MRN001||Doe^John||19900101|M\rOBR|1|||CBC^Complete Blood Count|||||||20240101100000||||||F\rOBX|1|NM|WBC||7.5|10*3/uL|4.5-11.0|N||F';

      const result = await service.processMessage(raw);

      expect(result.acknowledgmentCode).toBe('AA');
      expect(mockPrisma.labOrder.update).toHaveBeenCalled();
    });

    it('should return AE for unknown patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      const raw = 'MSH|^~\\&|Lab|LabSys|CareForge|EHR|20240101120000||ORU^R01|CTRL789|P|2.5.1\rPID|1||UNKNOWN||Nobody^Test||19900101|M\rOBR|1|||CBC^Complete Blood Count';

      const result = await service.processMessage(raw);

      expect(result.acknowledgmentCode).toBe('AE');
      expect(result.text).toContain('Patient not found');
    });
  });

  describe('processMessage - ADT', () => {
    it('should create new patient from ADT^A01', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      mockPrisma.patient.create.mockResolvedValue({ id: 'new-patient', firstName: 'Jane', lastName: 'Smith' });

      const raw = 'MSH|^~\\&|ADT|HIS|CareForge|EHR|20240101120000||ADT^A01|CTRL101|P|2.5.1\rPID|1||MRN999||Smith^Jane||19850515|F|||123 Main St^^Springfield^IL^62701||555-1234||||||123-45-6789';

      const result = await service.processMessage(raw);

      expect(result.acknowledgmentCode).toBe('AA');
      expect(mockPrisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Smith',
            gender: 'FEMALE',
          }),
        }),
      );
    });

    it('should update existing patient from ADT^A08', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'existing-1', firstName: 'Jane', lastName: 'Smith' });
      mockPrisma.patient.update.mockResolvedValue({ id: 'existing-1' });

      const raw = 'MSH|^~\\&|ADT|HIS|CareForge|EHR|20240101120000||ADT^A08|CTRL102|P|2.5.1\rPID|1||MRN999||Smith^Jane||19850515|F|||456 Oak Ave^^Springfield^IL^62702||555-9999';

      const result = await service.processMessage(raw);

      expect(result.acknowledgmentCode).toBe('AA');
      expect(mockPrisma.patient.update).toHaveBeenCalled();
    });
  });

  describe('generateORMMessage', () => {
    it('should generate valid ORM^O01 message', () => {
      const message = service.generateORMMessage({
        patientId: 'MRN001',
        patientName: 'John Doe',
        patientDob: '1990-01-01',
        patientGender: 'MALE',
        testCode: 'CBC',
        testName: 'Complete Blood Count',
        priority: 'ROUTINE',
        orderId: 'ORD-001',
        providerName: 'Dr. Smith',
      });

      expect(message).toContain('MSH|');
      expect(message).toContain('ORM^O01');
      expect(message).toContain('PID|');
      expect(message).toContain('ORC|NW');
      expect(message).toContain('OBR|');
      expect(message).toContain('CBC^Complete Blood Count');
    });
  });
});
