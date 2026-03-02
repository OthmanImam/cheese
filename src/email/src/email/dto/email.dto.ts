import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  IsUrl,
  Min,
  Max,
  Length,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────────────────────────────────────
// 1. Waitlist Confirmation
// ─────────────────────────────────────────────────────
export class SendWaitlistConfirmationDto {
  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 24)
  username: string;

  @IsNumber()
  @IsPositive()
  waitlistPosition: number;

  @IsUrl()
  referralLink: string;

  @IsNumber()
  @Min(1)
  @Max(365)
  reservationExpiryDays: number = 90;
}

// ─────────────────────────────────────────────────────
// 2. Launch Announcement
// ─────────────────────────────────────────────────────
export class SendLaunchAnnouncementDto {
  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  claimDeadline: string;

  @IsNumber()
  @Min(1)
  daysToExpiry: number;

  @IsArray()
  @IsString({ each: true })
  earlyAccessPerks: string[];

  @IsUrl()
  appDownloadUrl: string;
}

// ─────────────────────────────────────────────────────
// 3. OTP Confirmation
// ─────────────────────────────────────────────────────
export class SendOtpConfirmationDto {
  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @Length(4, 8)
  otp: string;

  @IsNumber()
  @Min(1)
  @Max(60)
  expiryMinutes: number = 10;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  deviceInfo?: string;

  @IsString()
  @IsNotEmpty()
  requestedAt: string;
}

// ─────────────────────────────────────────────────────
// 4. Successful Signup
// ─────────────────────────────────────────────────────
export class NextStepDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  ctaLabel?: string;

  @IsUrl()
  @IsOptional()
  ctaUrl?: string;
}

export class SendSuccessfulSignupDto {
  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  tierName: string;

  @IsString()
  @IsNotEmpty()
  tierColor: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NextStepDto)
  nextSteps: NextStepDto[];

  @IsUrl()
  referralLink: string;

  @IsUrl()
  dashboardUrl: string;
}

// ─────────────────────────────────────────────────────
// 5. Deposit Confirmation
// ─────────────────────────────────────────────────────
export class SendDepositConfirmationDto {
  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  amountUsd: string;

  @IsString()
  @IsNotEmpty()
  amountNgn: string;

  @IsString()
  @IsNotEmpty()
  exchangeRate: string;

  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsString()
  @IsNotEmpty()
  depositedAt: string;

  @IsString()
  @IsNotEmpty()
  fundingMethod: string;

  @IsString()
  @IsNotEmpty()
  currentBalanceUsd: string;

  @IsString()
  @IsNotEmpty()
  currentBalanceNgn: string;

  @IsUrl()
  dashboardUrl: string;
}

// ─────────────────────────────────────────────────────
// 6. Withdrawal Confirmation
// ─────────────────────────────────────────────────────
export class SendWithdrawalConfirmationDto {
  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  amountUsd: string;

  @IsString()
  @IsNotEmpty()
  amountNgn: string;

  @IsString()
  @IsNotEmpty()
  destinationBank: string;

  @IsString()
  @IsNotEmpty()
  destinationAccount: string;

  @IsString()
  @IsNotEmpty()
  destinationName: string;

  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsString()
  @IsNotEmpty()
  initiatedAt: string;

  @IsString()
  @IsNotEmpty()
  estimatedArrival: string;

  @IsString()
  @IsNotEmpty()
  remainingBalanceUsd: string;

  @IsString()
  @IsNotEmpty()
  remainingBalanceNgn: string;

  @IsUrl()
  dashboardUrl: string;
}
