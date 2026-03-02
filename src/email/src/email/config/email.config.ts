import { registerAs } from '@nestjs/config';
import { EmailProvider } from '../types/email.types';

export interface EmailConfig {
  provider: EmailProvider;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;

  // ZeptoMail — generate a Send Mail Token in your ZeptoMail account:
  // Agents → SMTP/API → Send Mail Token
  zeptomailToken?: string;

  // AWS SES
  sesRegion?: string;
  sesAccessKeyId?: string;
  sesSecretAccessKey?: string;

  // SMTP
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;

  // App branding
  appName: string;
  appUrl: string;
  supportEmail: string;
  logoUrl?: string;
}

export const emailConfig = registerAs('email', (): EmailConfig => {
  const provider = (process.env.EMAIL_PROVIDER as EmailProvider) ?? EmailProvider.ZEPTOMAIL;

  const config: EmailConfig = {
    provider,
    fromEmail: process.env.EMAIL_FROM_ADDRESS ?? '',
    fromName: process.env.EMAIL_FROM_NAME ?? 'Cheese Wallet',
    replyToEmail: process.env.EMAIL_REPLY_TO,
    appName: process.env.APP_NAME ?? 'Cheese Wallet',
    appUrl: process.env.APP_URL ?? 'https://cheese.app',
    supportEmail: process.env.SUPPORT_EMAIL ?? 'support@cheese.app',
    logoUrl: process.env.EMAIL_LOGO_URL,
  };

  if (provider === EmailProvider.ZEPTOMAIL) {
    config.zeptomailToken = process.env.ZEPTOMAIL_TOKEN;
  }

  if (provider === EmailProvider.SES) {
    config.sesRegion = process.env.AWS_SES_REGION ?? 'eu-west-1';
    config.sesAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    config.sesSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  }

  if (provider === EmailProvider.SMTP) {
    config.smtpHost = process.env.SMTP_HOST;
    config.smtpPort = parseInt(process.env.SMTP_PORT ?? '587', 10);
    config.smtpSecure = process.env.SMTP_SECURE === 'true';
    config.smtpUser = process.env.SMTP_USER;
    config.smtpPassword = process.env.SMTP_PASSWORD;
  }

  return config;
});
