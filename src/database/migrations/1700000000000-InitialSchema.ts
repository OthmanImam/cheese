// src/database/migrations/1700000000000-InitialSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "email"             varchar     UNIQUE NOT NULL,
        "username"          varchar     UNIQUE,
        "passwordHash"      varchar,
        "fullName"          varchar,
        "phone"             varchar,
        "isEmailVerified"   boolean     DEFAULT false,
        "isPhoneVerified"   boolean     DEFAULT false,
        "kycTier"           varchar     DEFAULT 'none',
        "kycStatus"         varchar     DEFAULT 'unverified',
        "referralCode"      varchar(20) DEFAULT NULL,
        "referredBy"        varchar(20) DEFAULT NULL,
        "waitlistPoints"    integer     DEFAULT 0,
        "waitlistPosition"  integer,
        "role"              varchar     DEFAULT 'user',
        "isActive"          boolean     DEFAULT true,
        "createdAt"         TIMESTAMP   NOT NULL DEFAULT now(),
        "updatedAt"         TIMESTAMP   NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id"          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"      uuid      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token"       varchar   NOT NULL,
        "deviceId"    varchar,
        "ipAddress"   varchar,
        "userAgent"   varchar,
        "expiresAt"   TIMESTAMP NOT NULL,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_userId"
        ON "refresh_tokens"("userId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "devices" (
        "id"          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"      uuid      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "deviceId"    varchar   NOT NULL,
        "deviceName"  varchar,
        "platform"    varchar,
        "pushToken"   varchar,
        "isActive"    boolean   DEFAULT true,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "otps" (
        "id"          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"      uuid      REFERENCES "users"("id") ON DELETE CASCADE,
        "email"       varchar,
        "code"        varchar   NOT NULL,
        "type"        varchar   NOT NULL,
        "isUsed"      boolean   DEFAULT false,
        "expiresAt"   TIMESTAMP NOT NULL,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exchange_rates" (
        "id"          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
        "pair"        varchar   NOT NULL,
        "rate"        numeric   NOT NULL,
        "source"      varchar,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transactions" (
        "id"            uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"        uuid      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type"          varchar   NOT NULL,
        "amount"        numeric   NOT NULL DEFAULT 0,
        "fee"           numeric   NOT NULL DEFAULT 0,
        "currency"      varchar   DEFAULT 'USDC',
        "status"        varchar   DEFAULT 'pending',
        "reference"     varchar   UNIQUE,
        "txHash"        varchar,
        "network"       varchar,
        "metadata"      jsonb,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transactions_userId"
        ON "transactions"("userId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blockchain_wallets" (
        "id"              uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"          uuid      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "network"         varchar   NOT NULL,
        "address"         varchar   NOT NULL,
        "encryptedSecret" varchar,
        "isActive"        boolean   DEFAULT true,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_blockchain_wallets_userId_network"
        ON "blockchain_wallets"("userId", "network")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blockchain_transactions" (
        "id"          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"      uuid      REFERENCES "users"("id") ON DELETE CASCADE,
        "walletId"    uuid      REFERENCES "blockchain_wallets"("id") ON DELETE SET NULL,
        "txHash"      varchar,
        "network"     varchar,
        "type"        varchar,
        "amount"      numeric,
        "asset"       varchar   DEFAULT 'USDC',
        "from"        varchar,
        "to"          varchar,
        "status"      varchar   DEFAULT 'pending',
        "fee"         numeric   DEFAULT 0,
        "metadata"    jsonb,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "waitlist_entries" (
        "id"            uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
        "email"         varchar   UNIQUE NOT NULL,
        "username"      varchar   UNIQUE NOT NULL,
        "referralCode"  varchar   UNIQUE NOT NULL,
        "referredBy"    varchar,
        "points"        integer   DEFAULT 0,
        "position"      integer,
        "isConverted"   boolean   DEFAULT false,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "share_events" (
        "id"              uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
        "waitlistEntryId" uuid      REFERENCES "waitlist_entries"("id") ON DELETE CASCADE,
        "platform"        varchar   NOT NULL,
        "points"          integer   DEFAULT 0,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_events" (
        "id"              uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
        "referrerId"      uuid      REFERENCES "waitlist_entries"("id") ON DELETE CASCADE,
        "referredId"      uuid      REFERENCES "waitlist_entries"("id") ON DELETE CASCADE,
        "points"          integer   DEFAULT 0,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "share_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "waitlist_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blockchain_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blockchain_wallets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exchange_rates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "otps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
