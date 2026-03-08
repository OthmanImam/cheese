// src/config/app.config.ts
import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  payLinkBaseUrl: process.env.PAYLINK_BASE_URL || 'https://cheesepay.xyz',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
}));

export const dbConfig = registerAs('db', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  name: process.env.DB_NAME || 'cheese_wallet',
  user: process.env.DB_USER || 'cheese',
  password: process.env.DB_PASS || 'cheese',
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret',
  accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || '30d',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
}));

export const stellarConfig = registerAs('stellar', () => ({
  network: process.env.STELLAR_NETWORK || 'testnet',
  horizonUrl:
    process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  usdcIssuer: process.env.STELLAR_USDC_ISSUER,
  masterSecret: process.env.STELLAR_MASTER_SECRET,
  encryptionKey: process.env.STELLAR_WALLET_ENCRYPTION_KEY,
}));

export const otpConfig = registerAs('otp', () => ({
  ttlSeconds: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom:
    process.env.EMAIL_FROM || 'Cheese Wallet <noreply@cheesewallet.app>',
}));

export const ratesConfig = registerAs('rates', () => ({
  exchangeRateUrl: process.env.EXCHANGE_RATE_URL,
  ngnSpreadPercent: parseFloat(process.env.NGN_SPREAD_PERCENT || '1.5'),
}));

export const emailConfig = registerAs('email', () => ({
  zeptoApiKey: process.env.ZEPTOMAIL_API_KEY || '',
  fromAddress: process.env.ZEPTOMAIL_FROM_ADDRESS || 'noreply@cheesewallet.app',
  fromName: process.env.ZEPTOMAIL_FROM_NAME || 'Cheese Wallet',
  replyTo: process.env.ZEPTOMAIL_REPLY_TO || 'support@cheesewallet.app',
}));
