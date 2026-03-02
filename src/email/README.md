# Cheese Wallet — Email Module

Production-ready NestJS email module with provider abstraction, typed templates, and full DI wiring.

---

## Folder Structure

```
src/
├── index.ts                          ← Public barrel export
│
├── email/
│   ├── email.module.ts               ← DynamicModule with provider factory
│   ├── email.service.ts              ← Primary service (inject this)
│   ├── email-template.service.ts     ← Renders HTML from typed vars
│   │
│   ├── config/
│   │   └── email.config.ts           ← Typed config via @nestjs/config
│   │
│   ├── dto/
│   │   └── email.dto.ts              ← class-validator DTOs for all 6 email types
│   │
│   ├── exceptions/
│   │   └── email.exceptions.ts       ← EmailSendException, TemplateRenderException
│   │
│   ├── providers/
│   │   ├── email-provider.interface.ts  ← IEmailProvider contract
│   │   ├── sendgrid.provider.ts         ← SendGrid (default)
│   │   └── smtp.provider.ts             ← SMTP/Nodemailer fallback
│   │
│   ├── templates/html/
│   │   ├── base.template.ts             ← Shared header/footer/helpers
│   │   ├── waitlist-confirmation.template.ts
│   │   ├── launch-announcement.template.ts
│   │   ├── otp-confirmation.template.ts
│   │   ├── successful-signup.template.ts
│   │   ├── deposit-confirmation.template.ts
│   │   └── withdrawal-confirmation.template.ts
│   │
│   ├── types/
│   │   └── email.types.ts
│   │
│   ├── email.service.spec.ts
│   └── email-template.service.spec.ts
│
└── auth/
    ├── auth.service.ts               ← Example integration usage
    └── entities/
        ├── user.entity.ts
        ├── otp-record.entity.ts
        └── waitlist-entry.entity.ts
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install @nestjs/config nodemailer
npm install -D @types/nodemailer
# For SendGrid — no SDK needed, uses native fetch
```

### 2. Set environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
EMAIL_PROVIDER=zeptomail
EMAIL_FROM_ADDRESS=noreply@cheese.app
EMAIL_FROM_NAME=Cheese Wallet
# Get this from: ZeptoMail dashboard → Agents → your agent → SMTP/API → API tab
ZEPTOMAIL_TOKEN=Zoho-enczapikey xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_NAME=Cheese Wallet
APP_URL=https://cheese.app
SUPPORT_EMAIL=support@cheese.app
```

### 3. Register in AppModule

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EmailModule.registerAsync(),   // ← registers globally
  ],
})
export class AppModule {}
```

### 4. Inject and use EmailService

```typescript
// any.service.ts
import { Injectable } from '@nestjs/common';
import { EmailService } from './email/email.service';

@Injectable()
export class WalletService {
  constructor(private readonly emailService: EmailService) {}

  async handleDeposit(user: User, txn: Transaction) {
    await this.emailService.sendDepositConfirmation({
      recipientEmail: user.email,
      firstName: user.firstName,
      amountUsd: '$1,240.00',
      amountNgn: '₦1,984,000.00',
      exchangeRate: '₦1,600 / $1',
      transactionId: txn.id,
      depositedAt: txn.createdAt.toISOString(),
      fundingMethod: 'Bank Transfer',
      currentBalanceUsd: '$2,480.00',
      currentBalanceNgn: '₦3,968,000.00',
      dashboardUrl: 'https://cheese.app/wallet',
    });
  }
}
```

---

## Templates Reference

| # | Template | Subject |
|---|----------|---------|
| 1 | `WAITLIST_CONFIRMATION` | `You're officially on the waitlist, @{username}` |
| 2 | `LAUNCH_ANNOUNCEMENT` | `We're Live — Claim @{username} Before It Expires` |
| 3 | `OTP_CONFIRMATION` | `Your Verification Code` |
| 4 | `SUCCESSFUL_SIGNUP` | `Welcome to Cheese Wallet, {firstName}` |
| 5 | `DEPOSIT_CONFIRMATION` | `Deposit Successful — {amount} Added to Your Wallet` |
| 6 | `WITHDRAWAL_CONFIRMATION` | `Withdrawal Processed — {amount} on Its Way` |

---

## Adding a New Provider

1. Create `src/email/providers/ses.provider.ts` implementing `IEmailProvider`
2. Add `SES = 'ses'` to `EmailProvider` enum in `email.types.ts`
3. Add the SES case to the factory in `email.module.ts`
4. Add config fields to `email.config.ts`

```typescript
// email.module.ts — add to the switch
case EmailProviderEnum.SES:
  return new SesProvider(configService);
```

> **Note:** `ZeptoMailProvider` is the default. `SmtpProvider` is the fallback. ZeptoMail also exposes SMTP credentials (from the same dashboard page as the API token) — if you want SMTP instead of the REST API, set `EMAIL_PROVIDER=smtp` and paste ZeptoMail's SMTP credentials into the `SMTP_*` env vars.

---

## Adding a New Template

1. Create `src/email/templates/html/my-template.template.ts` exporting a render function
2. Add the template key to `EmailTemplate` enum
3. Add the subject to `SUBJECTS` map in `email-template.service.ts`
4. Add a `case` to `renderTemplate()` in `EmailTemplateService`
5. Add a `sendMyTemplate()` method to `EmailService`
6. Add a DTO to `email.dto.ts`

---

## Running Tests

```bash
npm test
npm run test:cov
```

---

## Design Decisions

**Why no Handlebars/Mustache?**  
Template engines add runtime dependencies and require file-system access that complicates Lambda/serverless deployments. TypeScript functions give us type safety, tree-shaking, and zero runtime overhead — the template is just a string-returning function.

**Why `EMAIL_PROVIDER` symbol injection?**  
Using a symbol token (`Inject(EMAIL_PROVIDER)`) decouples `EmailService` from any concrete provider. Swapping from SendGrid to SES requires changing only the `EmailModule` factory — zero changes to `EmailService` or its callers.

**Why fire-and-forget for waitlist emails?**  
Waitlist join is a non-critical path. Failing to send a confirmation email should not fail the API response. The failure is logged and can be picked up by a retry queue. By contrast, OTP and transaction emails are awaited — the caller needs confirmation they were dispatched.

**Why inline CSS on templates?**  
Email clients strip `<style>` blocks and head CSS. Inline styles are the only reliable cross-client approach (Gmail, Outlook, Apple Mail, Yahoo).
