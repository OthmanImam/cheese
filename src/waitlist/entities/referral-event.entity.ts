import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export const REFERRAL_POINTS = 20;

@Entity('referral_events')
export class ReferralEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'referrer_id' })
  referrerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrer_id' })
  referrer: User;

  @Index()
  @Column({ name: 'referred_user_id' })
  referredUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referred_user_id' })
  referredUser: User;

  @Column({ type: 'int', default: 20, name: 'points_awarded' })
  pointsAwarded: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}