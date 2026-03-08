// src/transactions/entities/transaction.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum TxType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  SEND_USERNAME = 'send_username',
  SEND_ADDRESS = 'send_address',
  BANK_TRANSFER = 'bank_transfer',
  YIELD_CREDIT = 'yield_credit',
  REFERRAL_BONUS = 'referral_bonus',
  CARD_PAYMENT = 'card_payment',
  FEE = 'fee',
  PAY_REQUEST = 'pay_request', // payment via PayLink
}

export enum TxStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: TxType })
  type: TxType;

  @Column({ type: 'enum', enum: TxStatus, default: TxStatus.PENDING })
  status: TxStatus;

  // Amount in USDC — stored as string to preserve decimals
  @Column({ name: 'amount_usdc', type: 'decimal', precision: 20, scale: 6 })
  amountUsdc: string;

  // NGN equivalent at time of transaction
  @Column({
    name: 'amount_ngn',
    type: 'decimal',
    precision: 20,
    scale: 2,
    nullable: true,
  })
  amountNgn: string | null;

  @Column({
    name: 'fee_usdc',
    type: 'decimal',
    precision: 20,
    scale: 6,
    default: 0,
  })
  feeUsdc: string;

  @Column({
    name: 'rate_applied',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  rateApplied: string | null;

  // Send / Receive party
  @Column({ name: 'recipient_username', nullable: true })
  recipientUsername: string | null;

  @Column({ name: 'recipient_address', nullable: true })
  recipientAddress: string | null;

  @Column({ name: 'recipient_name', nullable: true })
  recipientName: string | null;

  @Column({ name: 'bank_name', nullable: true })
  bankName: string | null;

  @Column({ name: 'account_number', nullable: true })
  accountNumber: string | null;

  // Stellar on-chain
  @Column({ name: 'tx_hash', nullable: true, unique: true })
  txHash: string | null;

  @Column({ nullable: true })
  network: string | null;

  @Column({ unique: true })
  reference: string;

  @Column({ nullable: true })
  description: string | null;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (u) => u.transactions, { onDelete: 'CASCADE' })
  user: User;
}
