import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email-template.service';
import { EMAIL_PROVIDER } from '../email/providers/email-provider.interface';
import { EmailSendException } from '../email/exceptions/email.exceptions';
import { EmailTemplate } from '../email/types/email.types';

const mockProvider = {
  name: 'zeptomail',
  send: jest.fn(),
  verify: jest.fn().mockResolvedValue(true),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue({
    fromEmail: 'noreply@cheese.app',
    fromName: 'Cheese Wallet',
    replyToEmail: 'support@cheese.app',
    appName: 'Cheese Wallet',
    appUrl: 'https://cheese.app',
    supportEmail: 'support@cheese.app',
  }),
};

const mockTemplateService = {
  render: jest.fn().mockReturnValue({
    subject: 'Test Subject',
    html: '<html><body>Test</body></html>',
    previewText: 'Test preview',
  }),
};

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: EMAIL_PROVIDER, useValue: mockProvider },
        { provide: EmailTemplateService, useValue: mockTemplateService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    jest.clearAllMocks();
    mockProvider.send.mockResolvedValue({
      success: true,
      messageId: 'msg-123',
      provider: 'zeptomail',
      timestamp: new Date(),
    });
  });

  describe('onModuleInit', () => {
    it('passes when provider is healthy', async () => {
      mockProvider.verify.mockResolvedValueOnce(true);
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('throws EmailProviderConnectionException when provider is unhealthy', async () => {
      mockProvider.verify.mockResolvedValueOnce(false);
      await expect(service.onModuleInit()).rejects.toThrow('failed health check');
    });
  });

  describe('sendWaitlistConfirmation', () => {
    const dto = {
      recipientEmail: 'temi@example.com',
      firstName: 'Temi',
      username: 'temi_builds',
      waitlistPosition: 1234,
      referralLink: 'https://cheese.app/ref/temi_builds',
      reservationExpiryDays: 90,
    };

    it('renders template and dispatches email', async () => {
      await service.sendWaitlistConfirmation(dto);
      expect(mockTemplateService.render).toHaveBeenCalledWith(
        EmailTemplate.WAITLIST_CONFIRMATION,
        expect.objectContaining({ username: 'temi_builds', waitlistPosition: 1234 }),
      );
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: { email: 'temi@example.com' },
          subject: 'Test Subject',
          html: expect.stringContaining('<html>'),
        }),
      );
    });

    it('throws EmailSendException when provider fails', async () => {
      mockProvider.send.mockRejectedValueOnce(new Error('Network timeout'));
      await expect(service.sendWaitlistConfirmation(dto)).rejects.toThrow(EmailSendException);
    });
  });

  describe('sendOtpConfirmation', () => {
    const dto = {
      recipientEmail: 'temi@example.com',
      firstName: 'Temi',
      otp: '849201',
      expiryMinutes: 10,
      requestedAt: '28 Jun 2026, 09:00',
      ipAddress: '197.210.0.1',
    };

    it('renders OTP template with correct vars', async () => {
      await service.sendOtpConfirmation(dto);
      expect(mockTemplateService.render).toHaveBeenCalledWith(
        EmailTemplate.OTP_CONFIRMATION,
        expect.objectContaining({ otp: '849201', expiryMinutes: 10 }),
      );
    });

    it('tags email as security/otp', async () => {
      await service.sendOtpConfirmation(dto);
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ tags: expect.arrayContaining(['otp', 'security']) }),
      );
    });
  });

  describe('sendDepositConfirmation', () => {
    const dto = {
      recipientEmail: 'temi@example.com',
      firstName: 'Temi',
      amountUsd: '$1,240.00',
      amountNgn: '₦1,984,000.00',
      exchangeRate: '₦1,600 / $1',
      transactionId: 'txn_abc123',
      depositedAt: '28 Jun 2026, 09:15',
      fundingMethod: 'Bank Transfer',
      currentBalanceUsd: '$2,480.00',
      currentBalanceNgn: '₦3,968,000.00',
      dashboardUrl: 'https://cheese.app/wallet',
    };

    it('renders deposit template and sends', async () => {
      await service.sendDepositConfirmation(dto);
      expect(mockTemplateService.render).toHaveBeenCalledWith(
        EmailTemplate.DEPOSIT_CONFIRMATION,
        expect.objectContaining({ transactionId: 'txn_abc123', amountUsd: '$1,240.00' }),
      );
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendWithdrawalConfirmation', () => {
    const dto = {
      recipientEmail: 'temi@example.com',
      firstName: 'Temi',
      amountUsd: '$500.00',
      amountNgn: '₦800,000.00',
      destinationBank: 'First Bank',
      destinationAccount: '3012345678',
      destinationName: 'Temi Adeyemi',
      transactionId: 'txn_withdraw_xyz',
      initiatedAt: '28 Jun 2026, 14:30',
      estimatedArrival: '1–2 business hours',
      remainingBalanceUsd: '$1,980.00',
      remainingBalanceNgn: '₦3,168,000.00',
      dashboardUrl: 'https://cheese.app/wallet',
    };

    it('masks account number in rendered template vars', async () => {
      await service.sendWithdrawalConfirmation(dto);
      expect(mockProvider.send).toHaveBeenCalledTimes(1);
    });

    it('throws EmailSendException on provider error', async () => {
      mockProvider.send.mockRejectedValueOnce(new Error('SendGrid 429'));
      await expect(service.sendWithdrawalConfirmation(dto)).rejects.toThrow(EmailSendException);
    });
  });
});
