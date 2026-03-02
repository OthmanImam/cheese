import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, Check,
} from 'typeorm';

export enum DevicePlatform {
  IOS     = 'ios',
  ANDROID = 'android',
  WEB     = 'web',
}

export enum KeyAlgorithm {
  ED25519   = 'ed25519',
  SECP256K1 = 'secp256k1',
}

export enum DeviceStatus {
  ACTIVE  = 'active',
  REVOKED = 'revoked',
}

@Entity('devices')
@Index('IDX_devices_user_id',         ['userId'])
@Index('IDX_devices_user_whitelisted', ['userId', 'whitelisted'])
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  /**
   * Hardware-bound OS identifier.
   * iOS: identifierForVendor | Android: ANDROID_ID | Web: secure random UUID
   * NOT a secret — authentication is via signature, not this ID.
   */
  @Column({ type: 'varchar', length: 255 })
  @Index('UQ_devices_device_id', { unique: true })
  deviceId: string;

  @Column({ type: 'varchar', length: 255 })
  deviceName: string;

  @Column({ type: 'enum', enum: DevicePlatform })
  platform: DevicePlatform;

  @Column({ type: 'varchar', length: 100, nullable: true })
  osVersion: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  appVersion: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceModel: string | null;

  /**
   * Base64-encoded SubjectPublicKeyInfo (SPKI) DER blob.
   *
   * Why SPKI and not raw bytes?
   *   Node's crypto.createVerify() requires a KeyObject. Importing raw
   *   ed25519/secp256k1 bytes needs manual OID/DER prefix injection.
   *   SPKI avoids that — createPublicKey({ key, format:'der', type:'spki' })
   *   works directly. Client SDKs (Swift SecKey, Android KeyStore) can export
   *   in this format natively.
   *
   * The private key NEVER leaves the device hardware (Secure Enclave / Keystore).
   */
  @Column({ type: 'text' })
  publicKey: string;

  @Column({
    type: 'enum',
    enum: KeyAlgorithm,
    default: KeyAlgorithm.ED25519,
  })
  keyAlgorithm: KeyAlgorithm;

  /**
   * Key version — incremented on each rotation.
   * During rotation we briefly accept version N or N-1.
   * After the grace window, all N-1 requests are rejected.
   */
  @Column({ type: 'smallint', default: 1 })
  keyVersion: number;

  /**
   * SHA-256(base64PublicKey) stored as lowercase hex.
   * Used in audit logs without needing to log the full key blob.
   */
  @Column({ type: 'char', length: 64 })
  publicKeyFingerprint: string;

  // ── Authorization ─────────────────────────────────────────────────────────

  /**
   * Master authorization flag — only whitelisted devices may submit
   * signed transaction requests. Flipped to false on:
   *   - Admin revocation
   *   - Risk-engine trigger
   *   - User "sign out all" request
   */
  @Column({ type: 'boolean', default: true })
  whitelisted: boolean;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.ACTIVE })
  status: DeviceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  revocationReason: string | null;

  /** userId of admin or literal 'system' for automated revocation */
  @Column({ type: 'varchar', length: 100, nullable: true })
  revokedBy: string | null;

  // ── Audit ─────────────────────────────────────────────────────────────────

  @Column({ type: 'inet', nullable: true })
  registrationIp: string | null;

  /** Monotonic counter — useful for anomaly detection (sudden spike in tx) */
  @Column({ type: 'bigint', default: 0 })
  signatureCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  // ── Timestamps ────────────────────────────────────────────────────────────

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ── Computed ──────────────────────────────────────────────────────────────

  get isAuthorized(): boolean {
    return this.whitelisted && this.status === DeviceStatus.ACTIVE;
  }
}
