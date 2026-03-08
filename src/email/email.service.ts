// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  waitlistConfirmation,
  appLaunch,
  signupOtp,
  signupSuccess,
  passwordResetOtp,
  passwordChanged,
  moneyReceived,
  moneySent,
  kycApproved,
  tierUpgrade,
} from './templates';

interface SendPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly from: string;
  private readonly fromName: string;
  private readonly replyTo: string;

  // ZeptoMail REST endpoint
  private readonly ZEPTO_URL = 'https://api.zeptomail.com/v1.1/email';

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get<string>('email.zeptoApiKey', '');
    this.from = config.get<string>(
      'email.fromAddress',
      'noreply@cheesewallet.app',
    );
    this.fromName = config.get<string>('email.fromName', 'Cheese Wallet');
    this.replyTo = config.get<string>(
      'email.replyTo',
      'support@cheesewallet.app',
    );
  }

  // ── Core send ─────────────────────────────────────────────
  private async send(payload: SendPayload): Promise<void> {
    if (!this.apiKey) {
      // Dev mode: log email to console instead of sending
      this.logger.warn(
        `[EMAIL — dev preview] To: ${payload.to} | Subject: ${payload.subject}`,
      );
      return;
    }

    const body = {
      from: {
        address: this.from,
        name: this.fromName,
      },
      to: [
        {
          email_address: {
            address: payload.to,
            name: '',
          },
        },
      ],
      reply_to: [
        {
          address: payload.replyTo || this.replyTo,
          name: this.fromName,
        },
      ],
      subject: payload.subject,
      htmlbody: payload.html,
    };

    try {
      const res = await fetch(this.ZEPTO_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Zoho-enczapikey ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: 'Unknown error' }));
        this.logger.error(
          `ZeptoMail send failed [${res.status}]: ${JSON.stringify(err)}`,
        );
        // Fail silently — don't crash the request
        return;
      }

      this.logger.log(`Email sent → ${payload.to} | "${payload.subject}"`);
    } catch (err) {
      this.logger.error(`Email network error: ${err.message}`);
    }
  }

  // ── Template senders ──────────────────────────────────────

  async sendWaitlistConfirmation(params: {
    to: string;
    username: string;
    position?: number;
  }): Promise<void> {
    const { subject, html } = waitlistConfirmation({
      email: params.to,
      username: params.username,
      position: params.position,
    });
    await this.send({ to: params.to, subject, html });
  }

  async sendAppLaunch(params: {
    to: string;
    username: string;
    appUrl: string;
  }): Promise<void> {
    const { subject, html } = appLaunch(params);
    await this.send({ to: params.to, subject, html });
  }

  async sendSignupOtp(params: {
    to: string;
    fullName: string;
    otp: string;
    expiresIn?: string;
  }): Promise<void> {
    const { subject, html } = signupOtp({
      fullName: params.fullName,
      otp: params.otp,
      expiresIn: params.expiresIn || '5 minutes',
    });
    await this.send({ to: params.to, subject, html });
  }

  async sendSignupSuccess(params: {
    to: string;
    fullName: string;
    username: string;
    appUrl?: string;
  }): Promise<void> {
    const { subject, html } = signupSuccess({
      fullName: params.fullName,
      username: params.username,
      appUrl: params.appUrl || 'https://cheesewallet.app/wallet',
    });
    await this.send({ to: params.to, subject, html });
  }

  async sendPasswordResetOtp(params: {
    to: string;
    fullName: string;
    otp: string;
    expiresIn?: string;
    ipAddress?: string;
  }): Promise<void> {
    const { subject, html } = passwordResetOtp({
      fullName: params.fullName,
      otp: params.otp,
      expiresIn: params.expiresIn || '5 minutes',
      ipAddress: params.ipAddress,
    });
    await this.send({ to: params.to, subject, html });
  }

  async sendPasswordChanged(params: {
    to: string;
    fullName: string;
    changedAt?: string;
    deviceName?: string;
  }): Promise<void> {
    const { subject, html } = passwordChanged({
      fullName: params.fullName,
      changedAt:
        params.changedAt ||
        new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
      deviceName: params.deviceName,
    });
    await this.send({ to: params.to, subject, html });
  }

  async sendMoneyReceived(params: {
    to: string;
    fullName: string;
    amountUsdc: string;
    amountNgn?: string;
    txHash?: string;
    network?: string;
    appUrl?: string;
  }): Promise<void> {
    const { subject, html } = moneyReceived({
      ...params,
      appUrl: params.appUrl || 'https://cheesewallet.app/wallet',
    });
    await this.send({ to: params.to, subject, html });
  }

  async sendMoneySent(params: {
    to: string;
    fullName: string;
    amountUsdc: string;
    amountNgn?: string;
    recipientName?: string;
    recipientUsername?: string;
    recipientAddress?: string;
    txHash?: string;
    reference: string;
    fee: string;
    appUrl?: string;
  }): Promise<void> {
    const { subject, html } = moneySent({
      ...params,
      appUrl: params.appUrl || 'https://cheesewallet.app/wallet',
    });
    await this.send({ to: params.to, subject, html });
  }

  async sendKycApproved(params: {
    to: string;
    fullName: string;
    tier: string;
    appUrl?: string;
  }): Promise<void> {
    const tierBenefits: Record<string, string[]> = {
      silver: [
        'Up to ₦500,000 daily withdrawal limit',
        'Virtual Mastercard (up to $500 balance)',
        'Earn 5% APY on your USDC',
        'Send USDC by @username',
      ],
      gold: [
        'Up to ₦2,000,000 daily withdrawal limit',
        'Virtual Mastercard (up to $2,000 balance)',
        'Earn 5.5% APY with Gold boost',
        'Priority customer support',
        'Gold badge on your profile',
      ],
      black: [
        'Unlimited daily withdrawal limit',
        'Premium Virtual Black Mastercard',
        'Earn 6% APY — maximum yield',
        'Dedicated relationship manager',
        'Exclusive Black member events',
        'Early access to new features',
      ],
    };

    const { subject, html } = kycApproved({
      fullName: params.fullName,
      tier: params.tier,
      appUrl: params.appUrl || 'https://cheesewallet.app/wallet',
      benefits: tierBenefits[params.tier.toLowerCase()] || tierBenefits.silver,
    });
    await this.send({ to: params.to, subject, html });
  }

  async sendTierUpgrade(params: {
    to: string;
    fullName: string;
    fromTier: string;
    toTier: string;
    appUrl?: string;
  }): Promise<void> {
    const tierUpgradeBenefits: Record<string, string[]> = {
      gold: [
        'Withdrawal limit increased to ₦2,000,000/day',
        'Card spending limit raised to $2,000',
        'APY boosted to 5.5%',
        'Priority support queue',
        'Exclusive Gold badge',
      ],
      black: [
        'Unlimited withdrawal limit',
        'Premium Black virtual card — no spending cap',
        'Maximum 6% APY on all USDC',
        'Dedicated 1-on-1 support',
        'VIP event access',
        'First look at new products',
      ],
    };

    const { subject, html } = tierUpgrade({
      fullName: params.fullName,
      fromTier: params.fromTier,
      toTier: params.toTier,
      appUrl: params.appUrl || 'https://cheesewallet.app/wallet',
      benefits: tierUpgradeBenefits[params.toTier.toLowerCase()] || [],
    });
    await this.send({ to: params.to, subject, html });
  }

  async sendWaitlistReminder(params: {
    to: string;
    username: string;
    signupUrl: string;
    daysOnList: number;
    position?: number;
  }): Promise<void> {
    const { waitlistReminder } = await import('./templates/index.js');
    const { subject, html } = waitlistReminder({
      email: params.to,
      username: params.username,
      signupUrl: params.signupUrl,
      daysOnList: params.daysOnList,
      position: params.position,
    });
    await this.send({ to: params.to, subject, html });
  }
}
