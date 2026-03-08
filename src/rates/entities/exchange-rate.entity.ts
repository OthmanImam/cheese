// src/rates/entities/exchange-rate.entity.ts
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usd_to_ngn', type: 'decimal', precision: 12, scale: 4 })
  usdToNgn: string;

  @Column({ name: 'effective_rate', type: 'decimal', precision: 12, scale: 4 })
  effectiveRate: string;

  @Column({ name: 'spread_percent', type: 'decimal', precision: 5, scale: 2 })
  spreadPercent: string;

  @Column()
  source: string;

  @CreateDateColumn({ name: 'fetched_at' })
  fetchedAt: Date;
}
