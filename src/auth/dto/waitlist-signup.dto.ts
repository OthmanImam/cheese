import {
  IsString, MinLength, MaxLength, Matches,
  IsPhoneNumber, IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class WaitlistSignupDto {
  /** HMAC-signed continuation token from the launch email link */
  @IsString()
  token: string;

  @IsString()
  @MinLength(12)
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
}
