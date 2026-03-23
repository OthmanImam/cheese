// src/database/migrations/1700000000006-FixColumnNames.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixColumnNames1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const renames: [string, string, string][] = [
      ['users', 'createdAt', 'created_at'],
      ['users', 'updatedAt', 'updated_at'],
      ['waitlist_entries', 'createdAt', 'created_at'],
      ['waitlist_entries', 'updatedAt', 'updated_at'],
      ['refresh_tokens', 'createdAt', 'created_at'],
      ['otps', 'createdAt', 'created_at'],
      ['devices', 'createdAt', 'created_at'],
      ['devices', 'updatedAt', 'updated_at'],
      ['transactions', 'createdAt', 'created_at'],
      ['transactions', 'updatedAt', 'updated_at'],
      ['blockchain_wallets', 'createdAt', 'created_at'],
      ['blockchain_wallets', 'updatedAt', 'updated_at'],
      ['blockchain_transactions', 'createdAt', 'created_at'],
      ['blockchain_transactions', 'updatedAt', 'updated_at'],
      ['share_events', 'createdAt', 'created_at'],
      ['referral_events', 'createdAt', 'created_at'],
      ['exchange_rates', 'createdAt', 'created_at'],
    ];

    for (const [table, from, to] of renames) {
      try {
        await queryRunner.query(
          `ALTER TABLE "${table}" RENAME COLUMN "${from}" TO "${to}"`,
        );
      } catch {
        // Column already renamed or doesn't exist — skip
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}