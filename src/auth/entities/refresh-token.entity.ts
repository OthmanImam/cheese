// src/auth/entities/refresh-token.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'token_hash', unique: true })
  tokenHash: string;

  @Column({ name: 'device_id', nullable: true })
  deviceId: string | null;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.refreshTokens, { onDelete: 'CASCADE' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;
}
