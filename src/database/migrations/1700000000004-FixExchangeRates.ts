// src/database/migrations/1700000000004-FixExchangeRates.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixExchangeRates1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "exchange_rates"`);
    await queryRunner.query(`
      CREATE TABLE "exchange_rates" (
        "id"              uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
        "usd_to_ngn"      numeric   NOT NULL,
        "effective_rate"  numeric   NOT NULL,
        "spread_percent"  numeric   NOT NULL DEFAULT 0,
        "source"          varchar,
        "fetched_at"      TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "exchange_rates"`);
  }
}