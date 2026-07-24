import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService, CreateUserDto, UpdateUserDto, UpdateSettingDto } from './admin.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // System stats
  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics' })
  @RequirePermissions('admin:read')
  getSystemStats() {
    return this.adminService.getSystemStats();
  }

  // User management
  @Get('users')
  @ApiOperation({ summary: 'List users' })
  @RequirePermissions('admin:users')
  getUsers(@Query() query: PaginationQuery & { search?: string; isActive?: boolean }) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @RequirePermissions('admin:users')
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create user' })
  @RequirePermissions('admin:users')
  createUser(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    return this.adminService.createUser(dto, user?.id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @RequirePermissions('admin:users')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.adminService.updateUser(id, dto, user?.id);
  }

  @Post('users/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate user' })
  @RequirePermissions('admin:users')
  deactivateUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.deactivateUser(id, user?.id);
  }

  // System settings
  @Get('settings')
  @ApiOperation({ summary: 'Get system settings' })
  @RequirePermissions('admin:settings')
  getSystemSettings(@Query('category') category?: string) {
    return this.adminService.getSystemSettings(category);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update system setting' })
  @RequirePermissions('admin:settings')
  updateSetting(@Body() dto: UpdateSettingDto, @CurrentUser() user: any) {
    return this.adminService.updateSetting(dto, user?.id);
  }

  // Roles & permissions
  @Get('roles')
  @ApiOperation({ summary: 'List roles' })
  @RequirePermissions('admin:roles')
  getRoles() {
    return this.adminService.getRoles();
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create role' })
  @RequirePermissions('admin:roles')
  createRole(@Body() dto: { name: string; description?: string; permissionIds?: string[] }, @CurrentUser() user: any) {
    return this.adminService.createRole(dto, user?.id);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List permissions' })
  @RequirePermissions('admin:roles')
  getPermissions() {
    return this.adminService.getPermissions();
  }

  // Facilities
  @Get('facilities')
  @ApiOperation({ summary: 'List facilities' })
  @RequirePermissions('admin:facilities')
  getFacilities() {
    return this.adminService.getFacilities();
  }

  @Post('facilities')
  @ApiOperation({ summary: 'Create facility' })
  @RequirePermissions('admin:facilities')
  createFacility(@Body() dto: any, @CurrentUser() user: any) {
    return this.adminService.createFacility(dto, user?.id);
  }

  // Tasks
  @Get('tasks')
  @ApiOperation({ summary: 'List tasks' })
  @RequirePermissions('admin:tasks')
  getTasks(@Query() query: PaginationQuery & { status?: string; assignedToId?: string }) {
    return this.adminService.getTasks(query);
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create task' })
  @RequirePermissions('admin:tasks')
  createTask(@Body() dto: any, @CurrentUser() user: any) {
    return this.adminService.createTask(dto, user?.id);
  }

  @Put('tasks/:id')
  @ApiOperation({ summary: 'Update task' })
  @RequirePermissions('admin:tasks')
  updateTask(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.adminService.updateTask(id, dto, user?.id);
  }

  // Audit logs
  @Get('audit-logs')
  @ApiOperation({ summary: 'View audit logs' })
  @RequirePermissions('admin:audit')
  getAuditLogs(@Query() query: PaginationQuery & { userId?: string; entityType?: string; action?: string }) {
    return this.adminService.getAuditLogs(query);
  }
}
