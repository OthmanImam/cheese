export enum EmailTemplate {
  WAITLIST_CONFIRMATION = 'waitlist-confirmation',
  LAUNCH_ANNOUNCEMENT = 'launch-announcement',
  OTP_CONFIRMATION = 'otp-confirmation',
  SUCCESSFUL_SIGNUP = 'successful-signup',
  DEPOSIT_CONFIRMATION = 'deposit-confirmation',
  WITHDRAWAL_CONFIRMATION = 'withdrawal-confirmation',
}

export enum EmailProvider {
  ZEPTOMAIL = 'zeptomail',
  SES = 'ses',
  SMTP = 'smtp',
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailMessage {
  to: EmailAddress | EmailAddress[];
  from: EmailAddress;
  replyTo?: EmailAddress;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  tags?: string[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  timestamp: Date;
}

export interface EmailProviderConfig {
  apiKey?: string;
  region?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
}
