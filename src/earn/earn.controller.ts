// src/earn/earn.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { EarnService } from './earn.service';
import { DepositEarnDto, WithdrawEarnDto } from './dto';

@ApiTags('Earn')
@ApiBearerAuth('access-token')
@Controller('earn')
export class EarnController {
  constructor(private readonly earnService: EarnService) {}

  @Get()
  @ApiOperation({
    summary: 'Get earn position',
    description:
      "Returns the user's USDC yield position including principal, pending yield, total yield earned to date, current APY, and projected earnings.",
  })
  @ApiResponse({
    status: 200,
    description:
      'Earn position with principal, pendingYieldUsdc, totalYieldUsdc, currentApy, and projections',
  })
  getPosition(@CurrentUser() user: User) {
    return this.earnService.getPosition(user.id);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deposit into earn',
    description:
      "Moves USDC from the user's main wallet into the earn position. Minimum deposit is 1.00 USDC. Yield begins accruing in the next daily cron cycle.",
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit successful — returns updated earn position',
  })
  @ApiResponse({
    status: 400,
    description: 'Amount below minimum or insufficient wallet balance',
  })
  deposit(@CurrentUser() user: User, @Body() dto: DepositEarnDto) {
    return this.earnService.deposit(user.id, dto);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Withdraw from earn',
    description:
      "Moves USDC from the earn position back to the user's main wallet. Pending yield is withdrawn first, then principal. Full or partial withdrawals are supported.",
  })
  @ApiResponse({
    status: 200,
    description:
      'Withdrawal successful — returns updated earn position and wallet balance',
  })
  @ApiResponse({
    status: 400,
    description: 'Amount exceeds available position balance',
  })
  withdraw(@CurrentUser() user: User, @Body() dto: WithdrawEarnDto) {
    return this.earnService.withdraw(user.id, dto);
  }
}
