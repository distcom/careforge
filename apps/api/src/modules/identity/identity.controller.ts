import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { IdentityService } from './identity.service';
import { Public, Roles } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { CreateUserDto, UpdateUserDto, AssignRolesDto } from './dto/user.dto';

@ApiTags('auth')
@Controller('auth')
export class IdentityController {
  constructor(
    private authService: AuthService,
    private identityService: IdentityService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.identityService.findById(user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (admin)' })
  findAll(@Query() query: PaginationQuery) {
    return this.identityService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users/:id')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Get user by ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.identityService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('users')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Create user (admin)' })
  create(@Body() dto: CreateUserDto) {
    return this.identityService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('users/:id')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Update user (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.identityService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('users/:id')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Deactivate user (admin)' })
  remove(@Param('id') id: string) {
    return this.identityService.remove(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('users/:id/roles')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Assign roles to user' })
  assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto) {
    return this.identityService.assignRoles(id, dto.roleIds);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('roles')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all roles' })
  getRoles() {
    return this.identityService.getRoles();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('roles')
  @ApiBearerAuth()
  @Roles('admin')
  @ApiOperation({ summary: 'Create role (admin)' })
  createRole(@Body() dto: { name: string; description?: string; permissionIds?: string[] }) {
    return this.identityService.createRole(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('permissions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all permissions' })
  getPermissions() {
    return this.identityService.getPermissions();
  }
}
