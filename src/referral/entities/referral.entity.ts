// src/referral/entities/referral.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum ReferralStatus {
  PENDING = 'pending', // referree signed up but not KYC verified
  QUALIFIED = 'qualified', // referree completed first transaction
  REWARDED = 'rewarded', // reward credited to referrer
}

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'referrer_id' })
  referrerId: string;

  @Column({ name: 'referee_id', unique: true })
  refereeId: string;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  // Reward amount in USDC credited to referrer
  @Column({
    name: 'reward_usdc',
    type: 'decimal',
    precision: 20,
    scale: 6,
    nullable: true,
  })
  rewardUsdc: string | null;

  @Column({ name: 'rewarded_at', nullable: true })
  rewardedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  referrer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  referee: User;
}
