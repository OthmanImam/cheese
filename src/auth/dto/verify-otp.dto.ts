import { IsUUID, IsString, Length, IsEnum } from 'class-validator';
import { OtpPurpose } from '../../otp/entities/otp.entity';

export class VerifyOtpDto {
  @IsUUID()
  userId: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  code: string;

  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
