// src/notifications/notifications.controller.ts
import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get notifications',
    description:
      'Returns the last 50 in-app notifications for the authenticated user, ordered newest first. Includes read/unread status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of notifications (max 50, newest first)',
  })
  getAll(@CurrentUser() user: User) {
    return this.notifService.getNotifications(user.id);
  }

  @Post('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description:
      'Bulk-marks every unread notification as read. Use after the user opens the notification centre.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read — returns updated count',
  })
  markRead(@CurrentUser() user: User) {
    return this.notifService.markAllRead(user.id);
  }
}
