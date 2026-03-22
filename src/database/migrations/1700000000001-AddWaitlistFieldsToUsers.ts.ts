import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWaitlistFieldsToUsers1700000000000000000000001 implements MigrationInterface {
  name = 'AddWaitlistFieldsToUsers1700000000000000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // referral_code — unique 8-char nanoid assigned at registration
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "referral_code" VARCHAR(20) DEFAULT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_referral_code"
      ON "users" ("referral_code")
      WHERE "referral_code" IS NOT NULL
    `);

    // referred_by — UUID of the user who referred this user
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "referred_by" VARCHAR DEFAULT NULL
    `);

    // points — total earned points, incremented atomically by PointsAwardAgent
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0
    `);

    // is_flagged — set by FraudDetectionAgent; hides user from leaderboard
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "is_flagged" BOOLEAN NOT NULL DEFAULT FALSE
    `);

    // ip_address — captured at registration for fraud detection
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_referral_code"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "ip_address"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "is_flagged"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "points"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referred_by"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referral_code"`);
  }
}