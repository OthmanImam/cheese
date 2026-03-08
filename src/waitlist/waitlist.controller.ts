// src/waitlist/waitlist.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto';

@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Public()
  @Post('join')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Join the waitlist',
    description:
      'Reserves a username and email on the pre-launch waitlist. Sends a confirmation email immediately. If the username is already reserved by a different email, returns 409. Public endpoint — no auth required.',
  })
  @ApiResponse({
    status: 201,
    description: 'Waitlist entry created — confirmation email sent',
  })
  @ApiResponse({
    status: 409,
    description: 'Email or username already on waitlist',
  })
  join(@Body() dto: JoinWaitlistDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    return this.waitlistService.join(dto, ip);
  }

  @Public()
  @Get('check/:username')
  @ApiOperation({
    summary: 'Check username availability',
    description:
      'Checks whether a username is available across both existing users and the waitlist. Use for real-time availability feedback during waitlist signup. Public endpoint.',
  })
  @ApiParam({
    name: 'username',
    description: 'Username to check',
    example: 'tunde_ok',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns { available: boolean, reservedByYou: boolean }',
  })
  checkUsername(@Param('username') username: string) {
    return this.waitlistService.checkUsername(username);
  }

  @Public()
  @Get('stats')
  @ApiOperation({
    summary: 'Get waitlist stats',
    description:
      'Returns public stats for the landing page: total signups and estimated spots remaining. Public endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns { totalReservations: number, spotsLeft: number }',
  })
  getStats() {
    return this.waitlistService.getStats();
  }
}
