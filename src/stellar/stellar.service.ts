// src/stellar/stellar.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

export interface StellarWallet {
  publicKey: string;
  secretKeyEnc: string; // AES-256-GCM encrypted
}

export interface UsdcBalance {
  usdc: string;
  nativeXlm: string;
}

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private server: StellarSdk.Horizon.Server;
  private network: string;
  private usdcIssuer: string;
  private encryptionKeyBuf: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.network = this.config.get<string>('stellar.network', 'testnet');
    this.usdcIssuer = this.config.get<string>('stellar.usdcIssuer', '');

    const horizonUrl = this.config.get<string>(
      'stellar.horizonUrl',
      'https://horizon-testnet.stellar.org',
    );
    this.server = new StellarSdk.Horizon.Server(horizonUrl);

    const keyHex = this.config.get<string>('stellar.encryptionKey', '');
    this.encryptionKeyBuf = Buffer.from(
      keyHex.padEnd(64, '0').slice(0, 64),
      'hex',
    );

    this.logger.log(`Stellar service initialised [${this.network}]`);
  }

  // ── Create a new custodial wallet ────────────────────────
  async createWallet(): Promise<StellarWallet> {
    const keypair = StellarSdk.Keypair.random();
    const publicKey = keypair.publicKey();
    const secretKeyEnc = this.encryptSecret(keypair.secret());

    // Fund on testnet via Friendbot
    if (this.network === 'testnet') {
      try {
        await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
        this.logger.log(`Funded testnet account: ${publicKey}`);
      } catch {
        this.logger.warn(`Friendbot funding failed for ${publicKey}`);
      }
    }

    return { publicKey, secretKeyEnc };
  }

  // ── Get USDC balance ─────────────────────────────────────
  async getUsdcBalance(publicKey: string): Promise<UsdcBalance> {
    try {
      const account = await this.server.loadAccount(publicKey);

      let usdc = '0.000000';
      let nativeXlm = '0.000000';

      for (const balance of account.balances) {
        if (balance.asset_type === 'native') {
          nativeXlm = balance.balance;
        }
        if (
          balance.asset_type === 'credit_alphanum4' &&
          balance.asset_code === 'USDC' &&
          balance.asset_issuer === this.usdcIssuer
        ) {
          usdc = balance.balance;
        }
      }

      return { usdc, nativeXlm };
    } catch (err) {
      this.logger.error(`Failed to load account ${publicKey}: ${err.message}`);
      return { usdc: '0.000000', nativeXlm: '0.000000' };
    }
  }

  // ── Get deposit address ───────────────────────────────────
  getDepositAddress(publicKey: string) {
    return {
      address: publicKey,
      network: this.network === 'testnet' ? 'Stellar Testnet' : 'Stellar',
      asset: 'USDC',
      memo: null,
      networks: [
        {
          id: 'stellar',
          name: 'Stellar Network',
          asset: 'USDC',
          confirmations: 1,
        },
      ],
    };
  }

  // ── Send USDC to another Stellar address ─────────────────
  async sendUsdc(params: {
    fromSecretEnc: string;
    toAddress: string;
    amountUsdc: string;
    memo?: string;
  }): Promise<string> {
    const secret = this.decryptSecret(params.fromSecretEnc);
    const keypair = StellarSdk.Keypair.fromSecret(secret);
    const account = await this.server.loadAccount(keypair.publicKey());

    const networkPassphrase =
      this.network === 'testnet'
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

    const usdcAsset = new StellarSdk.Asset('USDC', this.usdcIssuer);

    const txBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: params.toAddress,
          asset: usdcAsset,
          amount: params.amountUsdc,
        }),
      )
      .setTimeout(30);

    if (params.memo) {
      txBuilder.addMemo(StellarSdk.Memo.text(params.memo));
    }

    const tx = txBuilder.build();
    tx.sign(keypair);

    const result = await this.server.submitTransaction(tx);
    return result.hash;
  }

  // ── Establish USDC trustline ──────────────────────────────
  async ensureTrustline(secretEnc: string): Promise<void> {
    const secret = this.decryptSecret(secretEnc);
    const keypair = StellarSdk.Keypair.fromSecret(secret);
    const account = await this.server.loadAccount(keypair.publicKey());

    // Check if trustline exists
    const hasTrust = account.balances.some(
      (b: any) => b.asset_code === 'USDC' && b.asset_issuer === this.usdcIssuer,
    );
    if (hasTrust) return;

    const networkPassphrase =
      this.network === 'testnet'
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: new StellarSdk.Asset('USDC', this.usdcIssuer),
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    await this.server.submitTransaction(tx);
    this.logger.log(`USDC trustline established for ${keypair.publicKey()}`);
  }

  // ── Verify ECDSA device signature ────────────────────────
  // Client signs SHA256(timestamp) with their P-256 private key
  verifyDeviceSignature(params: {
    publicKey: string; // base64url P-256 public key
    signature: string; // base64 DER signature
    message: string; // signed message (timestamp string)
  }): boolean {
    try {
      const { createVerify } = require('crypto');
      const verifier = createVerify('SHA256');
      verifier.update(params.message);

      // Convert base64url public key to PEM
      const pubKeyPem = this.base64urlToPem(params.publicKey);
      return verifier.verify(pubKeyPem, params.signature, 'base64');
    } catch {
      return false;
    }
  }

  // ── Encryption helpers ───────────────────────────────────
  encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKeyBuf, iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decryptSecret(encryptedB64: string): string {
    const buf = Buffer.from(encryptedB64, 'base64');
    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKeyBuf, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  private base64urlToPem(base64url: string): string {
    // If already PEM, return as-is
    if (base64url.startsWith('-----BEGIN')) return base64url;

    // Convert base64url to standard base64
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const lines = base64.match(/.{1,64}/g)?.join('\n') || base64;
    return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
  }
}
