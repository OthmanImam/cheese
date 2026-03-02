import { EmailMessage, EmailSendResult } from '../types/email.types';

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export interface IEmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
  verify(): Promise<boolean>;
}
