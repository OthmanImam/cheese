import { registerAs, ConfigType } from '@nestjs/config';

/**
 * Typed application configuration factory for Cheese Wallet.
 *
 * Registered in AppModule via ConfigModule.forRoot({ load: [appConfig] }).
 *
 * Usage:
 *   1. Flat key via ConfigService:
 *        cs.getOrThrow<string>('DB_HOST')
 *   2. Typed nested object via @Inject (preferred for multiple reads):
 *        @Inject(appConfig.KEY) private readonly cfg: AppConfig
 *        this.cfg.blockchain.contractAddress
 *        this.cfg.jwt.accessTtlSec
 *
 * All parseInt / split / coercions live here.
 * Services must not access process.env directly.
 */
const appConfig = registerAs('app', () => ({

  nodeEnv: process.env.NODE_ENV ?? "development",
  port:    parseInt(process.env.PORT ?? "3000", 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3001")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  db: {
    host:                  process.env.DB_HOST     ?? "localhost",
    port:                  parseInt(process.env.DB_PORT     ?? "5432", 10),
    name:                  process.env.DB_NAME     ?? "cheese_wallet",
    user:                  process.env.DB_USER     ?? "postgres",
    password:              process.env.DB_PASSWORD ?? "",
    ssl:                   process.env.DB_SSL === "true",
    sslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
    runMigrations:         process.env.DB_RUN_MIGRATIONS === "true",
    pool: {
      max:                parseInt(process.env.DB_POOL_MAX              ?? "20",    10),
      min:                parseInt(process.env.DB_POOL_MIN              ?? "2",     10),
      idleTimeoutMs:      parseInt(process.env.DB_IDLE_TIMEOUT_MS      ?? "30000", 10),
      connectTimeoutMs:   parseInt(process.env.DB_CONNECT_TIMEOUT_MS   ?? "5000",  10),
      statementTimeoutMs: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS ?? "30000", 10),
    },
  },

  // TTLs are hardcoded security policy, not tuneable per-env config.
  jwt: {
    accessSecret:  process.env.JWT_ACCESS_SECRET  ?? "",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "",
    accessTtlSec:  15 * 60,        // 15 minutes
    refreshTtlSec: 7 * 24 * 3600,  // 7 days
  },

  waitlist: {
    tokenSecret:   process.env.WAITLIST_TOKEN_SECRET    ?? "",
    tokenTtlHours: parseInt(process.env.WAITLIST_TOKEN_TTL_HOURS ?? "72", 10),
  },

  throttle: {
    ttl:   parseInt(process.env.THROTTLE_TTL   ?? "60000", 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? "60",    10),
  },

  email: {
    provider:       process.env.EMAIL_PROVIDER     ?? "zeptomail",
    zeptomailToken: process.env.ZEPTOMAIL_TOKEN    ?? "",
    fromAddress:    process.env.EMAIL_FROM_ADDRESS ?? "noreply@cheese.app",
    fromName:       process.env.EMAIL_FROM_NAME    ?? "Cheese Wallet",
    supportEmail:   process.env.SUPPORT_EMAIL      ?? "support@cheese.app",
    appName:        process.env.APP_NAME           ?? "Cheese Wallet",
    appUrl:         process.env.APP_URL            ?? "https://cheese.app",
  },

  blockchain: {
    rpcUrl:             process.env.BLOCKCHAIN_RPC_URL          ?? "",
    platformPrivateKey: process.env.PLATFORM_WALLET_PRIVATE_KEY ?? "",
    platformAddress:    process.env.PLATFORM_WALLET_ADDRESS     ?? "",
    contractAddress:    process.env.WALLET_CONTRACT_ADDRESS     ?? "",
    confirmations:      parseInt(process.env.BLOCKCHAIN_CONFIRMATIONS ?? "1", 10),
  },

  // DevicesModule reads no env vars currently.
  // Reserved for DEVICE_SIGNATURE_WINDOW_SEC or key-algorithm whitelist.
  device: {
    signatureWindowSec: parseInt(process.env.DEVICE_SIGNATURE_WINDOW_SEC ?? "300", 10),
  },

}));

export default appConfig;

// Use this type for @Inject()-style injection:
//   constructor(@Inject(appConfig.KEY) private readonly cfg: AppConfig) {}
export type AppConfig = ConfigType<typeof appConfig>;
