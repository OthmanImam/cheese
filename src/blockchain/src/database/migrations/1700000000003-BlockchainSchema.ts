import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Blockchain module schema.
 * Depends on AuthSchema migration (001) having run first — references users(id).
 */
export class BlockchainSchema1700000000003 implements MigrationInterface {
  name = 'BlockchainSchema1700000000003';

  async up(qr: QueryRunner): Promise<void> {
    // ── Enum types ─────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TYPE wallet_status_enum AS ENUM (
        'pending', 'active', 'suspended', 'revoked'
      )
    `);

    await qr.query(`
      CREATE TYPE token_symbol_enum AS ENUM ('USDC', 'USDT')
    `);

    await qr.query(`
      CREATE TYPE blockchain_tx_type_enum AS ENUM (
        'wallet_creation', 'debit', 'credit', 'transfer'
      )
    `);

    await qr.query(`
      CREATE TYPE blockchain_tx_status_enum AS ENUM (
        'submitted', 'confirmed', 'reverted', 'failed'
      )
    `);

    // ── blockchain_wallets ─────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE blockchain_wallets (
        id                    UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id               UUID                NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
        wallet_address        VARCHAR(100)        UNIQUE,
        registered_username   VARCHAR(30)         NOT NULL UNIQUE,
        chain_id              INT                 NOT NULL,
        contract_address      VARCHAR(100)        NOT NULL,
        token_symbol          token_symbol_enum   NOT NULL DEFAULT 'USDC',
        token_decimals        SMALLINT            NOT NULL DEFAULT 6,
        status                wallet_status_enum  NOT NULL DEFAULT 'pending',
        creation_tx_hash      VARCHAR(100),
        retry_count           SMALLINT            NOT NULL DEFAULT 0,
        last_retry_at         TIMESTAMPTZ,
        activated_at          TIMESTAMPTZ,
        suspension_reason     TEXT,
        created_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_retry_count_non_negative CHECK (retry_count >= 0),
        CONSTRAINT chk_token_decimals_positive  CHECK (token_decimals > 0)
      )
    `);

    await qr.query(`CREATE UNIQUE INDEX uq_blockchain_wallets_user_id ON blockchain_wallets(user_id)`);
    await qr.query(`CREATE UNIQUE INDEX uq_blockchain_wallets_address ON blockchain_wallets(wallet_address) WHERE wallet_address IS NOT NULL`);
    await qr.query(`CREATE UNIQUE INDEX uq_blockchain_wallets_username ON blockchain_wallets(registered_username)`);
    await qr.query(`CREATE INDEX idx_blockchain_wallets_status ON blockchain_wallets(status)`);
    await qr.query(`CREATE INDEX idx_blockchain_wallets_created ON blockchain_wallets(created_at DESC)`);

    await qr.query(`
      CREATE TRIGGER blockchain_wallets_updated_at
      BEFORE UPDATE ON blockchain_wallets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `);

    // ── blockchain_transactions ────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE blockchain_transactions (
        id              UUID                          PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id       UUID                          REFERENCES blockchain_wallets(id) ON DELETE SET NULL,
        app_reference   VARCHAR(100)                  NOT NULL,
        tx_type         blockchain_tx_type_enum       NOT NULL,
        status          blockchain_tx_status_enum     NOT NULL DEFAULT 'submitted',
        tx_hash         VARCHAR(100),
        block_number    BIGINT,
        amount          NUMERIC(18,8),
        amount_raw      VARCHAR(50),
        to_address      VARCHAR(100),
        gas_used        VARCHAR(50),
        gas_price       VARCHAR(50),
        revert_reason   TEXT,
        metadata        JSONB                         NOT NULL DEFAULT '{}',
        submitted_at    TIMESTAMPTZ,
        confirmed_at    TIMESTAMPTZ,
        created_at      TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_amount_non_negative CHECK (amount IS NULL OR amount >= 0)
      )
    `);

    await qr.query(`CREATE INDEX idx_blockchain_tx_wallet_id     ON blockchain_transactions(wallet_id)`);
    await qr.query(`CREATE INDEX idx_blockchain_tx_status        ON blockchain_transactions(status)`);
    await qr.query(`CREATE INDEX idx_blockchain_tx_type          ON blockchain_transactions(tx_type)`);
    await qr.query(`CREATE INDEX idx_blockchain_tx_app_reference ON blockchain_transactions(app_reference)`);
    await qr.query(`CREATE INDEX idx_blockchain_tx_hash          ON blockchain_transactions(tx_hash) WHERE tx_hash IS NOT NULL`);
    await qr.query(`CREATE INDEX idx_blockchain_tx_created       ON blockchain_transactions(created_at DESC)`);
    await qr.query(`CREATE INDEX idx_blockchain_tx_submitted_at  ON blockchain_transactions(submitted_at) WHERE status = 'submitted'`);

    await qr.query(`
      CREATE TRIGGER blockchain_transactions_updated_at
      BEFORE UPDATE ON blockchain_transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `);

    // ── Monitoring view: wallets stuck in PENDING ──────────────────────────
    await qr.query(`
      CREATE VIEW pending_wallet_creations AS
        SELECT
          w.id,
          w.user_id,
          w.registered_username,
          w.retry_count,
          w.last_retry_at,
          w.created_at,
          EXTRACT(EPOCH FROM (NOW() - w.created_at)) / 60 AS minutes_pending
        FROM blockchain_wallets w
        WHERE w.status = 'pending'
        ORDER BY w.created_at ASC
    `);

    // ── Monitoring view: failed blockchain transactions last 24h ──────────
    await qr.query(`
      CREATE VIEW recent_failed_blockchain_txs AS
        SELECT
          t.id,
          t.wallet_id,
          t.app_reference,
          t.tx_type,
          t.revert_reason,
          t.created_at
        FROM blockchain_transactions t
        WHERE t.status IN ('reverted', 'failed')
          AND t.created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY t.created_at DESC
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP VIEW  IF EXISTS recent_failed_blockchain_txs`);
    await qr.query(`DROP VIEW  IF EXISTS pending_wallet_creations`);
    await qr.query(`DROP TABLE IF EXISTS blockchain_transactions CASCADE`);
    await qr.query(`DROP TABLE IF EXISTS blockchain_wallets      CASCADE`);
    await qr.query(`DROP TYPE  IF EXISTS blockchain_tx_status_enum`);
    await qr.query(`DROP TYPE  IF EXISTS blockchain_tx_type_enum`);
    await qr.query(`DROP TYPE  IF EXISTS token_symbol_enum`);
    await qr.query(`DROP TYPE  IF EXISTS wallet_status_enum`);
  }
}
