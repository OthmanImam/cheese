// src/wallet/wallet.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarModule } from '../stellar/stellar.module';
import { RatesModule } from '../rates/rates.module';
import { User } from '../auth/entities/user.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StellarModule, RatesModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
