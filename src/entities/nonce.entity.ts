import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * Replay Attack Prevention via Nonce Table
 *
 * Each signed request carries a client-generated UUID v4 nonce.
 * Backend records it and rejects any re-submission within the
 * SIGNATURE_WINDOW (5 minutes).
 *
 * After the window, nonces are purged by a scheduled job.
 *
 * Production alternative: Redis SET with TTL per nonce key.
 *   SETNX nonce:{uuid} 1 EX 300
 *   If SETNX returns 0 → replay, reject immediately.
 * This removes DB load and scheduled cleanup entirely.
 */
@Entity('signature_nonces')
@Index('UQ_nonces_value', ['nonce'], { unique: true })
@Index('IDX_nonces_expires', ['expiresAt'])
export class SignatureNonce {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The client-submitted nonce UUID (must be unique within TTL window) */
  @Column({ type: 'uuid', unique: true })
  nonce: string;

  @Column({ type: 'uuid' })
  @Index('IDX_nonces_device_id')
  deviceId: string;

  @Column({ type: 'uuid' })
  userId: string;

  /** The action string from the signed payload — for audit context */
  @Column({ type: 'varchar', length: 100 })
  action: string;

  /** NOW() + SIGNATURE_WINDOW_SECONDS — used by cleanup job */
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
