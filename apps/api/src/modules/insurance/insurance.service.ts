import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface AddPatientInsuranceDto {
  insurancePlanId?: string;
  companyName: string;
  planName?: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberName?: string;
  subscriberDob?: string;
  relationship?: string;
  priority?: number;
  effectiveDate?: string;
  terminationDate?: string;
  copayAmount?: number;
  coinsurancePercent?: number;
  deductibleAmount?: number;
  outOfPocketMax?: number;
  authRequired?: boolean;
  authPhoneNumber?: string;
  notes?: string;
}

export interface VerifyEligibilityDto {
  status: string; // VERIFIED, INELIGIBLE, PENDING
  notes?: string;
  copayAmount?: number;
  coinsurancePercent?: number;
  deductibleAmount?: number;
  deductibleMet?: number;
  outOfPocketMax?: number;
  outOfPocketMet?: number;
}

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findCompanies(query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where: any = { isActive: true };
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    const [companies, total] = await Promise.all([
      this.prisma.insuranceCompany.findMany({
        where, skip: query.skip, take: query.limit, orderBy: { name: 'asc' },
        include: { plans: { where: { isActive: true } } },
      }),
      this.prisma.insuranceCompany.count({ where }),
    ]);
    return new PaginatedResult(companies, total, query.page, query.limit);
  }

  async createCompany(dto: any, userId?: string) {
    const company = await this.prisma.insuranceCompany.create({ data: dto });

    await this.auditService.log({
      action: 'INSURANCE_COMPANY_CREATED',
      entityType: 'InsuranceCompany',
      entityId: company.id,
      userId,
      details: { name: dto.name, payerId: dto.payerId },
    });

    return company;
  }

  async getPatientInsurance(patientId: string) {
    return this.prisma.patientInsurance.findMany({
      where: { patientId, isActive: true },
      orderBy: { priority: 'asc' },
      include: {
        insurancePlan: { include: { company: true } },
        verifiedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async addPatientInsurance(patientId: string, dto: AddPatientInsuranceDto, userId?: string) {
    const insurance = await this.prisma.patientInsurance.create({
      data: {
        patientId,
        insurancePlanId: dto.insurancePlanId,
        companyName: dto.companyName,
        planName: dto.planName,
        policyNumber: dto.policyNumber,
        groupNumber: dto.groupNumber,
        subscriberName: dto.subscriberName,
        subscriberDob: dto.subscriberDob ? new Date(dto.subscriberDob) : null,
        relationship: dto.relationship,
        priority: dto.priority || 1,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : null,
        copayAmount: dto.copayAmount,
        coinsurancePercent: dto.coinsurancePercent,
        deductibleAmount: dto.deductibleAmount,
        outOfPocketMax: dto.outOfPocketMax,
        authRequired: dto.authRequired || false,
        authPhoneNumber: dto.authPhoneNumber,
        notes: dto.notes,
        eligibilityStatus: 'UNKNOWN',
      },
      include: { insurancePlan: { include: { company: true } } },
    });

    await this.auditService.log({
      action: 'PATIENT_INSURANCE_ADDED',
      entityType: 'PatientInsurance',
      entityId: insurance.id,
      userId,
      details: {
        patientId,
        companyName: dto.companyName,
        policyNumber: dto.policyNumber,
        priority: dto.priority,
      },
    });

    return insurance;
  }

  async updatePatientInsurance(id: string, dto: Partial<AddPatientInsuranceDto>, userId?: string) {
    const insurance = await this.prisma.patientInsurance.findUnique({ where: { id } });
    if (!insurance) throw new NotFoundException('Insurance record not found');

    const data: any = { ...dto };
    if (dto.subscriberDob) data.subscriberDob = new Date(dto.subscriberDob);
    if (dto.effectiveDate) data.effectiveDate = new Date(dto.effectiveDate);
    if (dto.terminationDate) data.terminationDate = new Date(dto.terminationDate);

    const updated = await this.prisma.patientInsurance.update({ where: { id }, data });

    await this.auditService.log({
      action: 'PATIENT_INSURANCE_UPDATED',
      entityType: 'PatientInsurance',
      entityId: id,
      userId,
      details: { patientId: insurance.patientId, companyName: insurance.companyName },
    });

    return updated;
  }

  async verifyEligibility(id: string, dto: VerifyEligibilityDto, userId?: string) {
    const insurance = await this.prisma.patientInsurance.findUnique({ where: { id } });
    if (!insurance) throw new NotFoundException('Insurance record not found');

    const validStatuses = ['VERIFIED', 'INELIGIBLE', 'PENDING', 'UNKNOWN'];
    if (!validStatuses.includes(dto.status)) {
      throw new BadRequestException(`Invalid eligibility status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const data: any = {
      eligibilityStatus: dto.status,
      eligibilityVerifiedAt: new Date(),
      eligibilityVerifiedById: userId,
      eligibilityNotes: dto.notes,
    };

    if (dto.copayAmount !== undefined) data.copayAmount = dto.copayAmount;
    if (dto.coinsurancePercent !== undefined) data.coinsurancePercent = dto.coinsurancePercent;
    if (dto.deductibleAmount !== undefined) data.deductibleAmount = dto.deductibleAmount;
    if (dto.deductibleMet !== undefined) data.deductibleMet = dto.deductibleMet;
    if (dto.outOfPocketMax !== undefined) data.outOfPocketMax = dto.outOfPocketMax;
    if (dto.outOfPocketMet !== undefined) data.outOfPocketMet = dto.outOfPocketMet;

    const updated = await this.prisma.patientInsurance.update({ where: { id }, data });

    await this.auditService.log({
      action: `ELIGIBILITY_${dto.status}`,
      entityType: 'PatientInsurance',
      entityId: id,
      userId,
      details: {
        patientId: insurance.patientId,
        companyName: insurance.companyName,
        policyNumber: insurance.policyNumber,
      },
    });

    return updated;
  }

  async setPrimary(patientId: string, insuranceId: string, userId?: string) {
    // Get all active insurances for patient
    const insurances = await this.prisma.patientInsurance.findMany({
      where: { patientId, isActive: true },
    });

    const target = insurances.find((i) => i.id === insuranceId);
    if (!target) throw new NotFoundException('Insurance record not found for this patient');

    // Update priorities: set target to 1, shift others
    await this.prisma.$transaction(
      insurances.map((ins) =>
        this.prisma.patientInsurance.update({
          where: { id: ins.id },
          data: { priority: ins.id === insuranceId ? 1 : ins.priority + 1 },
        })
      )
    );

    await this.auditService.log({
      action: 'INSURANCE_SET_PRIMARY',
      entityType: 'PatientInsurance',
      entityId: insuranceId,
      userId,
      details: { patientId, companyName: target.companyName },
    });

    return this.getPatientInsurance(patientId);
  }

  async removePatientInsurance(id: string, userId?: string) {
    const insurance = await this.prisma.patientInsurance.findUnique({ where: { id } });
    if (!insurance) throw new NotFoundException('Insurance record not found');

    await this.prisma.patientInsurance.update({ where: { id }, data: { isActive: false } });

    await this.auditService.log({
      action: 'PATIENT_INSURANCE_REMOVED',
      entityType: 'PatientInsurance',
      entityId: id,
      userId,
      details: { patientId: insurance.patientId, companyName: insurance.companyName },
    });

    return { message: 'Insurance removed' };
  }

  async getEligibilitySummary(patientId: string) {
    const insurances = await this.prisma.patientInsurance.findMany({
      where: { patientId, isActive: true },
      orderBy: { priority: 'asc' },
    });

    return {
      patientId,
      primaryInsurance: insurances[0] || null,
      secondaryInsurance: insurances[1] || null,
      totalInsurances: insurances.length,
      allVerified: insurances.every((i) => i.eligibilityStatus === 'VERIFIED'),
      pendingVerification: insurances.filter((i) => i.eligibilityStatus !== 'VERIFIED').length,
    };
  }
}
