// src/waitlist/waitlist.controller.ts
import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req,
} from '@nestjs/common'
import { Request }      from 'express'
import { Public }       from '../common/decorators/public.decorator'
import { WaitlistService } from './waitlist.service'
import { JoinWaitlistDto } from './dto'

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  // ── POST /waitlist/join ───────────────────────────────────
  @Public()
  @Post('join')
  @HttpCode(HttpStatus.CREATED)
  join(@Body() dto: JoinWaitlistDto, @Req() req: Request) {
    const ip = req.headers['x-forwarded-for'] as string || req.ip
    return this.waitlistService.join(dto, ip)
  }

  // ── GET /waitlist/check/:username ─────────────────────────
  @Public()
  @Get('check/:username')
  checkUsername(@Param('username') username: string) {
    return this.waitlistService.checkUsername(username)
  }

  // ── GET /waitlist/stats ───────────────────────────────────
  @Public()
  @Get('stats')
  getStats() {
    return this.waitlistService.getStats()
  }
}
