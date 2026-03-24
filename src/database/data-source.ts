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

const databaseUrl = process.env.DATABASE_URL;
const usePostgres = !!databaseUrl || !!process.env.DB_HOST;

let dataSourceConfig: any;

if (databaseUrl) {
  // Use DATABASE_URL if provided (for production/Railway)
  dataSourceConfig = {
    type: 'postgres',
    url: databaseUrl,
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
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
} else {
  // Local development: use SQLite (no server required)
  // Exclude blockchain entities that use enums not supported by SQLite
  // Skip migrations for local dev - use synchronize instead
  dataSourceConfig = {
    type: 'sqlite',
    database: (process.env.DB_NAME || 'cheese_wallet') + '.db',
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
      // BlockchainWallet,    // Excluded: uses enums
      // BlockchainTransaction, // Excluded: uses enums
    ],
    // migrations: [join(__dirname, 'migrations/*.{ts,js}')], // Disabled for local SQLite
    synchronize: true, // Use synchronize for local development
  };
}

export const AppDataSource = new DataSource(dataSourceConfig);