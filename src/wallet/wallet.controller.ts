// src/wallet/wallet.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@ApiBearerAuth('access-token')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({
    summary: 'Get wallet balance',
    description:
      'Returns the live USDC balance fetched directly from Stellar Horizon, plus the NGN equivalent at the current effective rate.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Balance object — includes balanceUsdc (string), balanceNgn (number), and rateApplied',
  })
  getBalance(@CurrentUser() user: User) {
    return this.walletService.getBalance(user.id);
  }

  @Get('address')
  @ApiOperation({
    summary: 'Get deposit address',
    description:
      "Returns the user's Stellar public key (G-address). Share this with senders to receive USDC. Only USDC (Circle issuer) deposits are credited to the wallet.",
  })
  @ApiResponse({
    status: 200,
    description: 'Stellar public key and QR code data',
  })
  getAddress(@CurrentUser() user: User) {
    return this.walletService.getAddress(user.id);
  }

  @Get('deposit-networks')
  @ApiOperation({
    summary: 'List supported deposit networks',
    description:
      'Returns the list of supported deposit networks with minimum amounts, confirmation times, and memo requirements.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of supported networks (currently Stellar only)',
  })
  getDepositNetworks() {
    return this.walletService.getDepositNetworks();
  }
}
