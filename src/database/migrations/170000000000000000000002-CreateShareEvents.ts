import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShareEvents170000000000000000002 implements MigrationInterface {
  name = 'CreateShareEvents1700000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "share_events" (
        "id"             UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"        UUID          NOT NULL,
        "platform"       VARCHAR(20)   NOT NULL,
        "verified"       BOOLEAN       NOT NULL DEFAULT FALSE,
        "points_awarded" INTEGER       NOT NULL DEFAULT 0,
        "ip_address"     VARCHAR(50)            DEFAULT NULL,
        "user_agent"     TEXT                   DEFAULT NULL,
        "is_fraud"       BOOLEAN       NOT NULL DEFAULT FALSE,
        "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "PK_share_events" PRIMARY KEY ("id"),

        CONSTRAINT "FK_share_events_user_id"
          FOREIGN KEY ("user_id")
          REFERENCES "users" ("id")
          ON DELETE CASCADE,

        CONSTRAINT "CHK_share_events_platform"
          CHECK ("platform" IN ('twitter','linkedin','whatsapp','telegram','facebook'))
      )
    `);

    // index on user_id — used by daily share limit check and fraud detection
    await queryRunner.query(`
      CREATE INDEX "IDX_share_events_user_id"
      ON "share_events" ("user_id")
    `);

    // composite index — used by the "already shared today" query:
    // WHERE user_id = ? AND platform = ? AND created_at >= today AND is_fraud = false
    await queryRunner.query(`
      CREATE INDEX "IDX_share_events_user_platform_date"
      ON "share_events" ("user_id", "platform", "created_at")
    `);

    // index on ip_address — used by FraudDetectionAgent IP volume check
    await queryRunner.query(`
      CREATE INDEX "IDX_share_events_ip_address"
      ON "share_events" ("ip_address")
      WHERE "ip_address" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_share_events_ip_address"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_share_events_user_platform_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_share_events_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "share_events"`);
  }
}