import { IsUUID, IsEnum } from 'class-validator';
import { OtpPurpose } from '../../otp/entities/otp.entity';

export class ResendOtpDto {
  @IsUUID()
  userId: string;

  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
