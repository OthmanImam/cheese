// src/database/migrations/1700000000008-FixWaitlistColumnNames.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixWaitlistColumnNames1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const renames: [string, string, string][] = [
      ['waitlist_entries', 'referralCode', 'referral_code'],
      ['waitlist_entries', 'referredBy', 'referred_by'],
      ['waitlist_entries', 'isConverted', 'is_converted'],
    ];

    for (const [table, from, to] of renames) {
      const result = await queryRunner.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${table}'
        AND column_name = '${from}'
      `);

      if (result.length > 0) {
        await queryRunner.query(
          `ALTER TABLE "${table}" RENAME COLUMN "${from}" TO "${to}"`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}