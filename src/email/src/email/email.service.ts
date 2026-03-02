import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER, IEmailProvider } from './providers/email-provider.interface';
import { EmailTemplateService } from './email-template.service';
import { EmailConfig } from './config/email.config';
import { EmailTemplate } from './types/email.types';
import { EmailSendException, EmailProviderConnectionException } from './exceptions/email.exceptions';
import {
  SendWaitlistConfirmationDto,
  SendLaunchAnnouncementDto,
  SendOtpConfirmationDto,
  SendSuccessfulSignupDto,
  SendDepositConfirmationDto,
  SendWithdrawalConfirmationDto,
} from './dto/email.dto';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromAddress: { email: string; name: string };
  private readonly replyTo?: { email: string };

  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly provider: IEmailProvider,
    private readonly templateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get<EmailConfig>('email')!;
    this.fromAddress = { email: config.fromEmail, name: config.fromName };
    this.replyTo = config.replyToEmail ? { email: config.replyToEmail } : undefined;
  }

  async onModuleInit(): Promise<void> {
    const healthy = await this.provider.verify().catch(() => false);
    if (!healthy) {
      throw new EmailProviderConnectionException(
        this.provider.name,
        new Error('Provider failed health check on startup'),
      );
    }
    this.logger.log(`Email provider [${this.provider.name}] is healthy`);
  }

  // ── 1. Waitlist Confirmation ────────────────────────────────────────────
  async sendWaitlistConfirmation(dto: SendWaitlistConfirmationDto): Promise<void> {
    const { subject, html } = this.templateService.render(
      EmailTemplate.WAITLIST_CONFIRMATION,
      {
        firstName: dto.firstName,
        username: dto.username,
        waitlistPosition: dto.waitlistPosition,
        referralLink: dto.referralLink,
        reservationExpiryDays: dto.reservationExpiryDays,
      },
    );

    await this.dispatch({
      to: dto.recipientEmail,
      subject,
      html,
      template: EmailTemplate.WAITLIST_CONFIRMATION,
      tags: ['waitlist', 'transactional'],
    });
  }

  // ── 2. Launch Announcement ──────────────────────────────────────────────
  async sendLaunchAnnouncement(dto: SendLaunchAnnouncementDto): Promise<void> {
    const { subject, html } = this.templateService.render(
      EmailTemplate.LAUNCH_ANNOUNCEMENT,
      {
        firstName: dto.firstName,
        username: dto.username,
        claimDeadline: dto.claimDeadline,
        daysToExpiry: dto.daysToExpiry,
        earlyAccessPerks: dto.earlyAccessPerks,
        appDownloadUrl: dto.appDownloadUrl,
      },
    );

    await this.dispatch({
      to: dto.recipientEmail,
      subject,
      html,
      template: EmailTemplate.LAUNCH_ANNOUNCEMENT,
      tags: ['launch', 'transactional'],
    });
  }

  // ── 3. OTP Confirmation ─────────────────────────────────────────────────
  async sendOtpConfirmation(dto: SendOtpConfirmationDto): Promise<void> {
    const { subject, html } = this.templateService.render(
      EmailTemplate.OTP_CONFIRMATION,
      {
        firstName: dto.firstName,
        otp: dto.otp,
        expiryMinutes: dto.expiryMinutes,
        ipAddress: dto.ipAddress,
        deviceInfo: dto.deviceInfo,
        requestedAt: dto.requestedAt,
      },
    );

    await this.dispatch({
      to: dto.recipientEmail,
      subject,
      html,
      template: EmailTemplate.OTP_CONFIRMATION,
      tags: ['otp', 'security', 'transactional'],
    });
  }

  // ── 4. Successful Signup ────────────────────────────────────────────────
  async sendSuccessfulSignup(dto: SendSuccessfulSignupDto): Promise<void> {
    const { subject, html } = this.templateService.render(
      EmailTemplate.SUCCESSFUL_SIGNUP,
      {
        firstName: dto.firstName,
        username: dto.username,
        tierName: dto.tierName,
        tierColor: dto.tierColor,
        nextSteps: dto.nextSteps,
        referralLink: dto.referralLink,
        dashboardUrl: dto.dashboardUrl,
      },
    );

    await this.dispatch({
      to: dto.recipientEmail,
      subject,
      html,
      template: EmailTemplate.SUCCESSFUL_SIGNUP,
      tags: ['onboarding', 'transactional'],
    });
  }

  // ── 5. Deposit Confirmation ─────────────────────────────────────────────
  async sendDepositConfirmation(dto: SendDepositConfirmationDto): Promise<void> {
    const { subject, html } = this.templateService.render(
      EmailTemplate.DEPOSIT_CONFIRMATION,
      {
        firstName: dto.firstName,
        amountUsd: dto.amountUsd,
        amountNgn: dto.amountNgn,
        exchangeRate: dto.exchangeRate,
        transactionId: dto.transactionId,
        depositedAt: dto.depositedAt,
        fundingMethod: dto.fundingMethod,
        currentBalanceUsd: dto.currentBalanceUsd,
        currentBalanceNgn: dto.currentBalanceNgn,
        dashboardUrl: dto.dashboardUrl,
      },
    );

    await this.dispatch({
      to: dto.recipientEmail,
      subject,
      html,
      template: EmailTemplate.DEPOSIT_CONFIRMATION,
      tags: ['transaction', 'deposit', 'transactional'],
    });
  }

  // ── 6. Withdrawal Confirmation ──────────────────────────────────────────
  async sendWithdrawalConfirmation(dto: SendWithdrawalConfirmationDto): Promise<void> {
    const { subject, html } = this.templateService.render(
      EmailTemplate.WITHDRAWAL_CONFIRMATION,
      {
        firstName: dto.firstName,
        amountUsd: dto.amountUsd,
        amountNgn: dto.amountNgn,
        destinationBank: dto.destinationBank,
        destinationAccount: dto.destinationAccount,
        destinationName: dto.destinationName,
        transactionId: dto.transactionId,
        initiatedAt: dto.initiatedAt,
        estimatedArrival: dto.estimatedArrival,
        remainingBalanceUsd: dto.remainingBalanceUsd,
        remainingBalanceNgn: dto.remainingBalanceNgn,
        dashboardUrl: dto.dashboardUrl,
      },
    );

    await this.dispatch({
      to: dto.recipientEmail,
      subject,
      html,
      template: EmailTemplate.WITHDRAWAL_CONFIRMATION,
      tags: ['transaction', 'withdrawal', 'transactional'],
    });
  }

  // ── Internal dispatcher ─────────────────────────────────────────────────
  private async dispatch(params: {
    to: string;
    subject: string;
    html: string;
    template: EmailTemplate;
    tags?: string[];
  }): Promise<void> {
    try {
      const result = await this.provider.send({
        to: { email: params.to },
        from: this.fromAddress,
        replyTo: this.replyTo,
        subject: params.subject,
        html: params.html,
        headers: {
          'X-Mailer': 'CheeseWallet-EmailService/1.0',
          'X-Template-Name': params.template,
        },
        tags: params.tags,
      });

      this.logger.log(
        `Email dispatched [template=${params.template}] [to=${params.to}] [messageId=${result.messageId}] [provider=${result.provider}]`,
      );
    } catch (error) {
      this.logger.error(
        `Email dispatch failed [template=${params.template}] [to=${params.to}]`,
        (error as Error).stack,
      );
      throw new EmailSendException(
        this.provider.name,
        params.template,
        params.to,
        error as Error,
      );
    }
  }
}
