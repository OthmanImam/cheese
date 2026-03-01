import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReferralStatus {
  PENDING   = 'pending',    // Referee registered
  QUALIFIED = 'qualified',  // Referee hit funding threshold
  REWARDED  = 'rewarded',   // Reward issued to referrer
  EXPIRED   = 'expired',    // Referee never funded in time
}

@Entity('referrals')
@Index('IDX_referrals_referrer', ['referrerId'])
@Index('IDX_referrals_status',   ['status'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  referrerId: string;

  /** Each user can only be referred once */
  @Column({ type: 'uuid', unique: true })
  @Index('UQ_referrals_referee')
  refereeId: string;

  @Column({ type: 'varchar', length: 16 })
  referralCode: string;

  @Column({ type: 'enum', enum: ReferralStatus, default: ReferralStatus.PENDING })
  status: ReferralStatus;

  @Column({ type: 'timestamptz', nullable: true })
  qualifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  rewardedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  rewardAmountCents: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.referrals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  referrer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'refereeId' })
  referee: User;
}
