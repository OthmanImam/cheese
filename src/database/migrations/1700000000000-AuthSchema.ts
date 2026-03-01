import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial auth schema migration.
 * All constraints, partial unique indexes, and enum types defined here.
 * Never use synchronize:true in production — always migrations.
 */
export class AuthSchema1700000000000 implements MigrationInterface {
  name = 'AuthSchema1700000000000';

  async up(qr: QueryRunner): Promise<void> {
    // ── Extensions ────────────────────────────────────────────────────────────
    await qr.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ── Enum types ────────────────────────────────────────────────────────────
    await qr.query(`CREATE TYPE user_status_enum   AS ENUM ('pending','active','suspended','banned')`);
    await qr.query(`CREATE TYPE user_tier_enum     AS ENUM ('silver','gold','black')`);
    await qr.query(`CREATE TYPE signup_source_enum AS ENUM ('waitlist','direct','referral')`);
    await qr.query(`CREATE TYPE otp_purpose_enum   AS ENUM ('email_verification','password_reset','login_mfa')`);
    await qr.query(`CREATE TYPE referral_status_enum AS ENUM ('pending','qualified','rewarded','expired')`);
    await qr.query(`CREATE TYPE waitlist_status_enum AS ENUM ('pending','notified','converted','expired')`);

    // ── users ─────────────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE users (
        id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        email                 VARCHAR(320) NOT NULL,
        username              VARCHAR(30)  NOT NULL,
        phone                 VARCHAR(20),
        first_name            VARCHAR(100),
        last_name             VARCHAR(100),
        password_hash         TEXT         NOT NULL,
        password_version      SMALLINT     NOT NULL DEFAULT 1,
        email_verified        BOOLEAN      NOT NULL DEFAULT FALSE,
        email_verified_at     TIMESTAMPTZ,
        status                user_status_enum   NOT NULL DEFAULT 'pending',
        tier                  user_tier_enum     NOT NULL DEFAULT 'silver',
        signup_source         signup_source_enum NOT NULL,
        was_on_waitlist       BOOLEAN      NOT NULL DEFAULT FALSE,
        username_locked_until TIMESTAMPTZ,
        referral_code         VARCHAR(16)  NOT NULL UNIQUE,
        referred_by_id        UUID         REFERENCES users(id) ON DELETE SET NULL,
        login_attempts        SMALLINT     NOT NULL DEFAULT 0,
        locked_until          TIMESTAMPTZ,
        last_login_at         TIMESTAMPTZ,
        last_login_ip         INET,
        created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        deleted_at            TIMESTAMPTZ
      )
    `);
    -- Partial unique indexes: only enforce uniqueness on non-deleted rows
    await qr.query(`CREATE UNIQUE INDEX uq_users_email_active    ON users(email)    WHERE deleted_at IS NULL`);
    await qr.query(`CREATE UNIQUE INDEX uq_users_username_active ON users(username) WHERE deleted_at IS NULL`);
    await qr.query(`CREATE UNIQUE INDEX uq_users_phone_active    ON users(phone)    WHERE deleted_at IS NULL AND phone IS NOT NULL`);
    await qr.query(`CREATE INDEX idx_users_status      ON users(status)`);
    await qr.query(`CREATE INDEX idx_users_referred_by ON users(referred_by_id) WHERE referred_by_id IS NOT NULL`);
    await qr.query(`CREATE INDEX idx_users_created_at  ON users(created_at DESC)`);

    -- Auto-update updated_at
    await qr.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql
    `);
    await qr.query(`CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at()`);

    // ── otps ──────────────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE otps (
        id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash           CHAR(64)        NOT NULL,
        purpose             otp_purpose_enum NOT NULL,
        expires_at          TIMESTAMPTZ     NOT NULL,
        used_at             TIMESTAMPTZ,
        attempts            SMALLINT        NOT NULL DEFAULT 0,
        max_attempts        SMALLINT        NOT NULL DEFAULT 5,
        requested_from_ip   INET,
        created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(`CREATE INDEX idx_otps_user_purpose ON otps(user_id, purpose, used_at)`);
    await qr.query(`CREATE INDEX idx_otps_expires_at   ON otps(expires_at) WHERE used_at IS NULL`);

    // ── refresh_tokens ────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE refresh_tokens (
        id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash               CHAR(64)    NOT NULL UNIQUE,
        issued_from_ip           INET,
        user_agent               VARCHAR(512),
        expires_at               TIMESTAMPTZ NOT NULL,
        revoked_at               TIMESTAMPTZ,
        replaced_by_token_id     UUID,
        rotation_attack_detected BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(`CREATE INDEX idx_refresh_user_id   ON refresh_tokens(user_id)`);
    await qr.query(`CREATE INDEX idx_refresh_expires   ON refresh_tokens(expires_at) WHERE revoked_at IS NULL`);

    // ── referrals ─────────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE referrals (
        id                   UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id          UUID                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referee_id           UUID                 NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        referral_code        VARCHAR(16)          NOT NULL,
        status               referral_status_enum NOT NULL DEFAULT 'pending',
        qualified_at         TIMESTAMPTZ,
        rewarded_at          TIMESTAMPTZ,
        reward_amount_cents  INT,
        created_at           TIMESTAMPTZ          NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(`CREATE INDEX idx_referrals_referrer ON referrals(referrer_id)`);
    await qr.query(`CREATE INDEX idx_referrals_status   ON referrals(status)`);

    // ── waitlist_reservations ─────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE waitlist_reservations (
        id                      UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
        email                   VARCHAR(320)         NOT NULL UNIQUE,
        username                VARCHAR(30)          NOT NULL UNIQUE,
        waitlist_position       INT                  NOT NULL,
        status                  waitlist_status_enum NOT NULL DEFAULT 'pending',
        continuation_token_hash CHAR(64),
        token_expires_at        TIMESTAMPTZ,
        notified_at             TIMESTAMPTZ,
        converted_at            TIMESTAMPTZ,
        converted_user_id       UUID,
        created_at              TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ          NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(`CREATE INDEX idx_waitlist_status ON waitlist_reservations(status)`);
    await qr.query(`CREATE TRIGGER waitlist_updated_at BEFORE UPDATE ON waitlist_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at()`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS waitlist_reservations CASCADE`);
    await qr.query(`DROP TABLE IF EXISTS referrals            CASCADE`);
    await qr.query(`DROP TABLE IF EXISTS refresh_tokens       CASCADE`);
    await qr.query(`DROP TABLE IF EXISTS otps                 CASCADE`);
    await qr.query(`DROP TABLE IF EXISTS users                CASCADE`);
    await qr.query(`DROP FUNCTION IF EXISTS update_updated_at CASCADE`);
    await qr.query(`DROP TYPE IF EXISTS waitlist_status_enum`);
    await qr.query(`DROP TYPE IF EXISTS referral_status_enum`);
    await qr.query(`DROP TYPE IF EXISTS otp_purpose_enum`);
    await qr.query(`DROP TYPE IF EXISTS signup_source_enum`);
    await qr.query(`DROP TYPE IF EXISTS user_tier_enum`);
    await qr.query(`DROP TYPE IF EXISTS user_status_enum`);
  }
}
