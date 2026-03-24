import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

import { User } from '../auth/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Device } from '../devices/entities/device.entity';
import { Otp } from '../otp/entities/otp.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ExchangeRate } from '../rates/entities/exchange-rate.entity';
import { ShareEvent } from '../waitlist/entities/share-event.entity';
import { ReferralEvent } from '../waitlist/entities/referral-event.entity';
import { WaitlistEntry } from '../waitlist/entities/waitlist-entry.entity';
import { BlockchainWallet } from '../blockchain/entities/blockchain-wallet.entity';
import { BlockchainTransaction } from '../blockchain/entities/blockchain-transaction.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User,
    RefreshToken,
    Device,
    Otp,
    Transaction,
    ExchangeRate,
    ShareEvent,
    ReferralEvent,
    WaitlistEntry,
    BlockchainWallet,
    BlockchainTransaction,
  ],
  migrations: [join(__dirname, 'migrations/*.{ts,js}')],
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  synchronize: false,
});
