import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// ── Feature modules ───────────────────────────────────────────────────────────
import { BlockchainModule } from './blockchain/blockchain.module';
import { AuthModule } from './auth/auth.module';
import { AccountingModule } from './accounting/accounting.module';
import { DevicesModule } from './devices/devices.module';

// ── Auth entities ─────────────────────────────────────────────────────────────
import { User }                 from './users/entities/user.entity';
import { Otp }                  from './otp/entities/otp.entity';
import { RefreshToken }         from './tokens/entities/refresh-token.entity';
import { Referral }             from './referrals/entities/referral.entity';
import { WaitlistReservation }  from './waitlist/entities/waitlist-reservation.entity';

// ── Accounting entities ───────────────────────────────────────────────────────
import { Account }      from './accounting/entities/account.entity';
import { Transaction }  from './accounting/entities/transaction.entity';
import { LedgerEntry }  from './accounting/entities/ledger-entry.entity';

// ── Blockchain entities ───────────────────────────────────────────────────────
import { BlockchainWallet }      from './blockchain/entities/blockchain-wallet.entity';
import { BlockchainTransaction } from './blockchain/entities/blockchain-transaction.entity';

// ── Device entities ───────────────────────────────────────────────────────────
import { Device }          from './devices/entities/device.entity';
import { SignatureNonce }  from './nonces/entities/nonce.entity';

// ── Cross-cutting ─────────────────────────────────────────────────────────────
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DecimalSerializerInterceptor } from './common/interceptors/decimal-serializer.interceptor';
import appConfig from './config/app.config';

/**
 * Root application module — Cheese Wallet.
 *
 * ── Module load order ─────────────────────────────────────────────────────────
 *
 *   1. BlockchainModule — owns the single ethers.js provider + signer.
 *      Provides BlockchainService, WalletService, BlockchainTransactionService,
 *      and BlockchainScheduler. No upstream deps.
 *
 *   2. AuthModule — wallet creation fires inside verifyOtp(). Needs WalletService
 *      exported from BlockchainModule.
 *      TODO: remove self-provided BlockchainService and import BlockchainModule:
 *        providers: remove BlockchainService
 *        exports:   remove BlockchainService
 *        imports:   add BlockchainModule
 *
 *   3. AccountingModule — every USDC debit/credit/balance check goes through
 *      WalletService from BlockchainModule.
 *      TODO: same change as AuthModule above.
 *
 *   4. DevicesModule — ed25519/secp256k1 device key registration, signature
 *      verification, and replay-attack prevention via SignatureNonce table.
 *      No upstream deps.
 *
 *   Until the TODO above is applied, AuthModule and AccountingModule each open
 *   their own ethers.js RPC connection at boot (three total). After the fix,
 *   a single connection is shared via NestJS module deduplication.
 *
 * ── Schedulers registered across all modules ─────────────────────────────────
 *
 *   BlockchainScheduler (BlockchainModule)
 *     — Retries PENDING wallet creations every 2 minutes
 *     — Alerts on stuck SUBMITTED transactions every 10 minutes
 *     — Daily blockchain health report at midnight
 *
 *   DevicesScheduler (DevicesModule)
 *     — Purges expired signature nonces periodically
 *
 *   AuthScheduler (AuthModule) — FILE EXISTS but NOT YET REGISTERED in
 *   auth.module.ts providers. Once registered it will:
 *     — Purge expired OTPs every hour
 *     — Purge old revoked refresh tokens at 3 AM daily
 *   To activate: add AuthScheduler to auth.module.ts providers array.
 *
 * ── Database ──────────────────────────────────────────────────────────────────
 *
 *   TypeOrmModule.forRoot() here owns the single Postgres connection.
 *   All 12 entities (5 auth + 3 accounting + 2 blockchain + 2 device) are
 *   registered in one place so TypeORM builds one coherent migration graph.
 *   Feature modules call TypeOrmModule.forFeature() only to register repos.
 */
