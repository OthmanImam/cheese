import { Injectable, Logger } from '@nestjs/common';
import { createVerify, createHash, KeyObject, createPublicKey } from 'crypto';
import { KeyAlgorithm } from '../entities/device.entity';
import {
  InvalidSignatureException,
  InvalidPublicKeyException,
} from '../../common/exceptions/device.exceptions';

export interface VerifySignatureParams {
  /** Canonical JSON string that was signed by the client */
  canonicalPayload: string;
  /** Base64-encoded raw signature bytes */
  signature: string;
  /** Base64-encoded SPKI DER public key blob stored in DB */
  publicKeySpkiB64: string;
  /** Algorithm to use for verification */
  algorithm: KeyAlgorithm;
}

@Injectable()
export class SignatureVerifierService {
  private readonly logger = new Logger(SignatureVerifierService.name);

  /**
   * Verify a device signature against a stored public key.
   *
   * Both supported algorithms operate on sha256(canonicalPayload):
   *
   *   ed25519:
   *     Node's 'ed25519' verify algo internally hashes with SHA-512 (EdDSA spec)
   *     but for our scheme we pre-hash with SHA-256 so the client only needs
   *     to hash once before calling the hardware sign primitive.
   *     We pass the digest directly so the verify call does NOT double-hash.
   *
   *   secp256k1:
   *     Standard ECDSA: sign(sha256(payload)). Node uses 'SHA256' digest mode
   *     in createVerify — the internal hash matches what the client computed.
   *
   * Throws InvalidSignatureException (not a boolean return) so callers cannot
   * accidentally ignore a failed verification.
   */
  verify(params: VerifySignatureParams): void {
    const { canonicalPayload, signature, publicKeySpkiB64, algorithm } = params;

    // ── Import public key ─────────────────────────────────────────────────
    let pubKey: KeyObject;
    try {
      pubKey = createPublicKey({
        key:    Buffer.from(publicKeySpkiB64, 'base64'),
        format: 'der',
        type:   'spki',
      });
    } catch (err) {
      this.logger.error('Failed to import public key from DB', err);
      throw new InvalidPublicKeyException('Stored key could not be imported');
    }

    // ── Compute payload digest ────────────────────────────────────────────
    const payloadDigest = createHash('sha256')
      .update(canonicalPayload, 'utf8')
      .digest();

    const sigBuffer = Buffer.from(signature, 'base64');

    // ── Verify based on algorithm ─────────────────────────────────────────
    let valid: boolean;

    try {
      if (algorithm === KeyAlgorithm.ED25519) {
        /**
         * Ed25519 in Node crypto:
         * createVerify('ed25519') expects the raw message, NOT a pre-hashed digest.
         * We pass the digest buffer as the message — this means we're signing
         * sha256(payload) rather than the raw payload. Both client and server must
         * agree on this convention (client signs digest, not raw payload).
         *
         * This is intentional: it allows hardware enclaves that only expose
         * sign(bytes) to work without needing to pass the full payload through
         * the hardware boundary.
         */
        const verifier = createVerify('ed25519');
        verifier.update(payloadDigest);
        valid = verifier.verify(pubKey, sigBuffer);
      } else if (algorithm === KeyAlgorithm.SECP256K1) {
        /**
         * secp256k1 ECDSA:
         * createVerify('SHA256') computes sha256 internally, so we pass the
         * raw canonical payload string — the library hashes it before verifying.
         */
        const verifier = createVerify('SHA256');
        verifier.update(canonicalPayload, 'utf8');
        valid = verifier.verify(
          { key: pubKey, dsaEncoding: 'der' },
          sigBuffer,
        );
      } else {
        this.logger.error(`Unsupported key algorithm: ${algorithm}`);
        throw new InvalidSignatureException();
      }
    } catch (err) {
      if (err instanceof InvalidSignatureException) throw err;
      // Node crypto throws on malformed signature bytes — treat as invalid
      this.logger.warn('Signature verification threw (malformed bytes)', err);
      throw new InvalidSignatureException();
    }

    if (!valid) {
      this.logger.warn('Signature invalid — verification returned false');
      throw new InvalidSignatureException();
    }
  }

  /**
   * Build the canonical payload string that must match exactly what the client signed.
   * Keys must be in alphabetical order — deviations will cause verification to fail.
   */
  buildCanonicalPayload(fields: {
    action: string;
    amount: number;
    currency: string;
    destination: string;
    nonce: string;
    timestamp: number;
    userId: string;
  }): string {
    // Explicit alphabetical ordering — never use Object spread (insertion order is fragile)
    return JSON.stringify({
      action:      fields.action,
      amount:      fields.amount,
      currency:    fields.currency,
      destination: fields.destination,
      nonce:       fields.nonce,
      timestamp:   fields.timestamp,
      userId:      fields.userId,
    });
  }

  /**
   * Compute the SHA-256 fingerprint of a public key for logging and deduplication.
   * Never log the raw key blob — use fingerprints in all audit records.
   */
  computeFingerprint(publicKeySpkiB64: string): string {
    return createHash('sha256')
      .update(publicKeySpkiB64, 'utf8')
      .digest('hex');
  }

  /**
   * Validate that a base64 SPKI blob can be imported by Node crypto.
   * Called during device registration — fail fast before the key is stored.
   */
  validatePublicKey(publicKeySpkiB64: string, algorithm: KeyAlgorithm): void {
    try {
      const key = createPublicKey({
        key:    Buffer.from(publicKeySpkiB64, 'base64'),
        format: 'der',
        type:   'spki',
      });

      // Verify the imported key's algorithm matches what was declared
      const expectedOid = algorithm === KeyAlgorithm.ED25519 ? 'ed25519' : 'ec';
      if (key.asymmetricKeyType !== expectedOid) {
        throw new InvalidPublicKeyException(
          `Expected ${expectedOid} key, got ${key.asymmetricKeyType}`,
        );
      }
    } catch (err) {
      if (err instanceof InvalidPublicKeyException) throw err;
      throw new InvalidPublicKeyException('Key failed SPKI import validation');
    }
  }
}
