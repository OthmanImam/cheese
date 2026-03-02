import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailProvider } from './email-provider.interface';
import { EmailMessage, EmailSendResult } from '../types/email.types';
import { EmailConfig } from '../config/email.config';

/**
 * ZeptoMail provider — Zoho's transactional-only email service.
 *
 * API reference: https://www.zoho.com/zeptomail/help/api/email-sending.html
 *
 * Key differences from SendGrid:
 *  - Auth header:  `Zoho-enczapikey <send_mail_token>`
 *  - Recipients:   `email_address: { address, name }` (nested object)
 *  - HTML body:    `htmlbody` field (not `html`)
 *  - Text body:    `textbody` field (not `text`)
 *  - No dedicated verify endpoint — we hit the mail agents list instead
 */
@Injectable()
export class ZeptoMailProvider implements IEmailProvider {
  readonly name = 'zeptomail';

  private readonly logger = new Logger(ZeptoMailProvider.name);
  private readonly sendUrl = 'https://api.zeptomail.com/v1.1/email';
  private readonly agentsUrl = 'https://api.zeptomail.com/v1.1/mailagents';
  private readonly token: string;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<EmailConfig>('email');
    const token = config?.zeptomailToken;

    if (!token) {
      throw new Error(
        'ZEPTOMAIL_TOKEN is required when EMAIL_PROVIDER=zeptomail. ' +
        'Generate a Send Mail Token in your ZeptoMail account under Agents → SMTP/API.',
      );
    }

    this.token = token;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const payload = this.buildPayload(message);

    const response = await fetch(this.sendUrl, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '<unreadable>');
      throw new Error(
        `ZeptoMail API error [status=${response.status}]: ${errorBody}`,
      );
    }

    const body = await response.json().catch(() => ({}));

    // ZeptoMail returns `{ data: [{ message_id }] }` on success
    const messageId: string | undefined =
      body?.data?.[0]?.message_id ?? body?.request_id ?? undefined;

    this.logger.log(
      `Email sent via ZeptoMail [messageId=${messageId ?? 'n/a'}] ` +
      `[to=${this.formatRecipientLog(message.to)}]`,
    );

    return {
      success: true,
      messageId,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  /**
   * Health check — verifies the token is valid by listing mail agents.
   * Returns true if the API responds with 2xx.
   */
  async verify(): Promise<boolean> {
    try {
      const response = await fetch(this.agentsUrl, {
        method: 'GET',
        headers: this.buildHeaders(),
      });
      return response.ok;
    } catch (error) {
      this.logger.error('ZeptoMail health check failed', error);
      return false;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // ZeptoMail uses a proprietary auth scheme — NOT Bearer
      Authorization: `Zoho-enczapikey ${this.token}`,
    };
  }

  private buildPayload(message: EmailMessage): Record<string, unknown> {
    const toArray = Array.isArray(message.to) ? message.to : [message.to];

    return {
      // Sender
      from: {
        address: message.from.email,
        ...(message.from.name ? { name: message.from.name } : {}),
      },

      // Recipients — ZeptoMail wraps each address in `email_address`
      to: toArray.map((addr) => ({
        email_address: {
          address: addr.email,
          ...(addr.name ? { name: addr.name } : {}),
        },
      })),

      // Reply-to — ZeptoMail expects an array of address objects
      ...(message.replyTo
        ? {
            reply_to: [
              {
                address: message.replyTo.email,
                ...(message.replyTo.name ? { name: message.replyTo.name } : {}),
              },
            ],
          }
        : {}),

      subject: message.subject,

      // ZeptoMail uses `htmlbody` / `textbody` — NOT `html` / `text`
      htmlbody: message.html,
      ...(message.text ? { textbody: message.text } : {}),

      // Custom MIME headers (optional)
      ...(message.headers
        ? { mime_headers: message.headers }
        : {}),

      // Tracking
      track_clicks: true,
      track_opens: true,

      // client_reference is ZeptoMail's equivalent of SendGrid's categories —
      // it shows up in logs/dashboard and is useful for debugging per-template
      ...(message.tags?.length
        ? { client_reference: message.tags.join(':') }
        : {}),
    };
  }

  private formatRecipientLog(to: EmailMessage['to']): string {
    const addresses = Array.isArray(to) ? to : [to];
    return addresses.map((a) => a.email).join(', ');
  }
}