@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal:    true,
      envFilePath: ['.env.local', '.env'],
      load:        [appConfig],
      validate: (raw: Record<string, unknown>) => {
        const required: string[] = [
          // Database
          'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
          // Auth / JWT
          'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'WAITLIST_TOKEN_SECRET',
          // Blockchain
          'BLOCKCHAIN_RPC_URL', 'PLATFORM_WALLET_PRIVATE_KEY', 'WALLET_CONTRACT_ADDRESS',
        ];
        const missing = required.filter((k) => !raw[k]);
        if (missing.length) {
          throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        return raw;
      },
    }),

    // ── Database ─────────────────────────────────────────────────────────────
    // Single Postgres connection shared by all modules.
    // All 12 entities are registered here so TypeORM has full schema visibility.
    TypeOrmModule.forRootAsync({
      inject:     [ConfigService],
      useFactory: (cs: ConfigService) => ({
        type:     'postgres',
        host:     cs.getOrThrow<string>('DB_HOST'),
        port:     parseInt(cs.getOrThrow<string>('DB_PORT'), 10),
        database: cs.getOrThrow<string>('DB_NAME'),
        username: cs.getOrThrow<string>('DB_USER'),
        password: cs.getOrThrow<string>('DB_PASSWORD'),
        ssl: cs.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: cs.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false' }
          : false,

        // ── Entities ───────────────────────────────────────────────────────
        // Auth (5):       User, Otp, RefreshToken, Referral, WaitlistReservation
        // Accounting (3): Account, Transaction, LedgerEntry
        // Blockchain (2): BlockchainWallet, BlockchainTransaction
        // Device (2):     Device, SignatureNonce
        entities: [
          User, Otp, RefreshToken, Referral, WaitlistReservation,
          Account, Transaction, LedgerEntry,
          BlockchainWallet, BlockchainTransaction,
          Device, SignatureNonce,
        ],

        // Run migrations via CLI in CI/CD, not automatically at boot.
        // Set DB_RUN_MIGRATIONS=true only in ephemeral/review environments.
        migrations:    [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: cs.get<string>('DB_RUN_MIGRATIONS') === 'true',
        synchronize:   false, // NEVER true in production

        logging: cs.get<string>('NODE_ENV') === 'development'
          ? ['query', 'error', 'warn', 'migration']
          : ['error', 'warn', 'migration'],

        extra: {
          // pg pool — rule of thumb: max = (vCPU count × 2) + disk spindles
          max:                     parseInt(cs.get<string>('DB_POOL_MAX')              ?? '20',    10),
          min:                     parseInt(cs.get<string>('DB_POOL_MIN')              ?? '2',     10),
          idleTimeoutMillis:       parseInt(cs.get<string>('DB_IDLE_TIMEOUT_MS')      ?? '30000', 10),
          connectionTimeoutMillis: parseInt(cs.get<string>('DB_CONNECT_TIMEOUT_MS')   ?? '5000',  10),
          statement_timeout:       parseInt(cs.get<string>('DB_STATEMENT_TIMEOUT_MS') ?? '30000', 10),
        },
      }),
    }),

    // ── Rate limiting ─────────────────────────────────────────────────────────
    // Global default: 60 requests / 60 s per IP.
    // Per-route overrides use @Throttle({ default: { ttl, limit } }).
    ThrottlerModule.forRootAsync({
      inject:     [ConfigService],
      useFactory: (cs: ConfigService) => ({
        throttlers: [{
          ttl:   parseInt(cs.get<string>('THROTTLE_TTL')   ?? '60000', 10),
          limit: parseInt(cs.get<string>('THROTTLE_LIMIT') ?? '60',    10),
        }],
      }),
    }),

    // ── Scheduler (all background jobs) ───────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Feature modules (load order matters — see header comment) ─────────────
    BlockchainModule,  // 1st — RPC connection, WalletService, BlockchainScheduler
    AuthModule,        // 2nd — OTP verify calls WalletService.createWallet()
    AccountingModule,  // 3rd — debit/credit/balance via WalletService
    DevicesModule,     // 4th — device key registration + signature verification
  ],

  providers: [
    // JWT guard applied globally. Decorate public routes with @Public().
    { provide: APP_GUARD,       useClass: JwtAuthGuard                },

    // Unified error envelope: { success, statusCode, code, message, timestamp, path }
    { provide: APP_FILTER,      useClass: GlobalExceptionFilter       },

    // Serialises all NUMERIC/DECIMAL values as strings in every API response.
    // Prevents IEEE 754 float precision loss on financial amounts.
    { provide: APP_INTERCEPTOR, useClass: DecimalSerializerInterceptor },
  ],
})
export class AppModule {}
