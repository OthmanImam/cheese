// src/paylink/entities/payment-request.entity.ts
import {
  Column, CreateDateColumn, Entity, Index,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

export enum PayLinkStatus {
  PENDING   = 'pending',    // awaiting payment
  PAID      = 'paid',       // payment confirmed on-chain
  EXPIRED   = 'expired',    // passed expiry without payment
  CANCELLED = 'cancelled',  // creator cancelled before payment
}

@Entity('payment_requests')
export class PaymentRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // ── Creator (who is requesting money) ────────────────────
  @Column({ name: 'creator_id' })
  creatorId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  creator: User

  // ── Payer (null until someone pays) ──────────────────────
  @Column({ name: 'payer_id', nullable: true })
  payerId: string | null

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  payer: User | null

  // ── Link token — the secret part of the URL ───────────────
  @Index({ unique: true })
  @Column()
  token: string

  // ── Amount in USDC ────────────────────────────────────────
  @Column({ name: 'amount_usdc', type: 'decimal', precision: 20, scale: 6 })
  amountUsdc: string

  // Optional note the creator attaches ("Dinner split", "rent")
  @Column({ nullable: true, length: 140 })
  note: string | null

  // ── Status ────────────────────────────────────────────────
  @Column({ type: 'enum', enum: PayLinkStatus, default: PayLinkStatus.PENDING })
  status: PayLinkStatus

  // ── Expiry — default 7 days ───────────────────────────────
  @Column({ name: 'expires_at' })
  expiresAt: Date

  // ── Settled transaction reference ────────────────────────
  @Column({ name: 'settled_tx_id', nullable: true })
  settledTxId: string | null

  // Stellar on-chain hash once paid
  @Column({ name: 'settled_tx_hash', nullable: true })
  settledTxHash: string | null

  @Column({ name: 'paid_at', nullable: true })
  paidAt: Date | null

  // IP of whoever paid (for fraud logging)
  @Column({ name: 'payer_ip', nullable: true })
  payerIp: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
