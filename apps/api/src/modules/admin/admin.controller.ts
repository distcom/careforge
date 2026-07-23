import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/auth.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List system users' })
  getUsers(@Query() query: { limit?: number; page?: number; search?: string }) {
    return this.adminService.getUsers(query);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get system settings' })
  getSettings() {
    return this.adminService.getSystemSettings();
  }

  @Put('settings/:key')
  @ApiOperation({ summary: 'Update system setting' })
  updateSetting(@Param('key') key: string, @Body() dto: { value: string; category?: string }) {
    return this.adminService.updateSetting(key, dto.value, dto.category);
  }

  @Get('roles')
  @ApiOperation({ summary: 'List roles with permissions' })
  getRoles() {
    return this.adminService.getRoles();
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create role' })
  createRole(@Body() dto: { name: string; description?: string; permissionIds?: string[] }) {
    return this.adminService.createRole(dto);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List all permissions' })
  getPermissions() {
    return this.adminService.getPermissions();
  }

  @Get('tasks')
  @ApiOperation({ summary: 'List tasks' })
  getTasks(@Query() query: { status?: string; assignedToId?: string }) {
    return this.adminService.getTasks(query);
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create task' })
  createTask(@Body() dto: any) {
    return this.adminService.createTask(dto);
  }

  @Put('tasks/:id')
  @ApiOperation({ summary: 'Update task' })
  updateTask(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateTask(id, dto);
  }
}
