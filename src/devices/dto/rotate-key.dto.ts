import { IsString, IsEnum, MaxLength } from 'class-validator';
import { KeyAlgorithm } from '../entities/device.entity';

export class RotateKeyDto {
  @IsString()
  @MaxLength(255)
  deviceId: string;

  /** New SPKI DER public key (base64) */
  @IsString()
  @MaxLength(1024)
  newPublicKey: string;

  @IsEnum(KeyAlgorithm)
  newKeyAlgorithm: KeyAlgorithm;

  /**
   * Rotation proof of possession.
   *
   * Client signs sha256(newPublicKey) with the OLD private key.
   * This proves continuity: only the genuine holder of the old
   * private key can initiate a rotation. Without this, an attacker
   * who intercepts the request could substitute their own public key.
   *
   * Format: base64(oldPrivateKey.sign(sha256(newPublicKey)))
   */
  @IsString()
  @MaxLength(256)
  rotationProofSignature: string;
}
