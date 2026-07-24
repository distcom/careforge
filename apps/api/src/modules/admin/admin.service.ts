import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  roleIds?: string[];
  facilityIds?: string[];
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
  roleIds?: string[];
}

export interface UpdateSettingDto {
  key: string;
  value: string;
  category?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // User Management
  async getUsers(query: PaginationQuery & { search?: string; isActive?: boolean }): Promise<PaginatedResult<any>> {
    const where: any = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          emailVerified: true,
          mfaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          roles: { include: { role: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return new PaginatedResult(users, total, query.page, query.limit);
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        prefix: true,
        suffix: true,
        phone: true,
        isActive: true,
        emailVerified: true,
        mfaEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        roles: { include: { role: true } },
        facilities: { include: { facility: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(dto: CreateUserDto, adminUserId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already exists');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash: dto.password ? 'temp-hash-set-on-first-login' : 'pending-invite',
        roles: dto.roleIds?.length
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
        facilities: dto.facilityIds?.length
          ? { create: dto.facilityIds.map((facilityId) => ({ facilityId })) }
          : undefined,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    await this.auditService.log({
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      userId: adminUserId,
      details: { email: dto.email, roleIds: dto.roleIds },
    });

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, adminUserId?: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    const data: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      isActive: dto.isActive,
    };

    // Update roles if provided
    if (dto.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      if (dto.roleIds.length > 0) {
        await this.prisma.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    await this.auditService.log({
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      userId: adminUserId,
      details: { changes: Object.keys(dto).filter((k) => dto[k as keyof UpdateUserDto] !== undefined) },
    });

    return updated;
  }

  async deactivateUser(id: string, adminUserId?: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({ where: { id }, data: { isActive: false } });

    await this.auditService.log({
      action: 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: id,
      userId: adminUserId,
      details: { email: user.email },
    });

    return { message: 'User deactivated' };
  }

  // System Settings
  async getSystemSettings(category?: string) {
    const where = category ? { category } : {};
    return this.prisma.systemSetting.findMany({ where, orderBy: [{ category: 'asc' }, { key: 'asc' }] });
  }

  async updateSetting(dto: UpdateSettingDto, adminUserId?: string) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: dto.key },
      update: { value: dto.value, category: dto.category },
      create: { key: dto.key, value: dto.value, category: dto.category },
    });

    await this.auditService.log({
      action: 'SYSTEM_SETTING_UPDATED',
      entityType: 'SystemSetting',
      entityId: setting.id,
      userId: adminUserId,
      details: { key: dto.key, category: dto.category },
    });

    return setting;
  }

  // Roles & Permissions
  async getRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createRole(dto: { name: string; description?: string; permissionIds?: string[] }, adminUserId?: string) {
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) throw new BadRequestException('Role name already exists');

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissionIds?.length
          ? { create: dto.permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });

    await this.auditService.log({
      action: 'ROLE_CREATED',
      entityType: 'Role',
      entityId: role.id,
      userId: adminUserId,
      details: { name: dto.name, permissionCount: dto.permissionIds?.length || 0 },
    });

    return role;
  }

  async getPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
  }

  // Facility Management
  async getFacilities() {
    return this.prisma.facility.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createFacility(dto: any, adminUserId?: string) {
    const facility = await this.prisma.facility.create({ data: dto });

    await this.auditService.log({
      action: 'FACILITY_CREATED',
      entityType: 'Facility',
      entityId: facility.id,
      userId: adminUserId,
      details: { name: dto.name },
    });

    return facility;
  }

  // Task Management
  async getTasks(query: PaginationQuery & { status?: string; assignedToId?: string }): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);
    return new PaginatedResult(tasks, total, query.page, query.limit);
  }

  async createTask(dto: any, adminUserId?: string) {
    const task = await this.prisma.task.create({ data: dto });

    await this.auditService.log({
      action: 'TASK_CREATED',
      entityType: 'Task',
      entityId: task.id,
      userId: adminUserId,
      details: { title: dto.title, assignedToId: dto.assignedToId },
    });

    return task;
  }

  async updateTask(id: string, dto: any, adminUserId?: string) {
    const data: any = { ...dto };
    if (dto.status === 'COMPLETED') data.completedAt = new Date();

    const task = await this.prisma.task.update({ where: { id }, data });

    await this.auditService.log({
      action: 'TASK_UPDATED',
      entityType: 'Task',
      entityId: id,
      userId: adminUserId,
      details: { status: dto.status },
    });

    return task;
  }

  // Audit Log Viewing
  async getAuditLogs(query: PaginationQuery & { userId?: string; entityType?: string; action?: string }): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = { contains: query.action };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return new PaginatedResult(logs, total, query.page, query.limit);
  }

  // System Statistics
  async getSystemStats() {
    const [
      totalUsers,
      activeUsers,
      totalPatients,
      totalFacilities,
      totalRoles,
      pendingTasks,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.patient.count({ where: { deletedAt: null } }),
      this.prisma.facility.count(),
      this.prisma.role.count(),
      this.prisma.task.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers },
      patients: totalPatients,
      facilities: totalFacilities,
      roles: totalRoles,
      pendingTasks,
    };
  }
}
