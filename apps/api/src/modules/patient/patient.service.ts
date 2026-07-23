import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreatePatientDto, UpdatePatientDto, PatientQueryDto } from './dto/patient.dto';

@Injectable()
export class PatientService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PatientQueryDto): Promise<PaginatedResult<any>> {
    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { medicalRecordNumber: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.facilityId) where.facilityId = query.facilityId;
    if (query.gender) where.gender = query.gender;
    if (query.dateFrom || query.dateTo) {
      where.dateOfBirth = {};
      if (query.dateFrom) where.dateOfBirth.gte = new Date(query.dateFrom);
      if (query.dateTo) where.dateOfBirth.lte = new Date(query.dateTo);
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: {
          facility: { select: { id: true, name: true } },
          _count: { select: { encounters: true, appointments: true } },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return new PaginatedResult(patients, total, query.page, query.limit);
  }

  async findById(id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: {
        facility: { select: { id: true, name: true } },
        contacts: true,
        consents: true,
        insurances: { include: { insurancePlan: { include: { company: true } } } },
        conditions: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10 },
        allergies: { where: { deletedAt: null } },
        medications: { where: { deletedAt: null, status: 'ACTIVE' } },
      },
    });

    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async create(dto: CreatePatientDto) {
    const mrn = dto.medicalRecordNumber || `MRN-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.patient.create({
      data: {
        medicalRecordNumber: mrn,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        prefix: dto.prefix,
        suffix: dto.suffix,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        ssn: dto.ssn,
        email: dto.email,
        phone: dto.phone,
        mobilePhone: dto.mobilePhone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        country: dto.country,
        preferredLanguage: dto.preferredLanguage,
        maritalStatus: dto.maritalStatus,
        employmentStatus: dto.employmentStatus,
        race: dto.race,
        ethnicity: dto.ethnicity,
        status: dto.status || 'ACTIVE',
        facilityId: dto.facilityId,
        notes: dto.notes,
        contacts: dto.contacts?.length
          ? { create: dto.contacts }
          : undefined,
        insurances: dto.insurances?.length
          ? { create: dto.insurances }
          : undefined,
      },
      include: { contacts: true, insurances: true },
    });
  }

  async update(id: string, dto: UpdatePatientDto) {
    const patient = await this.prisma.patient.findFirst({ where: { id, deletedAt: null } });
    if (!patient) throw new NotFoundException('Patient not found');

    const data: any = { ...dto };
    if (dto.dateOfBirth) data.dateOfBirth = new Date(dto.dateOfBirth);

    return this.prisma.patient.update({
      where: { id },
      data,
      include: { contacts: true, insurances: true },
    });
  }

  async remove(id: string) {
    const patient = await this.prisma.patient.findFirst({ where: { id, deletedAt: null } });
    if (!patient) throw new NotFoundException('Patient not found');

    return this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }

  async merge(sourceId: string, targetId: string) {
    const [source, target] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: sourceId, deletedAt: null } }),
      this.prisma.patient.findFirst({ where: { id: targetId, deletedAt: null } }),
    ]);

    if (!source || !target) throw new NotFoundException('Patient not found');

    await this.prisma.$transaction([
      this.prisma.encounter.updateMany({ where: { patientId: sourceId }, data: { patientId: targetId } }),
      this.prisma.appointment.updateMany({ where: { patientId: sourceId }, data: { patientId: targetId } }),
      this.prisma.vitalSign.updateMany({ where: { patientId: sourceId }, data: { patientId: targetId } }),
      this.prisma.condition.updateMany({ where: { patientId: sourceId }, data: { patientId: targetId } }),
      this.prisma.medication.updateMany({ where: { patientId: sourceId }, data: { patientId: targetId } }),
      this.prisma.allergy.updateMany({ where: { patientId: sourceId }, data: { patientId: targetId } }),
      this.prisma.immunization.updateMany({ where: { patientId: sourceId }, data: { patientId: targetId } }),
      this.prisma.labOrder.updateMany({ where: { patientId: sourceId }, data: { patientId: targetId } }),
      this.prisma.patient.update({ where: { id: sourceId }, data: { deletedAt: new Date(), status: 'INACTIVE' } }),
    ]);

    return { message: `Patient ${sourceId} merged into ${targetId}` };
  }
}
