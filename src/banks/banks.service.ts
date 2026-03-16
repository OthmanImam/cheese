// src/banks/banks.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../auth/entities/user.entity';
import { Device } from '../devices/entities/device.entity';
import { BlockchainService } from '../blockchain/services/blockchain.service';
import { RatesService } from '../rates/rates.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TxStatus, TxType } from '../transactions/entities/transaction.entity';
import {
  BankTransfer,
  BankTransferStatus,
} from './entities/bank-transfer.entity';
import { BankTransferDto, ResolveAccountDto } from './dto';

// Static list of Nigerian banks (NIP-enabled)
const NIGERIAN_BANKS = [
  {
    code: '044',
    name: 'Access Bank',
    shortName: 'Access',
    color: '#E30813',
    nipEnabled: true,
  },
  {
    code: '063',
    name: 'Access Bank (Diamond)',
    shortName: 'Diamond',
    color: '#004C97',
    nipEnabled: true,
  },
  {
    code: '035A',
    name: 'ALAT by WEMA',
    shortName: 'ALAT',
    color: '#5A2D82',
    nipEnabled: true,
  },
  {
    code: '401',
    name: 'ASO Savings',
    shortName: 'ASO',
    color: '#006400',
    nipEnabled: false,
  },
  {
    code: '023',
    name: 'Citibank Nigeria',
    shortName: 'Citibank',
    color: '#003B70',
    nipEnabled: true,
  },
  {
    code: '050',
    name: 'EcoBank Nigeria',
    shortName: 'EcoBank',
    color: '#008000',
    nipEnabled: true,
  },
  {
    code: '562',
    name: 'Ekondo Microfinance',
    shortName: 'Ekondo',
    color: '#FF6600',
    nipEnabled: false,
  },
  {
    code: '070',
    name: 'Fidelity Bank',
    shortName: 'Fidelity',
    color: '#00703C',
    nipEnabled: true,
  },
  {
    code: '011',
    name: 'First Bank of Nigeria',
    shortName: 'First Bank',
    color: '#01579B',
    nipEnabled: true,
  },
  {
    code: '214',
    name: 'First City Monument Bank',
    shortName: 'FCMB',
    color: '#00008B',
    nipEnabled: true,
  },
  {
    code: '058',
    name: 'Guaranty Trust Bank',
    shortName: 'GTBank',
    color: '#F36F21',
    nipEnabled: true,
  },
  {
    code: '030',
    name: 'Heritage Bank',
    shortName: 'Heritage',
    color: '#8B0000',
    nipEnabled: true,
  },
  {
    code: '301',
    name: 'Jaiz Bank',
    shortName: 'Jaiz',
    color: '#006400',
    nipEnabled: true,
  },
  {
    code: '082',
    name: 'Keystone Bank',
    shortName: 'Keystone',
    color: '#1E3A5F',
    nipEnabled: true,
  },
  {
    code: '526',
    name: 'Parallex Bank',
    shortName: 'Parallex',
    color: '#00A651',
    nipEnabled: true,
  },
  {
    code: '076',
    name: 'Polaris Bank',
    shortName: 'Polaris',
    color: '#D32F2F',
    nipEnabled: true,
  },
  {
    code: '101',
    name: 'Providus Bank',
    shortName: 'Providus',
    color: '#004080',
    nipEnabled: true,
  },
  {
    code: '221',
    name: 'Stanbic IBTC Bank',
    shortName: 'Stanbic',
    color: '#009EE0',
    nipEnabled: true,
  },
  {
    code: '068',
    name: 'Standard Chartered',
    shortName: 'StanChart',
    color: '#0072AA',
    nipEnabled: true,
  },
  {
    code: '232',
    name: 'Sterling Bank',
    shortName: 'Sterling',
    color: '#CC0000',
    nipEnabled: true,
  },
  {
    code: '100',
    name: 'Suntrust Bank',
    shortName: 'Suntrust',
    color: '#FF8C00',
    nipEnabled: true,
  },
  {
    code: '302',
    name: 'TAJ Bank',
    shortName: 'TAJ',
    color: '#006400',
    nipEnabled: true,
  },
  {
    code: '102',
    name: 'Titan Trust Bank',
    shortName: 'Titan',
    color: '#1B3A6B',
    nipEnabled: true,
  },
  {
    code: '032',
    name: 'Union Bank of Nigeria',
    shortName: 'Union',
    color: '#003366',
    nipEnabled: true,
  },
  {
    code: '033',
    name: 'United Bank for Africa',
    shortName: 'UBA',
    color: '#D0021B',
    nipEnabled: true,
  },
  {
    code: '215',
    name: 'Unity Bank',
    shortName: 'Unity',
    color: '#006400',
    nipEnabled: true,
  },
  {
    code: '035',
    name: 'Wema Bank',
    shortName: 'Wema',
    color: '#5A2D82',
    nipEnabled: true,
  },
  {
    code: '057',
    name: 'Zenith Bank',
    shortName: 'Zenith',
    color: '#C8102E',
    nipEnabled: true,
  },
  {
    code: '120001',
    name: 'Opay',
    shortName: 'Opay',
    color: '#008751',
    nipEnabled: true,
  },
  {
    code: '120002',
    name: 'PalmPay',
    shortName: 'PalmPay',
    color: '#00A859',
    nipEnabled: true,
  },
  {
    code: '120003',
    name: 'Moniepoint',
    shortName: 'Moniepoint',
    color: '#004B87',
    nipEnabled: true,
  },
  {
    code: '120004',
    name: 'Kuda Bank',
    shortName: 'Kuda',
    color: '#40196D',
    nipEnabled: true,
  },
];

