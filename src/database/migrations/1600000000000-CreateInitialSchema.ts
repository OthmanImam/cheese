import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialSchema1600000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create users table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "email" varchar NOT NULL UNIQUE,
                "phone" varchar UNIQUE,
                "username" varchar NOT NULL UNIQUE,
                "full_name" varchar,
                "password_hash" varchar,
                "pin_hash" varchar,
                "kyc_status" varchar DEFAULT 'pending',
                "tier" varchar DEFAULT 'silver',
                "is_active" boolean DEFAULT true,
                "email_verified" boolean DEFAULT false,
                "phone_verified" boolean DEFAULT false,
                "referral_code" varchar(20) UNIQUE,
                "referred_by" varchar,
                "points" integer DEFAULT 0,
                "is_flagged" boolean DEFAULT false,
                "ip_address" varchar,
                "stellar_public_key" varchar UNIQUE,
                "stellar_secret_enc" text,
                "evm_address" varchar UNIQUE,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create waitlist_entries table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "waitlist_entries" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "email" varchar NOT NULL UNIQUE,
                "username" varchar NOT NULL UNIQUE,
                "status" varchar DEFAULT 'pending',
                "position" integer,
                "referral_source" varchar,
                "referrer_id" uuid,
                "referral_code" varchar(20) UNIQUE,
                "points" integer DEFAULT 0,
                "ip_address" varchar,
                "notified_at" bigint,
                "converted_at" bigint,
                "created_at" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create devices table with correct schema
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "devices" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "device_id" varchar NOT NULL UNIQUE,
                "public_key" text NOT NULL,
                "device_name" varchar,
                "location" varchar,
                "is_active" boolean DEFAULT true,
                "last_seen" bigint,
                "user_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_devices_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // Create refresh_tokens table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "refresh_tokens" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "token" varchar NOT NULL UNIQUE,
                "expires_at" TIMESTAMP NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // Create otps table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "otps" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "email" varchar NOT NULL,
                "code" varchar NOT NULL,
                "expires_at" TIMESTAMP NOT NULL,
                "used" boolean DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create share_events table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "share_events" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid,
                "waitlist_id" uuid,
                "sharer_type" varchar NOT NULL,
                "platform" varchar NOT NULL,
                "url" varchar NOT NULL,
                "points_awarded" integer DEFAULT 0,
                "ip_address" varchar,
                "user_agent" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_share_events_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_share_events_waitlist" FOREIGN KEY ("waitlist_id") REFERENCES "waitlist_entries"("id") ON DELETE SET NULL
            )
        `);

        // Create referral_events table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "referral_events" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "referrer_id" varchar NOT NULL,
                "referee_id" varchar NOT NULL,
                "points_awarded" integer DEFAULT 0,
                "created_at" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create transactions table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "transactions" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "type" varchar NOT NULL,
                "amount" numeric NOT NULL,
                "currency" varchar NOT NULL,
                "status" varchar NOT NULL,
                "description" text,
                "reference" varchar UNIQUE,
                "external_id" varchar,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_transactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
            )
        `);

        // Create exchange_rates table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "exchange_rates" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "usd_to_ngn" numeric NOT NULL,
                "effective_rate" numeric NOT NULL,
                "spread_percent" numeric NOT NULL DEFAULT 0,
                "source" varchar,
                "fetched_at" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create indexes with safe error handling
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_points" ON "users" ("points")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_points_created" ON "users" ("points", "created_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_email" ON "users" ("email")`);
        
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_waitlist_points" ON "waitlist_entries" ("points")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_waitlist_points_created" ON "waitlist_entries" ("points", "created_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_waitlist_email" ON "waitlist_entries" ("email")`);
        
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_devices_device_id" ON "devices" ("device_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user" ON "refresh_tokens" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_otps_email" ON "otps" ("email")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_share_events_user" ON "share_events" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_share_events_waitlist" ON "share_events" ("waitlist_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_transactions_user" ON "transactions" ("user_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order
        await queryRunner.query(`DROP TABLE IF EXISTS "exchange_rates"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "referral_events"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "share_events"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "otps"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "devices"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "waitlist_entries"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    }

}
        `);

        // Create otps table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "otps" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "email" varchar NOT NULL,
                "code" varchar NOT NULL,
                "expires_at" TIMESTAMP NOT NULL,
                "used" boolean DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create share_events table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "share_events" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid,
                "waitlist_id" uuid,
                "sharer_type" varchar NOT NULL,
                "platform" varchar NOT NULL,
                "url" varchar NOT NULL,
                "points_awarded" integer DEFAULT 0,
                "ip_address" varchar,
                "user_agent" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_share_events_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_share_events_waitlist" FOREIGN KEY ("waitlist_id") REFERENCES "waitlist_entries"("id") ON DELETE SET NULL
            )
        `);

        // Create referral_events table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "referral_events" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "referrer_id" varchar NOT NULL,
                "referee_id" varchar NOT NULL,
                "points_awarded" integer DEFAULT 0,
                "created_at" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create transactions table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "transactions" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "type" varchar NOT NULL,
                "amount" numeric NOT NULL,
                "currency" varchar NOT NULL,
                "status" varchar NOT NULL,
                "description" text,
                "reference" varchar UNIQUE,
                "external_id" varchar,
                "metadata" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_transactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
            )
        `);

        // Create exchange_rates table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "exchange_rates" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "usd_to_ngn" numeric NOT NULL,
                "effective_rate" numeric NOT NULL,
                "spread_percent" numeric NOT NULL DEFAULT 0,
                "source" varchar,
                "fetched_at" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_points" ON "users" ("points")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_points_created" ON "users" ("points", "created_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_waitlist_points" ON "waitlist_entries" ("points")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_waitlist_points_created" ON "waitlist_entries" ("points", "created_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_devices_user" ON "devices" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user" ON "refresh_tokens" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_otps_email" ON "otps" ("email")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_share_events_user" ON "share_events" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_share_events_waitlist" ON "share_events" ("waitlist_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_transactions_user" ON "transactions" ("user_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order
        await queryRunner.query(`DROP TABLE IF EXISTS "exchange_rates"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "referral_events"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "share_events"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "otps"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "devices"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "waitlist_entries"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    }

}
