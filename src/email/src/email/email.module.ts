import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { EMAIL_PROVIDER, IEmailProvider } from './providers/email-provider.interface';
import { ZeptoMailProvider } from './providers/zeptomail.provider';
import { SmtpProvider } from './providers/smtp.provider';
import { emailConfig, EmailConfig } from './config/email.config';
import { EmailProvider as EmailProviderEnum } from './types/email.types';

@Module({})
export class EmailModule {
  /**
   * Register the module globally with async configuration.
   * Reads EMAIL_PROVIDER env var to select the concrete provider.
   *
   * Usage in AppModule:
   *   EmailModule.registerAsync()
   */
  static registerAsync(): DynamicModule {
    const providerFactory: Provider = {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: ConfigService): IEmailProvider => {
        const config = configService.get<EmailConfig>('email')!;

        switch (config.provider) {
          case EmailProviderEnum.SMTP:
            return new SmtpProvider(configService);
          case EmailProviderEnum.ZEPTOMAIL:
          default:
            return new ZeptoMailProvider(configService);
        }
      },
      inject: [ConfigService],
    };

    return {
      module: EmailModule,
      global: true,
      imports: [
        ConfigModule.forFeature(emailConfig),
      ],
      providers: [
        providerFactory,
        EmailTemplateService,
        EmailService,
      ],
      exports: [EmailService],
    };
  }
}
