import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BlockchainModule } from './blockchain/blockchain.module';
import { BlockchainWallet } from './blockchain/entities/blockchain-wallet.entity';
import { BlockchainTransaction } from './blockchain/entities/blockchain-transaction.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:        'postgres',
        host:         config.getOrThrow('DB_HOST'),
        port:         parseInt(config.getOrThrow('DB_PORT'), 10),
        database:     config.getOrThrow('DB_NAME'),
        username:     config.getOrThrow('DB_USER'),
        password:     config.getOrThrow('DB_PASSWORD'),
        entities:     [BlockchainWallet, BlockchainTransaction],
        migrations:   ['dist/database/migrations/*.js'],
        migrationsRun: false,
        synchronize:   false, // never use true in production
        logging:       config.get('NODE_ENV') === 'development',
        ssl:           config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),

    ThrottlerModule.forRoot([{
      ttl:   60_000,
      limit: 60,
    }]),

    ScheduleModule.forRoot(),

    BlockchainModule,
  ],
})
export class AppModule {}
