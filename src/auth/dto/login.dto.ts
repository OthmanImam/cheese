import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  /**
   * Accepts email OR username.
   * Server-side detection: contains '@' → treat as email.
   */
  @IsString()
  @MaxLength(320)
  @Transform(({ value }) => value?.toLowerCase().trim())
  identifier: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
