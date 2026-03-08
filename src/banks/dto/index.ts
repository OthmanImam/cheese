// src/banks/dto/index.ts
import {
  IsNotEmpty,
  IsNumberString,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveAccountDto {
  @ApiProperty({
    example: '0123456789',
    description: 'Nigerian bank account number (exactly 10 digits)',
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(10)
  accountNumber: string;

  @ApiProperty({
    example: '058',
    description: 'Paystack bank code — obtain the full list from GET /v1/banks',
  })
  @IsString()
  @IsNotEmpty()
  bankCode: string;
}

export class BankTransferDto {
  @ApiProperty({
    example: '0123456789',
    description: 'Destination Nigerian bank account number (10 digits)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(10)
  accountNumber: string;

  @ApiProperty({
    example: '058',
    description: 'Paystack bank code for the destination bank',
  })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({
    example: 'Tunde Okafor',
    description:
      'Account holder name (must match resolved name to prevent misdirection)',
  })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({
    example: '50000',
    description: 'Amount to send in NGN (as a numeric string)',
  })
  @IsNumberString()
  amountNgn: string;

  @ApiProperty({
    example: 'hmac-sha256-base64url-here',
    description:
      "HMAC-SHA256(pin, deviceId) — authorises the debit from the user's USDC wallet",
  })
  @IsString()
  @IsNotEmpty()
  pinHash: string;

  @ApiProperty({
    example: 'base64-ecdsa-signature-here',
    description: 'ECDSA P-256 device signature of the transaction payload',
  })
  @IsString()
  @IsNotEmpty()
  deviceSignature: string;

  @ApiProperty({
    example: 'device-uuid-v4-here',
    description: 'Device ID of the signing device',
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
