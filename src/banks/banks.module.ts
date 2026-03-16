// src/banks/banks.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Device } from '../devices/entities/device.entity';
import { BlockchainService } from '../blockchain/services/blockchain.service';
import { RatesModule } from '../rates/rates.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';
import { BankTransfer } from './entities/bank-transfer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Device, BankTransfer]),
    BlockchainService,
    RatesModule,
    TransactionsModule,
  ],
  controllers: [BanksController],
  providers: [BanksService],
  exports: [BanksService],
})
export class BanksModule {}
