import { Test, TestingModule } from '@nestjs/testing';
import { ReportExportService } from './report-export.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('ReportExportService', () => {
  let service: ReportExportService;

  const mockPrisma = {
    patient: { findMany: jest.fn(), count: jest.fn() },
    charge: { aggregate: jest.fn(), findMany: jest.fn() },
    payment: { aggregate: jest.fn() },
    claim: { groupBy: jest.fn() },
    encounter: { findMany: jest.fn() },
    immunization: { findMany: jest.fn() },
    labOrder: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportExportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportExportService>(ReportExportService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateCSV', () => {
    it('should generate valid CSV with headers and rows', () => {
      const csv = service.generateCSV(
        ['Name', 'Age', 'City'],
        [['John', '30', 'New York'], ['Jane', '25', 'Los Angeles']],
      );

      const lines = csv.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('Name,Age,City');
      expect(lines[1]).toBe('John,30,New York');
      expect(lines[2]).toBe('Jane,25,Los Angeles');
    });

    it('should escape values containing commas', () => {
      const csv = service.generateCSV(
        ['Name', 'Address'],
        [['John', '123 Main St, Apt 4, Springfield']],
      );

      expect(csv).toContain('"123 Main St, Apt 4, Springfield"');
    });

    it('should escape values containing quotes', () => {
      const csv = service.generateCSV(
        ['Name', 'Note'],
        [['John', 'Said "hello"']],
      );

      expect(csv).toContain('"Said ""hello"""');
    });

    it('should handle null and undefined values', () => {
      const csv = service.generateCSV(
        ['A', 'B', 'C'],
        [[null, undefined, 'value']],
      );

      expect(csv).toContain(',,value');
    });
  });

  describe('generatePDF', () => {
    it('should generate valid PDF buffer', () => {
      const pdf = service.generatePDF('Test Report', [
        { heading: 'Section 1', content: [['Row 1', 'Data'], ['Row 2', 'Data']] },
      ]);

      expect(Buffer.isBuffer(pdf)).toBe(true);
      const content = pdf.toString('utf-8');
      expect(content).toContain('%PDF-1.4');
      expect(content).toContain('Test Report');
      expect(content).toContain('%%EOF');
    });

    it('should include section headings', () => {
      const pdf = service.generatePDF('Report', [
        { heading: 'Financial Summary', content: [['Revenue', '$100,000']] },
      ]);

      const content = pdf.toString('utf-8');
      expect(content).toContain('Financial Summary');
    });
  });

  describe('exportPatientRoster', () => {
    it('should export CSV format', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([
        {
          medicalRecordNumber: 'MRN001',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          gender: 'MALE',
          phone: '555-1234',
          email: 'john@test.com',
          status: 'ACTIVE',
          createdAt: '2024-01-01',
        },
      ]);

      const result = await service.exportPatientRoster({ format: 'CSV' });

      expect(result.filename).toContain('patient-roster');
      expect(result.filename).toContain('.csv');
      expect(result.mimeType).toBe('text/csv');
      expect(result.content).toContain('MRN001');
      expect(result.content).toContain('Doe');
    });

    it('should export PDF format', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([]);

      const result = await service.exportPatientRoster({ format: 'PDF' });

      expect(result.filename).toContain('.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(Buffer.isBuffer(result.content)).toBe(true);
    });
  });

  describe('exportFinancialSummary', () => {
    it('should calculate financial totals', async () => {
      mockPrisma.charge.aggregate.mockResolvedValue({ _sum: { fee: 50000 }, _count: 100 });
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 35000 }, _count: 80 });
      mockPrisma.claim.groupBy.mockResolvedValue([
        { status: 'SUBMITTED', _count: 20, _sum: { totalAmount: 15000 } },
      ]);

      const result = await service.exportFinancialSummary({ format: 'CSV' });

      expect(result.content).toContain('50000.00');
      expect(result.content).toContain('35000.00');
      expect(result.content).toContain('15000.00');
    });
  });
});
