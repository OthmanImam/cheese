import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
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
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASS     || 'postgres',
  database: process.env.DB_NAME     || 'cheese_pay',
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
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});