// src/send/send.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Device } from '../devices/entities/device.entity';
import { StellarModule } from '../stellar/stellar.module';
import { RatesModule } from '../rates/rates.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { SendController } from './send.controller';
import { SendService } from './send.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Device]),
    StellarModule,
    RatesModule,
    TransactionsModule,
  ],
  controllers: [SendController],
  providers: [SendService],
})
export class SendModule {}
