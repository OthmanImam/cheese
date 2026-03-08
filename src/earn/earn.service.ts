// src/earn/earn.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../auth/entities/user.entity';
import { StellarService } from '../stellar/stellar.service';
import { RatesService } from '../rates/rates.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TxStatus, TxType } from '../transactions/entities/transaction.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { EarnPosition, EarnStatus } from './entities/earn-position.entity';
import { DepositEarnDto, WithdrawEarnDto } from './dto';

// 5% APY default — in prod this would come from a rate table
const DEFAULT_APY = 0.05;

@Injectable()
export class EarnService {
  private readonly logger = new Logger(EarnService.name);

  constructor(
    @InjectRepository(EarnPosition)
    private readonly earnRepo: Repository<EarnPosition>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly stellarService: StellarService,
    private readonly ratesService: RatesService,
    private readonly txService: TransactionsService,
    private readonly notifService: NotificationsService,
  ) {}

  // ── GET /earn ─────────────────────────────────────────────
  async getPosition(userId: string) {
    const position = await this.earnRepo.findOne({ where: { userId } });

    if (!position) {
      // Return empty position — don't create until first deposit
      return {
        status: 'inactive',
        principalUsdc: '0.000000',
        pendingYieldUsdc: '0.000000',
        totalYieldUsdc: '0.000000',
        currentApy: String(DEFAULT_APY * 100),
        projectedMonthly: '0.000000',
        projectedAnnual: '0.000000',
        lastYieldAt: null,
      };
    }

    const principal = parseFloat(position.principalUsdc);
    const projectedAnnual = principal * DEFAULT_APY;
    const projectedMonthly = projectedAnnual / 12;

    return {
      id: position.id,
      status: position.status,
      principalUsdc: position.principalUsdc,
      pendingYieldUsdc: position.pendingYieldUsdc,
      totalYieldUsdc: position.totalYieldUsdc,
      currentApy: String(parseFloat(position.currentApy) * 100),
      projectedMonthly: projectedMonthly.toFixed(6),
      projectedAnnual: projectedAnnual.toFixed(6),
      lastYieldAt: position.lastYieldAt,
    };
  }

  // ── POST /earn/deposit ────────────────────────────────────
  async deposit(userId: string, dto: DepositEarnDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.stellarPublicKey)
      throw new BadRequestException('Wallet not initialised');

    const amount = parseFloat(dto.amountUsdc);
    if (isNaN(amount) || amount < 1)
      throw new BadRequestException('Minimum earn deposit is 1 USDC');

    // Check wallet balance
    const balance = await this.stellarService.getUsdcBalance(
      user.stellarPublicKey,
    );
    if (parseFloat(balance.usdc) < amount) {
      throw new BadRequestException('Insufficient USDC balance');
    }

    // Get or create earn position
    let position = await this.earnRepo.findOne({ where: { userId } });
    if (!position) {
      position = await this.earnRepo.save(
        this.earnRepo.create({
          userId,
          status: EarnStatus.ACTIVE,
          currentApy: String(DEFAULT_APY),
        }),
      );
    }

    // Update principal
    const newPrincipal = parseFloat(position.principalUsdc) + amount;
    await this.earnRepo.update(
      { id: position.id },
      {
        principalUsdc: newPrincipal.toFixed(6),
        status: EarnStatus.ACTIVE,
      },
    );

    // Record transaction
    const reference = `CW-EARN-DEP-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    await this.txService.create({
      userId,
      type: TxType.YIELD_CREDIT,
      status: TxStatus.COMPLETED,
      amountUsdc: dto.amountUsdc,
      feeUsdc: '0',
      reference,
      description: `Earn deposit — ${amount.toFixed(2)} USDC`,
    });

    const rate = await this.ratesService.getCurrentRate();
    const ngnValue = (amount * parseFloat(rate.effectiveRate)).toFixed(2);

    return {
      principalUsdc: newPrincipal.toFixed(6),
      depositedUsdc: dto.amountUsdc,
      ngnEquivalent: ngnValue,
      currentApy: String(DEFAULT_APY * 100),
      message: 'Deposit successful. Yield accrues daily.',
    };
  }

  // ── POST /earn/withdraw ───────────────────────────────────
  async withdraw(userId: string, dto: WithdrawEarnDto) {
    const position = await this.earnRepo.findOne({ where: { userId } });
    if (!position) throw new NotFoundException('No earn position found');

    const amount = parseFloat(dto.amountUsdc);
    const principal = parseFloat(position.principalUsdc);
    const pending = parseFloat(position.pendingYieldUsdc);
    const available = principal + pending;

    if (isNaN(amount) || amount <= 0)
      throw new BadRequestException('Invalid amount');
    if (amount > available)
      throw new BadRequestException(
        `Maximum withdrawable: ${available.toFixed(6)} USDC`,
      );

    // Deduct from yield first, then principal
    let newPending = pending;
    let newPrincipal = principal;
    let remaining = amount;

    if (newPending >= remaining) {
      newPending -= remaining;
      remaining = 0;
    } else {
      remaining -= newPending;
      newPending = 0;
      newPrincipal -= remaining;
    }

    await this.earnRepo.update(
      { id: position.id },
      {
        principalUsdc: newPrincipal.toFixed(6),
        pendingYieldUsdc: newPending.toFixed(6),
        status: newPrincipal <= 0 ? EarnStatus.CLOSED : EarnStatus.ACTIVE,
      },
    );

    const reference = `CW-EARN-WD-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    await this.txService.create({
      userId,
      type: TxType.YIELD_CREDIT,
      status: TxStatus.COMPLETED,
      amountUsdc: dto.amountUsdc,
      feeUsdc: '0',
      reference,
      description: `Earn withdrawal — ${amount.toFixed(2)} USDC`,
    });

    return {
      withdrawnUsdc: dto.amountUsdc,
      remainingPrincipal: newPrincipal.toFixed(6),
      message: 'Withdrawal successful',
    };
  }

  // ── Daily yield accrual cron — runs at midnight UTC ───────
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async accrueYield() {
    this.logger.log('Starting daily yield accrual...');

    const positions = await this.earnRepo.find({
      where: { status: EarnStatus.ACTIVE },
    });
    let count = 0;

    for (const position of positions) {
      try {
        const principal = parseFloat(position.principalUsdc);
        if (principal <= 0) continue;

        const dailyRate = DEFAULT_APY / 365;
        const yieldToday = principal * dailyRate;

        const newPending = parseFloat(position.pendingYieldUsdc) + yieldToday;
        const newTotal = parseFloat(position.totalYieldUsdc) + yieldToday;

        await this.earnRepo.update(
          { id: position.id },
          {
            pendingYieldUsdc: newPending.toFixed(6),
            totalYieldUsdc: newTotal.toFixed(6),
            lastYieldAt: new Date(),
          },
        );

        // Credit yield as transaction once it exceeds $0.01
        if (newPending >= 0.01) {
          const reference = `CW-YIELD-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
          await this.txService.create({
            userId: position.userId,
            type: TxType.YIELD_CREDIT,
            status: TxStatus.COMPLETED,
            amountUsdc: yieldToday.toFixed(6),
            feeUsdc: '0',
            reference,
            description: 'Daily yield credit',
          });
        }

        count++;
      } catch (err) {
        this.logger.error(
          `Yield accrual failed for position ${position.id}: ${err.message}`,
        );
      }
    }

    this.logger.log(`Yield accrual complete — processed ${count} positions`);
  }
}
