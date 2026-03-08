// src/referral/referral.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { ReferralService } from './referral.service';

@ApiTags('Referral')
@ApiBearerAuth('access-token')
@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get()
  @ApiOperation({
    summary: 'Get referral summary',
    description:
      "Returns the user's referral code (same as uppercase username), a pre-built share URL, total referral count, pending rewards, and paid-out rewards. New users earn $2 USDC per successful referral.",
  })
  @ApiResponse({
    status: 200,
    description:
      'Referral summary — includes code, shareUrl, totalReferrals, pendingRewardUsdc, paidOutUsdc',
  })
  getSummary(@CurrentUser() user: User) {
    return this.referralService.getSummary(user.id);
  }
}
