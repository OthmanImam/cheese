// src/database/migrations/1700000000007-FixWaitlistEntryColumns.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixWaitlistEntryColumns1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "waitlist_entries"
        ADD COLUMN IF NOT EXISTS "status" varchar DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "referral_source" varchar,
        ADD COLUMN IF NOT EXISTS "referrer_id" uuid,
        ADD COLUMN IF NOT EXISTS "ip_address" varchar,
        ADD COLUMN IF NOT EXISTS "notified_at" bigint,
        ADD COLUMN IF NOT EXISTS "converted_at" bigint
    `);

    try {
      await queryRunner.query(`ALTER TABLE "waitlist_entries" RENAME COLUMN "referredBy" TO "referred_by"`);
    } catch {}

    try {
      await queryRunner.query(`ALTER TABLE "waitlist_entries" DROP COLUMN IF EXISTS "isConverted"`);
    } catch {}

    try {
      await queryRunner.query(`ALTER TABLE "waitlist_entries" DROP COLUMN IF EXISTS "updatedAt"`);
    } catch {}

    try {
      await queryRunner.query(`ALTER TABLE "waitlist_entries" DROP COLUMN IF EXISTS "updated_at"`);
    } catch {}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "waitlist_entries"
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "referral_source",
        DROP COLUMN IF EXISTS "referrer_id",
        DROP COLUMN IF EXISTS "ip_address",
        DROP COLUMN IF EXISTS "notified_at",
        DROP COLUMN IF EXISTS "converted_at"
    `);
  }
}