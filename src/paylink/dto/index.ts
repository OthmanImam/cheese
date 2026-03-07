// src/paylink/dto/index.ts
import {
  IsNotEmpty, IsNumberString, IsOptional,
  IsString, IsUUID, Matches, MaxLength,
  Min, IsNumber, IsPositive,
} from 'class-validator'
import { Transform } from 'class-transformer'

// ── POST /paylink — create a payment request ──────────────
export class CreatePayLinkDto {
  /**
   * Amount in USDC the creator is requesting.
   * Sent as a string to preserve decimal precision.
   * Min: 0.01 USDC
   */
  @IsNumberString()
  @IsNotEmpty()
  amountUsdc: string

  /** Optional message shown to the payer ("Dinner at Nkoyo") */
  @IsOptional()
  @IsString()
  @MaxLength(140)
  note?: string

  /**
   * Hours until the link expires.
   * Defaults to 168h (7 days). Max 720h (30 days).
   */
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsPositive()
  expiresInHours?: number
}

// ── POST /paylink/:token/pay — payer settles the request ──
export class PayLinkPayDto {
  /** Payer's PIN hash: HMAC-SHA256(pin, deviceId) */
  @IsString()
  @IsNotEmpty()
  pinHash: string

  /** Device ID of the payer */
  @IsString()
  @IsNotEmpty()
  deviceId: string

  /** ECDSA P-256 signature of the payment payload */
  @IsString()
  @IsNotEmpty()
  deviceSignature: string
}
