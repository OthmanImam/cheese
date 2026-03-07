// src/waitlist/dto/index.ts
import {
  IsEmail, IsNotEmpty, IsOptional,
  IsString, Matches, MaxLength, MinLength,
} from 'class-validator'
import { Transform } from 'class-transformer'

export class JoinWaitlistDto {
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string

  @IsString() @MinLength(3) @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers and underscores',
  })
  @Transform(({ value }) => value?.toLowerCase().trim().replace(/^@/, ''))
  username: string

  @IsOptional() @IsString()
  referralSource?: string
}
