// src/auth/entities/user.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Device } from '../../devices/entities/device.entity';
import { RefreshToken } from './refresh-token.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum KycStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}
export enum Tier {
  SILVER = 'silver',
  GOLD = 'gold',
  BLACK = 'black',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phone: string;

  @Column({ unique: true })
  username: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Exclude()
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Exclude()
  @Column({ name: 'pin_hash', nullable: true })
  pinHash: string | null;

  @Column({
    name: 'kyc_status',
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  kycStatus: KycStatus;

  @Column({ type: 'enum', enum: Tier, default: Tier.SILVER })
  tier: Tier;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified: boolean;

  // Stellar custodial wallet
  @Column({ name: 'stellar_public_key', nullable: true, unique: true })
  stellarPublicKey: string | null;

  @Exclude()
  @Column({ name: 'stellar_secret_enc', nullable: true, type: 'text' })
  stellarSecretEnc: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Device, (d) => d.user, { cascade: true })
  devices: Device[];

  @OneToMany(() => RefreshToken, (rt) => rt.user, { cascade: true })
  refreshTokens: RefreshToken[];

  @OneToMany(() => Transaction, (tx) => tx.user)
  transactions: Transaction[];
}
