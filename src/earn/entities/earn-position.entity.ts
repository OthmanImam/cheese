// src/earn/entities/earn-position.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum EarnStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
}

@Entity('earn_positions')
export class EarnPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: EarnStatus, default: EarnStatus.ACTIVE })
  status: EarnStatus;

  // Principal deposited into earn
  @Column({
    name: 'principal_usdc',
    type: 'decimal',
    precision: 20,
    scale: 6,
    default: 0,
  })
  principalUsdc: string;

  // Accumulated yield not yet credited
  @Column({
    name: 'pending_yield_usdc',
    type: 'decimal',
    precision: 20,
    scale: 6,
    default: 0,
  })
  pendingYieldUsdc: string;

  // Lifetime total yield earned
  @Column({
    name: 'total_yield_usdc',
    type: 'decimal',
    precision: 20,
    scale: 6,
    default: 0,
  })
  totalYieldUsdc: string;

  // APY applied at last calculation — stored for display
  @Column({
    name: 'current_apy',
    type: 'decimal',
    precision: 6,
    scale: 4,
    default: 5.0,
  })
  currentApy: string;

  @Column({ name: 'last_yield_at', nullable: true })
  lastYieldAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
