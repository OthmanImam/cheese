// src/profile/dto/index.ts
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Tunde Okafor',
    description: 'Updated display name (max 80 characters)',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fullName?: string;

  @ApiPropertyOptional({
    example: 'tunde_ok',
    description:
      'New username (3–20 chars, letters/numbers/underscores). Must be unique across all users.',
    minLength: 3,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers and underscores',
  })
  username?: string;

  @ApiPropertyOptional({
    example: '+2348012345678',
    description: 'Updated phone number in E.164 format',
  })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number' })
  phone?: string;
}