const TRANSFER_FEE_NGN = 50; // flat ₦50 fee per withdrawal
const MIN_TRANSFER_NGN = 100;
const MAX_TRANSFER_NGN = 5_000_000;

@Injectable()
export class BanksService {
  private readonly logger = new Logger(BanksService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
    @InjectRepository(BankTransfer)
    private readonly transferRepo: Repository<BankTransfer>,
    private readonly config: ConfigService,
    private readonly BlockchainService: BlockchainService,
    private readonly ratesService: RatesService,
    private readonly txService: TransactionsService,
  ) {}

  // ── GET /banks ────────────────────────────────────────────
  getBanks() {
    return NIGERIAN_BANKS.map((b) => ({ ...b, type: 'commercial' }));
  }

  // ── POST /banks/resolve ───────────────────────────────────
  async resolveAccount(
    dto: ResolveAccountDto,
  ): Promise<{ accountName: string; accountNumber: string; bankCode: string }> {
    const secretKey = this.config.get<string>('paystack.secretKey');

    if (!secretKey) {
      // Dev fallback: return mock resolved name
      this.logger.warn(
        'PAYSTACK_SECRET_KEY not set — returning mock account name',
      );
      const bank = NIGERIAN_BANKS.find((b) => b.code === dto.bankCode);
      return {
        accountName: 'John Doe (Test)',
        accountNumber: dto.accountNumber,
        bankCode: dto.bankCode,
      };
    }

    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${dto.accountNumber}&bank_code=${dto.bankCode}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );

    if (!res.ok) {
      const err = await res.json();
      throw new BadRequestException(err.message || 'Could not resolve account');
    }

