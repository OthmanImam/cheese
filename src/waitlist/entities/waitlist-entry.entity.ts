// src/waitlist/entities/waitlist-entry.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Index } from 'typeorm'

export enum WaitlistStatus {
  PENDING   = 'pending',    // waiting for launch
  NOTIFIED  = 'notified',   // launch email sent
  CONVERTED = 'converted',  // signed up as full user
}

@Entity('waitlist_entries')
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index({ unique: true })
  @Column()
  email: string

  @Index({ unique: true })
  @Column()
  username: string

  @Column({ type: 'enum', enum: WaitlistStatus, default: WaitlistStatus.PENDING })
  status: WaitlistStatus

  // Position in queue — assigned on signup
  @Column({ nullable: true })
  position: number | null

  @Column({ name: 'referral_source', nullable: true })
  referralSource: string | null

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string | null

  @Column({ name: 'notified_at', nullable: true })
  notifiedAt: Date | null

  @Column({ name: 'converted_at', nullable: true })
  convertedAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
