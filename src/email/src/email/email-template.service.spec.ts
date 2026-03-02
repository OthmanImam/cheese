import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateService } from '../email/email-template.service';
import { EmailTemplate } from '../email/types/email.types';

const mockConfigService = {
  get: jest.fn().mockReturnValue({
    appName: 'Cheese Wallet',
    appUrl: 'https://cheese.app',
    supportEmail: 'support@cheese.app',
    logoUrl: undefined,
  }),
};

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTemplateService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    service = module.get<EmailTemplateService>(EmailTemplateService);
  });

  describe('render — WAITLIST_CONFIRMATION', () => {
    it('renders valid HTML with username and position', () => {
      const result = service.render(EmailTemplate.WAITLIST_CONFIRMATION, {
        firstName: 'Temi',
        username: 'temi_builds',
        waitlistPosition: 4831,
        referralLink: 'https://cheese.app/ref/temi_builds',
        reservationExpiryDays: 90,
      });
      expect(result.html).toContain('@temi_builds');
      expect(result.html).toContain('4,831');
      expect(result.html).toContain('90');
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.subject).toContain('@temi_builds');
    });
  });

  describe('render — LAUNCH_ANNOUNCEMENT', () => {
    it('renders urgency strip when daysToExpiry <= 14', () => {
      const result = service.render(EmailTemplate.LAUNCH_ANNOUNCEMENT, {
        firstName: 'Temi',
        username: 'temi_builds',
        claimDeadline: '26 Sep 2026',
        daysToExpiry: 7,
        earlyAccessPerks: ['Gold 90 days free', '+0.5% yield'],
        appDownloadUrl: 'https://cheese.app/download',
      });
      expect(result.html).toContain('7 days left to claim');
    });

    it('omits urgency strip when daysToExpiry > 14', () => {
      const result = service.render(EmailTemplate.LAUNCH_ANNOUNCEMENT, {
        firstName: 'Temi',
        username: 'temi_builds',
        claimDeadline: '26 Sep 2026',
        daysToExpiry: 60,
        earlyAccessPerks: [],
        appDownloadUrl: 'https://cheese.app/download',
      });
      expect(result.html).not.toContain('days left to claim');
    });
  });

  describe('render — OTP_CONFIRMATION', () => {
    it('renders each OTP digit in its own box', () => {
      const result = service.render(EmailTemplate.OTP_CONFIRMATION, {
        firstName: 'Temi',
        otp: '849201',
        expiryMinutes: 10,
        requestedAt: '28 Jun 2026, 09:00',
      });
      // Each digit gets its own <td>
      '849201'.split('').forEach((digit) => {
        expect(result.html).toContain(`>${digit}<`);
      });
      expect(result.html).toContain('10 minutes');
    });

    it('includes IP and device when provided', () => {
      const result = service.render(EmailTemplate.OTP_CONFIRMATION, {
        firstName: 'Temi',
        otp: '112233',
        expiryMinutes: 10,
        requestedAt: '28 Jun 2026, 09:00',
        ipAddress: '197.210.0.1',
        deviceInfo: 'Chrome on macOS',
      });
      expect(result.html).toContain('197.210.0.1');
      expect(result.html).toContain('Chrome on macOS');
    });
  });

  describe('render — SUCCESSFUL_SIGNUP', () => {
    it('renders tier badge and all next steps', () => {
      const result = service.render(EmailTemplate.SUCCESSFUL_SIGNUP, {
        firstName: 'Temi',
        username: 'temi_builds',
        tierName: 'Gold',
        tierColor: '#C9A84C',
        nextSteps: [
          { title: 'Fund Wallet', description: 'Deposit Naira' },
          { title: 'Get QR', description: 'Set up payments', ctaLabel: 'Set Up', ctaUrl: 'https://cheese.app/qr' },
        ],
        referralLink: 'https://cheese.app/ref/temi_builds',
        dashboardUrl: 'https://cheese.app/wallet',
      });
      expect(result.html).toContain('Gold');
      expect(result.html).toContain('Fund Wallet');
      expect(result.html).toContain('Set Up');
    });
  });

  describe('render — DEPOSIT_CONFIRMATION', () => {
    it('renders amount, txn ID and balance', () => {
      const result = service.render(EmailTemplate.DEPOSIT_CONFIRMATION, {
        firstName: 'Temi',
        amountUsd: '$1,240.00',
        amountNgn: '₦1,984,000',
        exchangeRate: '₦1,600 / $1',
        transactionId: 'txn_abc123',
        depositedAt: '28 Jun 2026, 09:15',
        fundingMethod: 'Bank Transfer',
        currentBalanceUsd: '$2,480.00',
        currentBalanceNgn: '₦3,968,000',
        dashboardUrl: 'https://cheese.app/wallet',
      });
      expect(result.html).toContain('$1,240.00');
      expect(result.html).toContain('txn_abc123');
      expect(result.html).toContain('$2,480.00');
      expect(result.html).toContain('Confirmed');
    });
  });

  describe('render — WITHDRAWAL_CONFIRMATION', () => {
    it('masks account number showing only last 4 digits', () => {
      const result = service.render(EmailTemplate.WITHDRAWAL_CONFIRMATION, {
        firstName: 'Temi',
        amountUsd: '$500.00',
        amountNgn: '₦800,000',
        destinationBank: 'First Bank',
        destinationAccount: '3012345678',
        destinationName: 'Temi Adeyemi',
        transactionId: 'txn_xyz',
        initiatedAt: '28 Jun 2026, 14:30',
        estimatedArrival: '1–2 business hours',
        remainingBalanceUsd: '$1,980.00',
        remainingBalanceNgn: '₦3,168,000',
        dashboardUrl: 'https://cheese.app/wallet',
      });
      expect(result.html).toContain('****5678');
      expect(result.html).not.toContain('3012345678');
      expect(result.html).toContain('txn_xyz');
    });
  });

  describe('error handling', () => {
    it('throws EmailTemplateRenderException for unknown template', () => {
      expect(() =>
        service.render('unknown-template' as EmailTemplate, {} as never),
      ).toThrow('Failed to render email template');
    });
  });
});