    const data = await res.json();
    return {
      accountName: data.data.account_name,
      accountNumber: dto.accountNumber,
      bankCode: dto.bankCode,
    };
  }

  // ── POST /banks/transfer ──────────────────────────────────
  async bankTransfer(userId: string, dto: BankTransferDto) {
    // 1. Load user
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.stellarPublicKey || !user.stellarSecretEnc) {
      throw new BadRequestException('Wallet not initialised');
    }

    // 2. Verify PIN
    if (!user.pinHash) throw new BadRequestException('PIN not set');
    const pinOk = timingSafeEqual(
      Buffer.from(user.pinHash),
      Buffer.from(dto.pinHash),
    );
    if (!pinOk) throw new ForbiddenException('Incorrect PIN');

    // 3. Verify device
    const device = await this.deviceRepo.findOne({
      where: { deviceId: dto.deviceId, userId, isActive: true },
    });
    if (!device) throw new ForbiddenException('Device not recognised');

    // 4. Validate amount
    const amountNgn = parseFloat(dto.amountNgn);
    if (isNaN(amountNgn) || amountNgn < MIN_TRANSFER_NGN) {
      throw new BadRequestException(
        `Minimum transfer is ₦${MIN_TRANSFER_NGN.toLocaleString()}`,
      );
    }
    if (amountNgn > MAX_TRANSFER_NGN) {
      throw new BadRequestException(
        `Maximum transfer is ₦${MAX_TRANSFER_NGN.toLocaleString()}`,
      );
    }

    // 5. Calculate USDC needed
    const rate = await this.ratesService.getCurrentRate();
    const effectiveRate = parseFloat(rate.effectiveRate);
    const amountUsdc = ((amountNgn + TRANSFER_FEE_NGN) / effectiveRate).toFixed(
      6,
    );
    const feeUsdc = (TRANSFER_FEE_NGN / effectiveRate).toFixed(6);

    // 6. Check USDC balance
    const { usdc } = await blockchainService.getStellarBalance(key);  
    if (parseFloat(balance.usdc) < parseFloat(amountUsdc)) {
      throw new BadRequestException('Insufficient USDC balance');
    }

    // 7. Get bank name
    const bank = NIGERIAN_BANKS.find((b) => b.code === dto.bankCode);
    const bankName = bank?.name || dto.bankCode;

    // 8. Create pending records
    const reference = `CW-NGN-${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 16)}`;

    const transfer = await this.transferRepo.save(
      this.transferRepo.create({
        userId,
        accountNumber: dto.accountNumber,
        bankCode: dto.bankCode,
        bankName,
        accountName: dto.accountName,
        amountNgn: dto.amountNgn,
        amountUsdc,
        feeUsdc,
        rateApplied: rate.effectiveRate,
        reference,
      }),
    );

    const tx = await this.txService.create({
      userId,
      type: TxType.BANK_TRANSFER,
      status: TxStatus.PENDING,
      amountUsdc,
      amountNgn: dto.amountNgn,
      feeUsdc,
      rateApplied: rate.effectiveRate,
      recipientName: dto.accountName,
      accountNumber: dto.accountNumber,
      bankName,
      reference,
      description: `Withdrawal to ${dto.accountName} — ${bankName}`,
    });

    // 9. Debit USDC from Stellar wallet
    try {
      // Send USDC to platform wallet (which then sends NGN via Paystack)
      const platformWallet = this.config.get<string>(
        'stellar.platformWalletAddress',
      );
      if (platformWallet) {
        const txHash = await this.BlockchainService.sendUsdc({
          fromSecretEnc: user.stellarSecretEnc,
          toAddress: platformWallet,
          amountUsdc,
          memo: reference,
        });
        await this.txService.update(tx.id, { txHash });
      }
    } catch (err) {
      await this.transferRepo.update(
        { id: transfer.id },
        { status: BankTransferStatus.FAILED, failureReason: err.message },
      );
      await this.txService.update(tx.id, {
        status: TxStatus.FAILED,
        failureReason: err.message,
      });
      throw new BadRequestException(`USDC debit failed: ${err.message}`);
    }

    // 10. Initiate Paystack transfer
    try {
      const providerRef = await this.initiatePaystackTransfer({
        accountNumber: dto.accountNumber,
        bankCode: dto.bankCode,
        accountName: dto.accountName,
        amountNgn,
        reference,
      });

      await this.transferRepo.update(
        { id: transfer.id },
        {
          status: BankTransferStatus.PROCESSING,
          providerReference: providerRef,
        },
      );
      await this.txService.update(tx.id, { status: TxStatus.COMPLETED });
    } catch (err) {
      this.logger.error(
        `Paystack transfer failed for ${reference}: ${err.message}`,
      );
      await this.transferRepo.update(
        { id: transfer.id },
        {
          status: BankTransferStatus.FAILED,
          failureReason: err.message,
        },
      );
      await this.txService.update(tx.id, {
        status: TxStatus.FAILED,
        failureReason: err.message,
      });
      throw new BadRequestException(`Bank transfer failed: ${err.message}`);
    }

    return {
      reference,
      status: 'processing',
      amountNgn: dto.amountNgn,
      amountUsdc,
      usdcDeducted: amountUsdc,
      rateApplied: rate.effectiveRate,
      fee: String(TRANSFER_FEE_NGN),
      recipientName: dto.accountName,
      bankName,
      createdAt: transfer.createdAt,
    };
  }

  // ── Paystack transfer helper ──────────────────────────────
  private async initiatePaystackTransfer(params: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
    amountNgn: number;
    reference: string;
  }): Promise<string> {
    const secretKey = this.config.get<string>('paystack.secretKey');

    if (!secretKey) {
      this.logger.warn(
        'PAYSTACK_SECRET_KEY not configured — skipping actual transfer',
      );
      return `MOCK-${params.reference}`;
    }

    // Step 1: Create transfer recipient
    const recipientRes = await fetch(
      'https://api.paystack.co/transferrecipient',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: params.accountName,
          account_number: params.accountNumber,
          bank_code: params.bankCode,
          currency: 'NGN',
        }),
      },
    );

    if (!recipientRes.ok) {
      const err = await recipientRes.json();
      throw new Error(err.message || 'Failed to create transfer recipient');
    }

    const recipient = await recipientRes.json();
    const recipientCode = recipient.data.recipient_code;

    // Step 2: Initiate transfer
    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: params.amountNgn * 100, // Paystack uses kobo
        recipient: recipientCode,
        reason: `Cheese Wallet withdrawal — ${params.reference}`,
        reference: params.reference,
      }),
    });

    if (!transferRes.ok) {
      const err = await transferRes.json();
      throw new Error(err.message || 'Transfer initiation failed');
    }

    const transfer = await transferRes.json();
    return transfer.data.transfer_code;
  }
}
