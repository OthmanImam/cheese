import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEmailProvider } from './email-provider.interface';
import { EmailMessage, EmailSendResult } from '../types/email.types';
import { EmailConfig } from '../config/email.config';

@Injectable()
export class SmtpProvider implements IEmailProvider {
  readonly name = 'smtp';
  private readonly logger = new Logger(SmtpProvider.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<EmailConfig>('email');

    if (!config?.smtpHost) {
      throw new Error('SMTP_HOST is required when EMAIL_PROVIDER=smtp');
    }

    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort ?? 587,
      secure: config.smtpSecure ?? false,
      auth:
        config.smtpUser && config.smtpPassword
          ? { user: config.smtpUser, pass: config.smtpPassword }
          : undefined,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const toArray = Array.isArray(message.to) ? message.to : [message.to];

    const info = await this.transporter.sendMail({
      from: message.from.name
        ? `"${message.from.name}" <${message.from.email}>`
        : message.from.email,
      to: toArray.map((a) => (a.name ? `"${a.name}" <${a.email}>` : a.email)).join(', '),
      replyTo: message.replyTo?.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: message.headers,
    });

    this.logger.log(`Email sent via SMTP [messageId=${info.messageId}]`);

    return {
      success: true,
      messageId: info.messageId,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('SMTP health check failed', error);
      return false;
    }
  }
}
