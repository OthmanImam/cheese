import {
  IsString, IsEnum, MaxLength, IsOptional,
} from 'class-validator';
import { DevicePlatform, KeyAlgorithm } from '../entities/device.entity';

export class RegisterDeviceDto {
  /**
   * Hardware-bound OS identifier.
   * NOT a secret — device is authenticated by its private key signature.
   */
  @IsString()
  @MaxLength(255)
  deviceId: string;

  @IsString()
  @MaxLength(255)
  deviceName: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  osVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceModel?: string;

  /**
   * Base64-encoded SPKI DER public key blob.
   *
   * Client SDK contract:
   *   iOS (Swift):
   *     let pubKeyData = SecKeyCopyExternalRepresentation(pubKey, nil)
   *     // Prepend SPKI header for ed25519 or secp256k1 then base64
   *
   *   Android (Kotlin):
   *     val pubKey = keyPair.public as ECPublicKey  // or EdDSAPublicKey
   *     val spki = pubKey.encoded  // already SPKI DER
   *     val b64 = Base64.encodeToString(spki, Base64.NO_WRAP)
   *
   *   React Native / Web:
   *     const key = await crypto.subtle.generateKey({name:'Ed25519'}, false, ['sign','verify'])
   *     const spki = await crypto.subtle.exportKey('spki', key.publicKey)
   *     const b64 = btoa(String.fromCharCode(...new Uint8Array(spki)))
   */
  @IsString()
  @MaxLength(1024)
  publicKey: string;

  @IsEnum(KeyAlgorithm)
  keyAlgorithm: KeyAlgorithm;
}
