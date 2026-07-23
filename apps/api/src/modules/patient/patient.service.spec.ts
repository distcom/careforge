import { Test, TestingModule } from '@nestjs/testing';
import { PatientService } from './patient.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('PatientService', () => {
  let service: PatientService;
  let prisma: any;

  const mockPrisma = {
    patient: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return paginated patients', async () => {
      const mockPatients = [
        { id: '1', firstName: 'John', lastName: 'Doe', dateOfBirth: '1990-01-01', gender: 'MALE', status: 'ACTIVE' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', dateOfBirth: '1985-05-15', gender: 'FEMALE', status: 'ACTIVE' },
      ];
      mockPrisma.patient.findMany.mockResolvedValue(mockPatients);
      mockPrisma.patient.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(prisma.patient.findMany).toHaveBeenCalled();
    });

    it('should filter by search term', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([]);
      mockPrisma.patient.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10, search: 'Doe' });

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: expect.anything() }),
            ]),
          }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return a patient by id', async () => {
      const mockPatient = { id: '1', firstName: 'John', lastName: 'Doe' };
      mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

      const result = await service.findOne('1');

      expect(result).toEqual(mockPatient);
      expect(prisma.patient.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' } })
      );
    });

    it('should throw NotFoundException for missing patient', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a patient', async () => {
      const createDto = {
        firstName: 'New',
        lastName: 'Patient',
        dateOfBirth: '2000-01-01',
        gender: 'MALE',
      };
      const created = { id: '3', ...createDto, status: 'ACTIVE' };
      mockPrisma.patient.create.mockResolvedValue(created);

      const result = await service.create(createDto as any, 'user-1');

      expect(result.firstName).toBe('New');
      expect(prisma.patient.create).toHaveBeenCalled();
    });
  });
});
