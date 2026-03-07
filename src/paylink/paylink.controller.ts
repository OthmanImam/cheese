// src/paylink/paylink.controller.ts
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, Post, Query, Req,
} from '@nestjs/common'
import { Request }          from 'express'
import { CurrentUser }      from '../common/decorators/current-user.decorator'
import { Public }           from '../common/decorators/public.decorator'
import { PayLinkService }   from './paylink.service'
import { CreatePayLinkDto, PayLinkPayDto } from './dto'

@Controller('paylink')
export class PayLinkController {
  constructor(private readonly payLinkService: PayLinkService) {}

  // ── POST /paylink ─────────────────────────────────────────
  // Authenticated creator generates a new payment request link
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePayLinkDto,
  ) {
    return this.payLinkService.createPayLink(userId, dto)
  }

  // ── GET /paylink/my ───────────────────────────────────────
  // Authenticated: list your own created links
  @Get('my')
  myLinks(
    @CurrentUser('id') userId: string,
    @Query('page') page     = '1',
    @Query('pageSize') size = '20',
  ) {
    return this.payLinkService.myLinks(userId, parseInt(page), parseInt(size))
  }

  // ── GET /paylink/:token ───────────────────────────────────
  // Public — anyone can resolve a link to see the amount & creator
  @Public()
  @Get(':token')
  resolve(@Param('token') token: string) {
    return this.payLinkService.resolveLink(token)
  }

  // ── POST /paylink/:token/pay ──────────────────────────────
  // Authenticated payer completes the payment
  @Post(':token/pay')
  @HttpCode(HttpStatus.OK)
  pay(
    @CurrentUser('id') userId: string,
    @Param('token') token: string,
    @Body() dto: PayLinkPayDto,
    @Req() req: Request,
  ) {
    const ip = req.headers['x-forwarded-for'] as string || req.ip
    return this.payLinkService.payLink(userId, token, dto, ip)
  }

  // ── DELETE /paylink/:token ────────────────────────────────
  // Authenticated creator cancels their own link
  @Delete(':token')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser('id') userId: string,
    @Param('token') token: string,
  ) {
    return this.payLinkService.cancelLink(userId, token)
  }
}
