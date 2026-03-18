// src/waitlist/entities/waitlist-entry.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

export enum WaitlistStatus {
  PENDING = 'pending', // waiting for launch
  NOTIFIED = 'notified', // launch email sent
  CONVERTED = 'converted', // signed up as full user
}

@Entity('waitlist_entries')
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Index({ unique: true })
  @Column()
  username: string;

  @Column({
    type: 'varchar',
    default: WaitlistStatus.PENDING,
  })
  status: WaitlistStatus;

  // Position in queue — assigned on signup
  @Column({ type: 'integer', nullable: true })
  position: number | null;

  @Column({ name: 'referral_source', type: 'varchar', nullable: true })
  referralSource: string | null;

  @Column({ name: 'referral_code', type: 'varchar', nullable: true })
  referralCode: string | null;

  @Column({ name: 'referred_by', type: 'uuid', nullable: true })
  referredBy: string | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'notified_at', type: 'bigint', nullable: true, transformer: {
    from: (value: string | number | null) => value ? new Date(Number(value)) : null,
    to: (value: Date | null) => value ? value.getTime().toString() : null,
  } })
  notifiedAt: Date | null;

  @Column({ name: 'converted_at', type: 'bigint', nullable: true, transformer: {
    from: (value: string | number | null) => value ? new Date(Number(value)) : null,
    to: (value: Date | null) => value ? value.getTime().toString() : null,
  } })
  convertedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
