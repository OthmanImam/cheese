import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailProvider } from './email-provider.interface';
import { EmailMessage, EmailSendResult } from '../types/email.types';
import { EmailConfig } from '../config/email.config';

@Injectable()
export class SendGridProvider implements IEmailProvider {
  readonly name = 'sendgrid';
  private readonly logger = new Logger(SendGridProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.sendgrid.com/v3';

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<EmailConfig>('email');
    const apiKey = config?.sendgridApiKey;

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid');
    }

    this.apiKey = apiKey;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const payload = this.buildPayload(message);

    const response = await fetch(`${this.baseUrl}/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SendGrid API error ${response.status}: ${errorBody}`);
    }

    const messageId = response.headers.get('x-message-id') ?? undefined;

    this.logger.log(
      `Email sent via SendGrid [messageId=${messageId}] [to=${this.formatRecipientLog(message.to)}]`,
    );

    return {
      success: true,
      messageId,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  async verify(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/scopes`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch (error) {
      this.logger.error('SendGrid health check failed', error);
      return false;
    }
  }

  private buildPayload(message: EmailMessage): Record<string, unknown> {
    const toArray = Array.isArray(message.to) ? message.to : [message.to];

    return {
      personalizations: [
        {
          to: toArray.map((addr) => ({
            email: addr.email,
            ...(addr.name ? { name: addr.name } : {}),
          })),
        },
      ],
      from: {
        email: message.from.email,
        ...(message.from.name ? { name: message.from.name } : {}),
      },
      ...(message.replyTo
        ? { reply_to: { email: message.replyTo.email, name: message.replyTo.name } }
        : {}),
      subject: message.subject,
      content: [
        { type: 'text/html', value: message.html },
        ...(message.text ? [{ type: 'text/plain', value: message.text }] : []),
      ],
      ...(message.headers ? { headers: message.headers } : {}),
      ...(message.tags
        ? { categories: message.tags }
        : {}),
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
      },
    };
  }

  private formatRecipientLog(to: EmailMessage['to']): string {
    const addresses = Array.isArray(to) ? to : [to];
    return addresses.map((a) => a.email).join(', ');
  }
}
