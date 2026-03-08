// src/cards/cards.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { StellarModule } from '../stellar/stellar.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { VirtualCard } from './entities/virtual-card.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VirtualCard, User]),
    StellarModule,
    TransactionsModule,
  ],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
