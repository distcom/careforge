import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TelehealthService } from './telehealth.service';
import { TelehealthSessionService } from './telehealth-session.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('telehealth')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('telehealth')
export class TelehealthController {
  constructor(
    private telehealthService: TelehealthService,
    private sessionService: TelehealthSessionService,
  ) {}

  @Get('sessions')
  @ApiOperation({ summary: 'List telehealth sessions' })
  @RequirePermissions('telehealth:read')
  findAll(@Query() query: PaginationQuery & { patientId?: string; providerId?: string; status?: string }) {
    return this.telehealthService.findAll(query);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get telehealth session by ID' })
  @RequirePermissions('telehealth:read')
  findOne(@Param('id') id: string) {
    return this.telehealthService.findById(id);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create telehealth session' })
  @RequirePermissions('telehealth:write')
  create(@Body() dto: any, @CurrentUser() user: AuthenticatedUser) {
    return this.sessionService.createSession({ ...dto, providerId: dto.providerId || user.id });
  }

  @Post('sessions/:roomCode/join')
  @ApiOperation({ summary: 'Join a telehealth session by room code' })
  @RequirePermissions('telehealth:write')
  join(@Param('roomCode') roomCode: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: { role?: string }) {
    return this.sessionService.joinSession(roomCode, user.id, dto.role || 'provider');
  }

  @Post('sessions/:roomCode/admit')
  @ApiOperation({ summary: 'Admit participant from waiting room' })
  @RequirePermissions('telehealth:write')
  admit(@Param('roomCode') roomCode: string, @Body() dto: { userId: string }) {
    return this.sessionService.admitFromWaitingRoom(roomCode, dto.userId);
  }

  @Post('sessions/:roomCode/leave')
  @ApiOperation({ summary: 'Leave a telehealth session' })
  @RequirePermissions('telehealth:write')
  leave(@Param('roomCode') roomCode: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: { endForAll?: boolean }) {
    return this.sessionService.leaveSession(roomCode, user.id, dto.endForAll || false);
  }

  @Put('sessions/:id/status')
  @ApiOperation({ summary: 'Update session status' })
  @RequirePermissions('telehealth:write')
  updateStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.telehealthService.updateSessionStatus(id, dto.status);
  }

  @Post('sessions/:id/cancel')
  @ApiOperation({ summary: 'Cancel a telehealth session' })
  @RequirePermissions('telehealth:write')
  cancel(@Param('id') id: string, @Body() dto: { reason: string }) {
    return this.sessionService.cancelSession(id, dto.reason);
  }

  @Get('sessions/:roomCode/quality')
  @ApiOperation({ summary: 'Get session quality metrics' })
  @RequirePermissions('telehealth:read')
  getQuality(@Param('roomCode') roomCode: string) {
    return this.sessionService.getSessionQuality(roomCode);
  }

  @Get('rooms/:roomCode')
  @ApiOperation({ summary: 'Get virtual room details by room code' })
  @RequirePermissions('telehealth:read')
  getRoom(@Param('roomCode') roomCode: string) {
    return this.telehealthService.getSessionByRoom(roomCode);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get patient telehealth sessions' })
  @RequirePermissions('telehealth:read')
  getPatientSessions(@Param('patientId') patientId: string) {
    return this.telehealthService.getPatientSessions(patientId);
  }
}
