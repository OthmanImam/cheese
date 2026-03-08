// src/paylink/dto/index.ts
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsNumber,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePayLinkDto {
  @ApiProperty({
    example: '50.00',
    description:
      'Amount of USDC the creator is requesting. Minimum: 0.01 USDC. Maximum: 50,000 USDC. Sent as a string to preserve decimal precision.',
  })
  @IsNumberString()
  @IsNotEmpty()
  amountUsdc: string;

  @ApiPropertyOptional({
    example: 'Dinner at Nkoyo 🍽️',
    description:
      'Optional message shown to the payer explaining what the payment is for. Maximum 140 characters.',
    maxLength: 140,
  })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  note?: string;

  @ApiPropertyOptional({
    example: 168,
    description:
      'How long the link stays active in hours. Defaults to 168 (7 days). Maximum: 720 (30 days).',
    default: 168,
    minimum: 1,
    maximum: 720,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsPositive()
  expiresInHours?: number;
}

export class PayLinkPayDto {
  @ApiProperty({
    example: 'hmac-sha256-base64url-here',
    description:
      "Payer's HMAC-SHA256(pin, deviceId) in base64url — authorises the payment debit",
  })
  @IsString()
  @IsNotEmpty()
  pinHash: string;

  @ApiProperty({
    example: 'device-uuid-v4-here',
    description: "Device ID of the payer's device",
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({
    example: 'base64-ecdsa-signature-here',
    description:
      "ECDSA P-256 signature of the payment payload — proves the payer's device authorised this transaction",
  })
  @IsString()
  @IsNotEmpty()
  deviceSignature: string;
}
