import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  async findAll(patientId: string, query: PaginationQuery & { status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId };
    if (query.status) where.status = query.status;

    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referral.count({ where }),
    ]);
    return new PaginatedResult(referrals, total, query.page, query.limit);
  }

  async findById(id: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id },
      include: { patient: { select: { firstName: true, lastName: true, dateOfBirth: true } } },
    });
    if (!referral) throw new NotFoundException('Referral not found');
    return referral;
  }

  async create(dto: any) {
    return this.prisma.referral.create({
      data: {
        patientId: dto.patientId,
        referringProviderId: dto.referringProviderId,
        referredToName: dto.referredToName,
        referredToSpecialty: dto.referredToSpecialty,
        reason: dto.reason,
        urgency: dto.urgency || 'ROUTINE',
        status: 'PENDING',
        clinicalInfo: dto.clinicalInfo,
        notes: dto.notes,
      },
    });
  }

  async updateStatus(id: string, status: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');

    return this.prisma.referral.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });
  }

  async remove(id: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');
    return this.prisma.referral.delete({ where: { id } });
  }
}
