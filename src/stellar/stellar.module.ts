// src/stellar/stellar.module.ts
import { Module } from '@nestjs/common';
import { StellarService } from './stellar.service';

@Module({
  providers: [StellarService],
  exports: [StellarService],
})
export class StellarModule {}
