import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class IdentityService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: {
          roles: { include: { role: { select: { id: true, name: true } } } },
          facilities: { include: { facility: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return new PaginatedResult(users, total, query.page, query.limit);
  }

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        roles: { include: { role: true } },
        facilities: { include: { facility: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        phone: dto.phone,
        isActive: dto.isActive ?? true,
        roles: dto.roleIds?.length
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
        facilities: dto.facilityIds?.length
          ? { create: dto.facilityIds.map((facilityId) => ({ facilityId })) }
          : undefined,
      },
      include: { roles: { include: { role: true } } },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    const data: any = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      delete data.password;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      include: { roles: { include: { role: true } } },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async assignRoles(userId: string, roleIds: string[]) {
    await this.prisma.userRole.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      });
    }
    return this.findById(userId);
  }

  async getRoles() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createRole(dto: { name: string; description?: string; permissionIds?: string[] }) {
    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissionIds?.length
          ? { create: dto.permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async getPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
  }
}
