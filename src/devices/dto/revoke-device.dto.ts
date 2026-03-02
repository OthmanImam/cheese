import { IsString, MaxLength, IsOptional } from 'class-validator';

export class RevokeDeviceDto {
  @IsString()
  @MaxLength(255)
  deviceId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
