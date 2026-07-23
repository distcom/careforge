import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('messaging')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Get('threads')
  @ApiOperation({ summary: 'List message threads' })
  getThreads(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQuery) {
    return this.messagingService.getThreads(user.id, query);
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Get thread messages' })
  getThreadMessages(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQuery) {
    return this.messagingService.getThreadMessages(id, user.id, query);
  }

  @Post('threads')
  @ApiOperation({ summary: 'Create new message thread' })
  createThread(@CurrentUser() user: AuthenticatedUser, @Body() dto: { subject: string; participantIds: string[]; patientId?: string }) {
    return this.messagingService.createThread(user.id, dto);
  }

  @Post('threads/:id/messages')
  @ApiOperation({ summary: 'Send message in thread' })
  sendMessage(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: { body: string; priority?: string }) {
    return this.messagingService.sendMessage(id, user.id, dto);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread message count' })
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.getUnreadCount(user.id);
  }
}
