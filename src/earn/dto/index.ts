// src/earn/dto/index.ts
import { IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositEarnDto {
  @ApiProperty({
    example: '100.00',
    description:
      "Amount of USDC to deposit into the earn position. Minimum: 1.00 USDC. Deducted from the user's main wallet balance.",
  })
  @IsNumberString()
  amountUsdc: string;
}

export class WithdrawEarnDto {
  @ApiProperty({
    example: '50.00',
    description:
      'Amount of USDC to withdraw from the earn position. Pending yield is withdrawn first, then principal.',
  })
  @IsNumberString()
  amountUsdc: string;
}
