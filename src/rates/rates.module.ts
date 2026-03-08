// src/rates/rates.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { RatesController } from './rates.controller';
import { RatesService } from './rates.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRate])],
  controllers: [RatesController],
  providers: [RatesService],
  exports: [RatesService],
})
export class RatesModule {}
