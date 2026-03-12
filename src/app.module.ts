// src/app.module.ts — ALL PHASES (1-7)
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import {
  appConfig,
  dbConfig,
  jwtConfig,
  otpConfig,
  ratesConfig,
  redisConfig,
  stellarConfig,
} from './config/app.config';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAccessGuard } from './auth/guards/jwt.guard';

import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';
import { WalletModule } from './wallet/wallet.module';
import { RatesModule } from './rates/rates.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SendModule } from './send/send.module';
import { OtpModule } from './otp/otp.module';
import { StellarModule } from './stellar/stellar.module';
import { BanksModule } from './banks/banks.module';
import { CardsModule } from './cards/cards.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProfileModule } from './profile/profile.module';
import { EarnModule } from './earn/earn.module';
import { ReferralModule } from './referral/referral.module';
import { EmailModule } from './email/email.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { PayLinkModule } from './paylink/paylink.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AgentsModule } from './agents/agents.module';

import { User } from './auth/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { Device } from './devices/entities/device.entity';
import { Otp } from './otp/entities/otp.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { ExchangeRate } from './rates/entities/exchange-rate.entity';
import { BankTransfer } from './banks/entities/bank-transfer.entity';
import { VirtualCard } from './cards/entities/virtual-card.entity';
import { Notification } from './notifications/entities/notification.entity';
import { EarnPosition } from './earn/entities/earn-position.entity';
import { Referral } from './referral/entities/referral.entity';
import { ShareEvent } from './waitlist/entities/share-event.entity';
import { ReferralEvent } from './waitlist/entities/referral-event.entity';
import { PaymentRequest } from './paylink/entities/payment-request.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        dbConfig,
        jwtConfig,
        redisConfig,
        stellarConfig,
        otpConfig,
        ratesConfig,
      ],
      // email config is registered inside emailConfig in app.config.ts
      envFilePath: ['.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL', 60) * 1000,
          limit: config.get('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    // Only load BullModule if Redis is configured
    ...(process.env.REDIS_HOST
      ? [
          BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              connection: {
                host: config.get('redis.host'),
                port: config.get('redis.port', 6379),
                password: config.get('redis.password'),
              },
            }),
          }),
        ]
      : []),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // choose postgres if DB_HOST or DATABASE_URL provided, otherwise fall back to sqlite
        const usePostgres = !!config.get('db.host') || !!config.get('DATABASE_URL');
        const type = usePostgres ? 'postgres' : 'sqlite';

        return {
          type,
          host: config.get('db.host'),
          port: config.get('db.port'),
          username: config.get('db.user'),
          password: config.get('db.password'),
          database: usePostgres
            ? config.get('db.name')
            : (config.get('db.name') + '.db'),
          entities: [
            User,
            RefreshToken,
            Device,
            Otp,
            Transaction,
            ExchangeRate,
            // BankTransfer,
            // VirtualCard,
            // Notification,
            // EarnPosition,
            // Referral,
            ShareEvent,
            ReferralEvent,
            // PaymentRequest,
          ],
          synchronize: config.get('app.nodeEnv') !== 'production',
          logging: config.get('app.nodeEnv') === 'development',
          ssl:
            config.get('app.nodeEnv') === 'production'
              ? { rejectUnauthorized: false }
              : false,
        } as any;
      },
    }),
    // Phase 1
    AuthModule,
    DevicesModule, OtpModule, StellarModule,
    // Phase 2
    WalletModule, RatesModule, TransactionsModule,
    // Phase 3
    // SendModule,
    // Phase 4
    // BanksModule,
    // Phase 5
    // CardsModule,
    // Phase 6
    // NotificationsModule, ProfileModule,
    // Phase 7
    // EarnModule, ReferralModule,
    // Email + Waitlist + PayLink
    WaitlistModule,
    LeaderboardModule,
    AgentsModule,
    // EmailModule, PayLinkModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAccessGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
