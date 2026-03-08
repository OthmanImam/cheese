// src/rates/rates.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RatesService } from './rates.service';

@ApiTags('Rates')
@ApiBearerAuth('access-token')
@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get('current')
  @ApiOperation({
    summary: 'Get current USD/NGN exchange rate',
    description:
      'Returns the current USD → NGN rate including the platform spread. Rate is fetched from the provider every minute and cached — callers always receive a fresh value. Use this to show NGN equivalent amounts in the UI.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Current rate object — includes usdToNgn (raw), effectiveRate (with spread), spreadPercent, and lastUpdatedAt',
  })
  getCurrent() {
    return this.ratesService.getCurrentRate();
  }
}
