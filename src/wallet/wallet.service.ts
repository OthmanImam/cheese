// src/wallet/wallet.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StellarService } from '../stellar/stellar.service';
import { RatesService } from '../rates/rates.service';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly stellarService: StellarService,
    private readonly ratesService: RatesService,
  ) {}

  // ── GET /wallet/balance ───────────────────────────────────
  async getBalance(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.stellarPublicKey) {
      return {
        usdc: '0.000000',
        usdcFormatted: '$0.00',
        ngnEquivalent: '₦0.00',
        ngnRate: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    const [balances, rate] = await Promise.all([
      this.stellarService.getUsdcBalance(user.stellarPublicKey),
      this.ratesService.getCurrentRate(),
    ]);

    const usdcAmount = parseFloat(balances.usdc);
    const ngnAmount = usdcAmount * parseFloat(rate.effectiveRate);
    const effectiveRate = parseFloat(rate.effectiveRate);

    return {
      usdc: balances.usdc,
      usdcFormatted: `$${usdcAmount.toFixed(2)}`,
      ngnEquivalent: `₦${ngnAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      ngnRate: effectiveRate,
      lastUpdated: new Date().toISOString(),
    };
  }

  // ── GET /wallet/address ───────────────────────────────────
  async getAddress(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.stellarPublicKey)
      throw new NotFoundException('Wallet not initialised');
    return this.stellarService.getDepositAddress(user.stellarPublicKey);
  }

  // ── GET /wallet/deposit-networks ─────────────────────────
  getDepositNetworks() {
    return [
      {
        id: 'stellar',
        name: 'Stellar Network',
        asset: 'USDC',
        confirmations: 1,
        fee: '0.00',
        minDeposit: '1.00',
        estimatedTime: '5 seconds',
      },
    ];
  }
}
