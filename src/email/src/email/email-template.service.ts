import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailConfig } from './config/email.config';
import { EmailTemplate } from './types/email.types';
import { EmailTemplateRenderException } from './exceptions/email.exceptions';
import { BaseTemplateOptions } from './templates/html/base.template';

import {
  waitlistConfirmationTemplate,
  WaitlistConfirmationVars,
} from './templates/html/waitlist-confirmation.template';
import {
  launchAnnouncementTemplate,
  LaunchAnnouncementVars,
} from './templates/html/launch-announcement.template';
import {
  otpConfirmationTemplate,
  OtpConfirmationVars,
} from './templates/html/otp-confirmation.template';
import {
  successfulSignupTemplate,
  SuccessfulSignupVars,
} from './templates/html/successful-signup.template';
import {
  depositConfirmationTemplate,
  DepositConfirmationVars,
} from './templates/html/deposit-confirmation.template';
import {
  withdrawalConfirmationTemplate,
  WithdrawalConfirmationVars,
} from './templates/html/withdrawal-confirmation.template';

export interface RenderedEmail {
  subject: string;
  html: string;
  previewText: string;
}

type TemplateVarsMap = {
  [EmailTemplate.WAITLIST_CONFIRMATION]: WaitlistConfirmationVars;
  [EmailTemplate.LAUNCH_ANNOUNCEMENT]: LaunchAnnouncementVars;
  [EmailTemplate.OTP_CONFIRMATION]: OtpConfirmationVars;
  [EmailTemplate.SUCCESSFUL_SIGNUP]: SuccessfulSignupVars;
  [EmailTemplate.DEPOSIT_CONFIRMATION]: DepositConfirmationVars;
  [EmailTemplate.WITHDRAWAL_CONFIRMATION]: WithdrawalConfirmationVars;
};

const SUBJECTS: Record<EmailTemplate, string | ((vars: Record<string, unknown>) => string)> = {
  [EmailTemplate.WAITLIST_CONFIRMATION]: (v) =>
    `You're officially on the waitlist, @${(v as WaitlistConfirmationVars).username}`,
  [EmailTemplate.LAUNCH_ANNOUNCEMENT]: (v) =>
    `We're Live — Claim @${(v as LaunchAnnouncementVars).username} Before It Expires`,
  [EmailTemplate.OTP_CONFIRMATION]: 'Your Verification Code',
  [EmailTemplate.SUCCESSFUL_SIGNUP]: (v) =>
    `Welcome to Cheese Wallet, ${(v as SuccessfulSignupVars).firstName}`,
  [EmailTemplate.DEPOSIT_CONFIRMATION]: (v) =>
    `Deposit Successful — ${(v as DepositConfirmationVars).amountUsd} Added to Your Wallet`,
  [EmailTemplate.WITHDRAWAL_CONFIRMATION]: (v) =>
    `Withdrawal Processed — ${(v as WithdrawalConfirmationVars).amountUsd} on Its Way`,
};

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly baseOptions: BaseTemplateOptions;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<EmailConfig>('email')!;
    this.baseOptions = {
      appName: config.appName,
      appUrl: config.appUrl,
      supportEmail: config.supportEmail,
      logoUrl: config.logoUrl,
      year: new Date().getFullYear(),
    };
  }

  render<T extends EmailTemplate>(template: T, vars: TemplateVarsMap[T]): RenderedEmail {
    try {
      const subject = this.resolveSubject(template, vars as Record<string, unknown>);
      const html = this.renderTemplate(template, vars);

      return { subject, html, previewText: '' };
    } catch (error) {
      this.logger.error(`Template render failed [${template}]`, error);
      throw new EmailTemplateRenderException(template, error as Error);
    }
  }

  private resolveSubject(template: EmailTemplate, vars: Record<string, unknown>): string {
    const subject = SUBJECTS[template];
    return typeof subject === 'function' ? subject(vars) : subject;
  }

  private renderTemplate<T extends EmailTemplate>(
    template: T,
    vars: TemplateVarsMap[T],
  ): string {
    const base = { ...this.baseOptions };

    switch (template) {
      case EmailTemplate.WAITLIST_CONFIRMATION:
        return waitlistConfirmationTemplate(vars as WaitlistConfirmationVars, base);

      case EmailTemplate.LAUNCH_ANNOUNCEMENT:
        return launchAnnouncementTemplate(vars as LaunchAnnouncementVars, base);

      case EmailTemplate.OTP_CONFIRMATION:
        return otpConfirmationTemplate(vars as OtpConfirmationVars, base);

      case EmailTemplate.SUCCESSFUL_SIGNUP:
        return successfulSignupTemplate(vars as SuccessfulSignupVars, base);

      case EmailTemplate.DEPOSIT_CONFIRMATION:
        return depositConfirmationTemplate(vars as DepositConfirmationVars, base);

      case EmailTemplate.WITHDRAWAL_CONFIRMATION:
        return withdrawalConfirmationTemplate(vars as WithdrawalConfirmationVars, base);

      default:
        throw new Error(`Unknown email template: ${template}`);
    }
  }
}
