import {
  IsEmail, IsString, MinLength, MaxLength, Matches,
  IsPhoneNumber, IsOptional, Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class DirectSignupDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @MaxLength(320)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @Length(3, 30, { message: 'Username must be 3–30 characters' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Username may only contain lowercase letters, numbers, and underscores',
  })
  @Transform(({ value }) => value?.toLowerCase().trim())
  username: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message: 'Password must include uppercase, lowercase, a number, and a special character',
  })
  password: string;

  @IsPhoneNumber(undefined, { message: 'Must be a valid international phone number' })
  @Transform(({ value }) => value?.replace(/\s+/g, ''))
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  /** Optional — triggers referral flow if present and valid */
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Transform(({ value }) => value?.toUpperCase().trim())
  referralCode?: string;
}
