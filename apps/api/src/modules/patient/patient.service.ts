import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreatePatientDto, UpdatePatientDto, PatientQueryDto, DuplicateCheckDto } from './dto/patient.dto';

export interface DuplicateMatch {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  ssn?: string | null;
  email?: string | null;
  phone?: string | null;
  matchScore: number;
  matchReasons: string[];
}

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

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

  async create(dto: CreatePatientDto, registeredById?: string) {
    // Check for potential duplicates before creating
    const duplicates = await this.checkDuplicates({
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth,
      ssn: dto.ssn,
      email: dto.email,
    });

    if (duplicates.length > 0 && duplicates[0].matchScore >= 90) {
      throw new ConflictException({
        message: 'Potential duplicate patient found',
        duplicates: duplicates.map(d => ({
          id: d.patientId,
          name: `${d.firstName} ${d.lastName}`,
          dateOfBirth: d.dateOfBirth,
          matchScore: d.matchScore,
          matchReasons: d.matchReasons,
        })),
      });
    }

    const mrn = dto.medicalRecordNumber || await this.generateMRN();

    const patient = await this.prisma.patient.create({
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
        // Guarantor information
        guarantorFirstName: dto.guarantorFirstName,
        guarantorLastName: dto.guarantorLastName,
        guarantorRelationship: dto.guarantorRelationship,
        guarantorPhone: dto.guarantorPhone,
        guarantorEmail: dto.guarantorEmail,
        guarantorAddress: dto.guarantorAddress,
        guarantorCity: dto.guarantorCity,
        guarantorState: dto.guarantorState,
        guarantorZipCode: dto.guarantorZipCode,
        guarantorEmployer: dto.guarantorEmployer,
        // Registration metadata
        registeredById,
        registeredAt: new Date(),
        registrationFacilityId: dto.facilityId,
        // Nested relations
        contacts: dto.contacts?.length
          ? { create: dto.contacts }
          : undefined,
        insurances: dto.insurances?.length
          ? {
              create: dto.insurances.map(ins => ({
                companyName: ins.companyName,
                planName: ins.planName,
                policyNumber: ins.policyNumber,
                groupNumber: ins.groupNumber,
                subscriberName: ins.subscriberName,
                subscriberDob: ins.subscriberDob ? new Date(ins.subscriberDob) : undefined,
                relationship: ins.relationship,
                priority: ins.priority || 1,
                effectiveDate: ins.effectiveDate ? new Date(ins.effectiveDate) : undefined,
                terminationDate: ins.terminationDate ? new Date(ins.terminationDate) : undefined,
              })),
            }
          : undefined,
        consents: dto.consents?.length
          ? {
              create: dto.consents.map(c => ({
                type: c.type,
                status: c.acknowledged ? 'SIGNED' : 'PENDING',
                signedAt: c.signedAt ? new Date(c.signedAt) : c.acknowledged ? new Date() : undefined,
              })),
            }
          : undefined,
      },
      include: { contacts: true, insurances: true, consents: true },
    });

    // Audit log for patient registration
    await this.auditService.log({
      action: 'PATIENT_REGISTERED',
      entityType: 'Patient',
      entityId: patient.id,
      userId: registeredById,
      details: {
        mrn: patient.medicalRecordNumber,
        facilityId: dto.facilityId,
        hasInsurance: !!dto.insurances?.length,
        hasConsents: !!dto.consents?.length,
        duplicateWarnings: duplicates.length,
      },
    });

    this.logger.log(`Patient registered: ${patient.id} (MRN: ${mrn}) by user ${registeredById}`);

    return patient;
  }

  private async generateMRN(): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MRN-${timestamp}-${random}`;
  }

  async checkDuplicates(dto: DuplicateCheckDto): Promise<DuplicateMatch[]> {
    const dob = new Date(dto.dateOfBirth);
    const dobStart = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
    const dobEnd = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate() + 1);

    // Find potential matches by name + DOB, SSN, or email
    const candidates = await this.prisma.patient.findMany({
      where: {
        deletedAt: null,
        OR: [
          // Exact SSN match (highest confidence)
          ...(dto.ssn ? [{ ssn: dto.ssn }] : []),
          // Exact email match
          ...(dto.email ? [{ email: { equals: dto.email, mode: 'insensitive' } }] : []),
          // Name + DOB match
          {
            firstName: { equals: dto.firstName, mode: 'insensitive' },
            lastName: { equals: dto.lastName, mode: 'insensitive' },
            dateOfBirth: { gte: dobStart, lt: dobEnd },
          },
          // Phonetic name match (same first initial + last name + DOB)
          {
            firstName: { startsWith: dto.firstName.charAt(0), mode: 'insensitive' },
            lastName: { equals: dto.lastName, mode: 'insensitive' },
            dateOfBirth: { gte: dobStart, lt: dobEnd },
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        ssn: true,
        email: true,
        phone: true,
        medicalRecordNumber: true,
      },
      take: 10,
    });

    // Score each candidate
    return candidates
      .map(candidate => {
        const matchReasons: string[] = [];
        let score = 0;

        // SSN exact match: 50 points
        if (dto.ssn && candidate.ssn === dto.ssn) {
          score += 50;
          matchReasons.push('SSN match');
        }

        // Email exact match: 40 points
        if (dto.email && candidate.email?.toLowerCase() === dto.email.toLowerCase()) {
          score += 40;
          matchReasons.push('Email match');
        }

        // Name match: up to 30 points
        const firstNameMatch = candidate.firstName.toLowerCase() === dto.firstName.toLowerCase();
        const lastNameMatch = candidate.lastName.toLowerCase() === dto.lastName.toLowerCase();
        if (firstNameMatch && lastNameMatch) {
          score += 30;
          matchReasons.push('Full name match');
        } else if (lastNameMatch) {
          score += 15;
          matchReasons.push('Last name match');
        }

        // DOB match: 20 points
        const candidateDob = new Date(candidate.dateOfBirth);
        if (
          candidateDob.getFullYear() === dob.getFullYear() &&
          candidateDob.getMonth() === dob.getMonth() &&
          candidateDob.getDate() === dob.getDate()
        ) {
          score += 20;
          matchReasons.push('Date of birth match');
        }

        return {
          patientId: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          dateOfBirth: candidate.dateOfBirth,
          ssn: candidate.ssn,
          email: candidate.email,
          phone: candidate.phone,
          matchScore: Math.min(score, 100),
          matchReasons,
        };
      })
      .filter(m => m.matchScore >= 30) // Only return meaningful matches
      .sort((a, b) => b.matchScore - a.matchScore);
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
