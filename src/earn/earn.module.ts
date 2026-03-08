// src/earn/earn.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { StellarModule } from '../stellar/stellar.module';
import { RatesModule } from '../rates/rates.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EarnController } from './earn.controller';
import { EarnService } from './earn.service';
import { EarnPosition } from './entities/earn-position.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EarnPosition, User]),
    StellarModule,
    RatesModule,
    TransactionsModule,
    NotificationsModule,
  ],
  controllers: [EarnController],
  providers: [EarnService],
  exports: [EarnService],
})
export class EarnModule {}
