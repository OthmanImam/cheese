import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReferralEvents1700000003 implements MigrationInterface {
  name = 'CreateReferralEvents1700000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "referral_events" (
        "id"               UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "referrer_id"      UUID        NOT NULL,
        "referred_user_id" UUID        NOT NULL,
        "points_awarded"   INTEGER     NOT NULL DEFAULT 20,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),

        CONSTRAINT "PK_referral_events" PRIMARY KEY ("id"),

        CONSTRAINT "FK_referral_events_referrer_id"
          FOREIGN KEY ("referrer_id")
          REFERENCES "users" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "FK_referral_events_referred_user_id"
          FOREIGN KEY ("referred_user_id")
          REFERENCES "users" ("id")
          ON DELETE CASCADE,

        -- a user can only be referred once
        CONSTRAINT "UQ_referral_events_referred_user_id"
          UNIQUE ("referred_user_id")
      )
    `);

    // index on referrer_id — used by getUserPoints to count how many referrals a user made
    await queryRunner.query(`
      CREATE INDEX "IDX_referral_events_referrer_id"
      ON "referral_events" ("referrer_id")
    `);

    // index on referred_user_id — used to quickly check if a user was already referred
    await queryRunner.query(`
      CREATE INDEX "IDX_referral_events_referred_user_id"
      ON "referral_events" ("referred_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_referral_events_referred_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_referral_events_referrer_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_events"`);
  }
}