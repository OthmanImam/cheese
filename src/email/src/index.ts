// Module
export { EmailModule } from './email/email.module';

// Primary service (inject this into other modules)
export { EmailService } from './email/email.service';

// Template service (inject if you need direct template rendering)
export { EmailTemplateService } from './email/email-template.service';

// Provider interface (implement this to add a new provider)
export { IEmailProvider, EMAIL_PROVIDER } from './email/providers/email-provider.interface';

// Concrete providers
export { ZeptoMailProvider } from './email/providers/zeptomail.provider';
export { SmtpProvider } from './email/providers/smtp.provider';

// Types & enums
export { EmailTemplate, EmailProvider, EmailAddress, EmailMessage, EmailSendResult } from './email/types/email.types';

// DTOs
export {
  SendWaitlistConfirmationDto,
  SendLaunchAnnouncementDto,
  SendOtpConfirmationDto,
  SendSuccessfulSignupDto,
  SendDepositConfirmationDto,
  SendWithdrawalConfirmationDto,
  NextStepDto,
} from './email/dto/email.dto';

// Exceptions
export {
  EmailSendException,
  EmailTemplateRenderException,
  EmailProviderConnectionException,
} from './email/exceptions/email.exceptions';

// Config
export { emailConfig, EmailConfig } from './email/config/email.config';
