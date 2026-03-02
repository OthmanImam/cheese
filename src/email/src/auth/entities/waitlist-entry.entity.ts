import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('waitlist_entries')
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Index({ unique: true })
  @Column({ length: 24 })
  username: string;

  @Column({ name: 'referral_code', length: 64, nullable: true })
  referralCode: string | null;

  @Column({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
