import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsers(query: { limit?: number; page?: number; search?: string }) {
    const where: any = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const take = query.limit || 20;
    const skip = ((query.page || 1) - 1) * take;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true, roles: { include: { role: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: users, total, page: query.page || 1 };
  }

  async getSystemSettings() {
    return this.prisma.systemSetting.findMany();
  }

  async updateSetting(key: string, value: string, category?: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, category },
      create: { key, value, category },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
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

  async getTasks(query: { status?: string; assignedToId?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    return this.prisma.task.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createTask(dto: any) {
    return this.prisma.task.create({ data: dto });
  }

  async updateTask(id: string, dto: any) {
    const data: any = { ...dto };
    if (dto.status === 'completed') data.completedAt = new Date();
    return this.prisma.task.update({ where: { id }, data });
  }
}
