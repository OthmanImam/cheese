// src/database/migrations/1700000000005-AddMissingUserColumns.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingUserColumns1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "phone" varchar UNIQUE,
        ADD COLUMN IF NOT EXISTS "pin_hash" varchar,
        ADD COLUMN IF NOT EXISTS "kyc_status" varchar DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "tier" varchar DEFAULT 'silver',
        ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true,
        ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "phone_verified" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "referral_code" varchar(20) UNIQUE,
        ADD COLUMN IF NOT EXISTS "referred_by" varchar,
        ADD COLUMN IF NOT EXISTS "points" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "is_flagged" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "ip_address" varchar,
        ADD COLUMN IF NOT EXISTS "stellar_public_key" varchar UNIQUE,
        ADD COLUMN IF NOT EXISTS "stellar_secret_enc" text,
        ADD COLUMN IF NOT EXISTS "evm_address" varchar UNIQUE,
        ADD COLUMN IF NOT EXISTS "full_name" varchar,
        ADD COLUMN IF NOT EXISTS "password_hash" varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "phone",
        DROP COLUMN IF EXISTS "pin_hash",
        DROP COLUMN IF EXISTS "kyc_status",
        DROP COLUMN IF EXISTS "tier",
        DROP COLUMN IF EXISTS "is_active",
        DROP COLUMN IF EXISTS "email_verified",
        DROP COLUMN IF EXISTS "phone_verified",
        DROP COLUMN IF EXISTS "referral_code",
        DROP COLUMN IF EXISTS "referred_by",
        DROP COLUMN IF EXISTS "points",
        DROP COLUMN IF EXISTS "is_flagged",
        DROP COLUMN IF EXISTS "ip_address",
        DROP COLUMN IF EXISTS "stellar_public_key",
        DROP COLUMN IF EXISTS "stellar_secret_enc",
        DROP COLUMN IF EXISTS "evm_address",
        DROP COLUMN IF EXISTS "full_name",
        DROP COLUMN IF EXISTS "password_hash"
    `);
  }
}