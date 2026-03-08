// src/cards/dto/index.ts
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevealCvvDto {
  @ApiProperty({
    example: '1234',
    description:
      "User's 4-digit PIN — verified server-side against the stored hash. CVV is returned only on a valid match.",
  })
  @IsString()
  @IsNotEmpty()
  pin: string;
}
