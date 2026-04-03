import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as StellarSdk from '@stellar/stellar-sdk';
import * as crypto from 'crypto';
import { ContractCallException } from '../exceptions/blockchain.exceptions';

// ─────────────────────────────────────────────────────────────────────────────
// Return types
// ─────────────────────────────────────────────────────────────────────────────

export interface EvmWalletCreationResult {
  /** Contract-managed wallet address emitted by WalletCreated event */
  walletAddress: string;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
}

export interface StellarWalletCreationResult {
  /** Stellar public key (G...) */
  publicKey: string;
  /** AES-256-GCM encrypted secret key — stored in DB, never exposed */
  secretKeyEnc: string;
}

export interface ContractOperationResult {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  /** Human-readable balance after operation (8 dp) */
  balanceAfter: string;
}

export interface StellarTransferResult {
  /** Stellar transaction hash */
  txHash: string;
  /** Sender balance after transfer */
  balanceAfter: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// USDC issuers
// ─────────────────────────────────────────────────────────────────────────────

const STELLAR_USDC_ISSUERS = {
  mainnet: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', // Circle
  testnet: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', // Circle testnet
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * BlockchainService
 *
 * Manages ALL on-chain interactions for Cheese Pay.
 * Two chains are supported simultaneously:
 *
 *   ── EVM (Celo / any EVM chain) ──────────────────────────────────────────
 *   Uses ethers.js v6 + the Cheese Wallet smart contract.
 *   On user registration: calls createWallet(evmAddress, username) on the
 *   contract. The contract manages per-user custodial wallets on-chain.
 *   Debit / Credit / TransferByUsername all go through the same contract.
 *
 *   ── Stellar ─────────────────────────────────────────────────────────────
 *   Uses @stellar/stellar-sdk v14.
 *   On user registration: generates a fresh Keypair, funds the account
 *   (XLM from the platform reserve account), then establishes a USDC
 *   trustline. The secret key is AES-256-GCM encrypted before storing.
 *   USDC transfers go directly on the Stellar network via PathPayment
 *   or regular Payment operations.
 *
 * This service has NO business logic — it does not write to Postgres,
 * does not validate DTOs, and does not throw application-level exceptions
 * other than ContractCallException. All orchestration lives in WalletService.
 */
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);

  // ── EVM ────────────────────────────────────────────────────────────────
  private evmProvider:  ethers.JsonRpcProvider;
  private evmSigner:    ethers.Wallet;
  private evmContract:  ethers.Contract;
  private tokenDecimals: number;

  // ── Stellar ────────────────────────────────────────────────────────────
  private stellarServer:   StellarSdk.Horizon.Server;
  private stellarNetwork:  string;        // passphrase
  private stellarPlatformKeypair: StellarSdk.Keypair;
  private stellarUsdcIssuer: string;

  // ── Encryption ─────────────────────────────────────────────────────────
  private encryptionKey: Buffer; // 32 bytes for AES-256

  // ── Contract ABI ───────────────────────────────────────────────────────
  private readonly CONTRACT_ABI = [
    'function createWallet(address user, string calldata username) external returns (address walletAddress)',
    'function debit(address wallet, uint256 amount, string calldata ref) external returns (bool)',
    'function credit(address wallet, uint256 amount, string calldata ref) external returns (bool)',
    'function transferByUsername(string calldata fromUsername, string calldata toUsername, uint256 amount, string calldata ref) external returns (bool)',
    'function getBalance(address wallet) external view returns (uint256)',
    'function getWalletByUsername(string calldata username) external view returns (address)',
    'function tokenDecimals() external view returns (uint8)',
    'event WalletCreated(address indexed user, address indexed wallet, string username)',
    'event Debited(address indexed wallet, uint256 amount, string ref)',
    'event Credited(address indexed wallet, uint256 amount, string ref)',
    'event Transferred(address indexed fromWallet, address indexed toWallet, uint256 amount, string ref)',
  ];

  constructor(private readonly config: ConfigService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Initialisation
  // ─────────────────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    await this.initEvm();
    await this.initStellar();
    this.initEncryption();
  }

  private async initEvm(): Promise<void> {
    const rpcUrl          = this.config.getOrThrow<string>('BLOCKCHAIN_RPC_URL');
    const privateKey      = this.config.getOrThrow<string>('PLATFORM_WALLET_PRIVATE_KEY');
    const contractAddress = this.config.getOrThrow<string>('WALLET_CONTRACT_ADDRESS');

    this.evmProvider = new ethers.JsonRpcProvider(rpcUrl);
    this.evmSigner   = new ethers.Wallet(privateKey, this.evmProvider);
    this.evmContract = new ethers.Contract(contractAddress, this.CONTRACT_ABI, this.evmSigner);

    // Read decimals from the contract — no hardcoding
    this.tokenDecimals = Number(await this.evmContract.tokenDecimals());

    const network = await this.evmProvider.getNetwork();
    this.logger.log(
      `EVM ready [chain=${network.name}] [chainId=${network.chainId}]` +
      ` [contract=${contractAddress}] [signer=${this.evmSigner.address}]` +
      ` [tokenDecimals=${this.tokenDecimals}]`,
    );
  }

  private async initStellar(): Promise<void> {
    const horizonUrl   = this.config.getOrThrow<string>('STELLAR_HORIZON_URL');
    const secretKey    = this.config.getOrThrow<string>('STELLAR_PLATFORM_SECRET_KEY');
    const isMainnet    = this.config.get<string>('NODE_ENV') === 'production';

    this.stellarServer  = new StellarSdk.Horizon.Server(horizonUrl);
    this.stellarNetwork = isMainnet
      ? StellarSdk.Networks.PUBLIC
      : StellarSdk.Networks.TESTNET;

    this.stellarPlatformKeypair = StellarSdk.Keypair.fromSecret(secretKey);
    this.stellarUsdcIssuer      = isMainnet
      ? STELLAR_USDC_ISSUERS.mainnet
      : STELLAR_USDC_ISSUERS.testnet;

    // Verify the platform account exists and is funded
    const account = await this.stellarServer.loadAccount(
      this.stellarPlatformKeypair.publicKey(),
    );
    const xlmBalance = account.balances.find((b) => b.asset_type === 'native');
    this.logger.log(
      `Stellar ready [network=${isMainnet ? 'mainnet' : 'testnet'}]` +
      ` [platform=${this.stellarPlatformKeypair.publicKey()}]` +
      ` [xlm=${xlmBalance?.balance ?? '?'}]`,
    );
  }

  private initEncryption(): void {
    const keyHex = this.config.getOrThrow<string>('SECRET_ENCRYPTION_KEY');
    if (keyHex.length !== 64) {
      throw new Error('SECRET_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVM — Wallet creation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calls createWallet on the smart contract.
   * The contract creates a managed sub-wallet for the user and emits WalletCreated.
   */
  async createEvmWallet(evmAddress: string, username: string): Promise<EvmWalletCreationResult> {
    this.logger.log(`createEvmWallet [username=${username}] [evmAddress=${evmAddress}]`);
    try {
      const tx      = await this.evmContract.createWallet(evmAddress, username.toLowerCase());
      const receipt = await tx.wait(1) as ethers.TransactionReceipt;

      const walletAddress = this.parseEventArg(receipt, 'WalletCreated', 'wallet');

      this.logger.log(
        `createEvmWallet confirmed [username=${username}]` +
        ` [wallet=${walletAddress}] [txHash=${receipt.hash}]`,
      );

      return {
        walletAddress: ethers.getAddress(walletAddress),
        txHash:        receipt.hash,
        blockNumber:   receipt.blockNumber,
        gasUsed:       receipt.gasUsed.toString(),
      };
    } catch (err) {
      throw this.wrapError('createEvmWallet', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVM — Balance
  // ─────────────────────────────────────────────────────────────────────────

  async getEvmBalance(walletAddress: string): Promise<string> {
    try {
      const raw: bigint = await this.evmContract.getBalance(walletAddress);
      return this.toHuman(raw);
    } catch (err) {
      throw this.wrapError('getEvmBalance', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVM — Debit / Credit / Transfer
  // ─────────────────────────────────────────────────────────────────────────

  async evmDebit(
    walletAddress: string,
    amount: string,
    appReference: string,
  ): Promise<ContractOperationResult> {
    const units = this.toUnits(amount);
    this.logger.log(`evmDebit [wallet=${walletAddress}] [amount=${amount}] [ref=${appReference}]`);
    try {
      const tx      = await this.evmContract.debit(walletAddress, units, appReference);
      const receipt = await tx.wait(1) as ethers.TransactionReceipt;
      const balanceAfter = await this.getEvmBalance(walletAddress);

      this.logger.log(`evmDebit confirmed [txHash=${receipt.hash}] [balanceAfter=${balanceAfter}]`);

      return {
        txHash:      receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed:     receipt.gasUsed.toString(),
        balanceAfter,
      };
    } catch (err) {
      throw this.wrapError('evmDebit', err);
    }
  }

  async evmCredit(
    walletAddress: string,
    amount: string,
    appReference: string,
  ): Promise<ContractOperationResult> {
    const units = this.toUnits(amount);
    this.logger.log(`evmCredit [wallet=${walletAddress}] [amount=${amount}] [ref=${appReference}]`);
    try {
      const tx      = await this.evmContract.credit(walletAddress, units, appReference);
      const receipt = await tx.wait(1) as ethers.TransactionReceipt;
      const balanceAfter = await this.getEvmBalance(walletAddress);

      this.logger.log(`evmCredit confirmed [txHash=${receipt.hash}] [balanceAfter=${balanceAfter}]`);

      return {
        txHash:      receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed:     receipt.gasUsed.toString(),
        balanceAfter,
      };
    } catch (err) {
      throw this.wrapError('evmCredit', err);
    }
  }

  async evmTransferByUsername(
    fromUsername: string,
    toUsername: string,
    amount: string,
    appReference: string,
  ): Promise<ContractOperationResult> {
    const units = this.toUnits(amount);
    this.logger.log(
      `evmTransferByUsername [@${fromUsername} → @${toUsername}]` +
      ` [amount=${amount}] [ref=${appReference}]`,
    );
    try {
      const tx = await this.evmContract.transferByUsername(
        fromUsername.toLowerCase(),
        toUsername.toLowerCase(),
        units,
        appReference,
      );
      const receipt = await tx.wait(1) as ethers.TransactionReceipt;

      const senderWallet = await this.resolveEvmUsername(fromUsername);
      const balanceAfter = senderWallet
        ? await this.getEvmBalance(senderWallet)
        : '0.00000000';

      this.logger.log(
        `evmTransferByUsername confirmed [txHash=${receipt.hash}]` +
        ` [@${fromUsername} balanceAfter=${balanceAfter}]`,
      );

      return {
        txHash:      receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed:     receipt.gasUsed.toString(),
        balanceAfter,
      };
    } catch (err) {
      throw this.wrapError('evmTransferByUsername', err);
    }
  }

  async resolveEvmUsername(username: string): Promise<string | null> {
    try {
      const address: string = await this.evmContract.getWalletByUsername(username.toLowerCase());
      const zero = '0x0000000000000000000000000000000000000000';
      return address === zero ? null : ethers.getAddress(address);
    } catch (err) {
      throw this.wrapError('resolveEvmUsername', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stellar — Wallet creation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Creates a custodial Stellar wallet for a new user.
   *
   * Steps:
   *   1. Generate a fresh Keypair
   *   2. Fund the new account with the minimum XLM reserve from the
   *      platform account (1 XLM base + 0.5 XLM per trustline entry)
   *   3. Establish the USDC trustline so the account can hold USDC
   *   4. Encrypt the secret key and return it for DB storage
   *
   * The caller (WalletService) stores secretKeyEnc in the users table.
   * The raw secret key NEVER leaves this method.
   */
  async createStellarWallet(): Promise<StellarWalletCreationResult> {
    const keypair = StellarSdk.Keypair.random();
    const publicKey = keypair.publicKey();

    this.logger.log(`createStellarWallet [publicKey=${publicKey}]`);

    try {
      // Step 1: Fund the new account (platform sends starting XLM)
      await this.fundStellarAccount(publicKey);

      // Step 2: Establish USDC trustline using the new account's keypair
      await this.ensureTrustline(keypair);

      // Step 3: Encrypt the secret key for DB storage
      const secretKeyEnc = this.encryptSecret(keypair.secret());

      this.logger.log(`createStellarWallet complete [publicKey=${publicKey}]`);

      return { publicKey, secretKeyEnc };
    } catch (err) {
      throw this.wrapError('createStellarWallet', err);
    }
  }

  /**
   * Funds a new Stellar account with enough XLM for:
   *   - Base reserve: 1 XLM
   *   - One trustline entry: 0.5 XLM
   *   - Transaction fees buffer: 0.1 XLM
   *   Total: 1.6 XLM sent from the platform account
   */
  private async fundStellarAccount(newPublicKey: string): Promise<void> {
    this.logger.log(`fundStellarAccount [target=${newPublicKey}]`);

    const platformAccount = await this.stellarServer.loadAccount(
      this.stellarPlatformKeypair.publicKey(),
    );

    const tx = new StellarSdk.TransactionBuilder(platformAccount, {
      fee:          StellarSdk.BASE_FEE,
      networkPassphrase: this.stellarNetwork,
    })
      .addOperation(
        StellarSdk.Operation.createAccount({
          destination:     newPublicKey,
          startingBalance: '1.6', // XLM
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(this.stellarPlatformKeypair);

    const result = await this.stellarServer.submitTransaction(tx);
    this.logger.log(`fundStellarAccount submitted [hash=${result.hash}]`);
  }

  /**
   * Establishes a USDC trustline on the given Stellar account.
   * Must be called AFTER the account has been funded with XLM.
   * The account's own keypair signs this transaction.
   */
  async ensureTrustline(keypairOrEnc: StellarSdk.Keypair | string): Promise<void> {
    // Accept either a raw Keypair (during creation) or an encrypted secret string
    const keypair = typeof keypairOrEnc === 'string'
      ? StellarSdk.Keypair.fromSecret(this.decryptSecret(keypairOrEnc))
      : keypairOrEnc;

    const publicKey = keypair.publicKey();
    this.logger.log(`ensureTrustline [publicKey=${publicKey}]`);

    const account = await this.stellarServer.loadAccount(publicKey);

    // Check if trustline already exists
    const hasUsdcTrustline = account.balances.some(
      (b) =>
        b.asset_type === 'credit_alphanum4' &&
        (b as StellarSdk.Horizon.HorizonApi.BalanceLine<'credit_alphanum4'>).asset_code === 'USDC' &&
        (b as StellarSdk.Horizon.HorizonApi.BalanceLine<'credit_alphanum4'>).asset_issuer === this.stellarUsdcIssuer,
    );

    if (hasUsdcTrustline) {
      this.logger.debug(`ensureTrustline: USDC trustline already exists [publicKey=${publicKey}]`);
      return;
    }

    const usdcAsset = new StellarSdk.Asset('USDC', this.stellarUsdcIssuer);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee:          StellarSdk.BASE_FEE,
      networkPassphrase: this.stellarNetwork,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: usdcAsset,
          // No limit = maximum allowed by the protocol
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(keypair);

    const result = await this.stellarServer.submitTransaction(tx);
    this.logger.log(`ensureTrustline submitted [hash=${result.hash}] [publicKey=${publicKey}]`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stellar — Balance
  // ─────────────────────────────────────────────────────────────────────────

  async getStellarUsdcBalance(publicKey: string): Promise<string> {
    try {
      const account = await this.stellarServer.loadAccount(publicKey);
      const usdcBalance = account.balances.find(
        (b) =>
          b.asset_type === 'credit_alphanum4' &&
          (b as StellarSdk.Horizon.HorizonApi.BalanceLine<'credit_alphanum4'>).asset_code === 'USDC' &&
          (b as StellarSdk.Horizon.HorizonApi.BalanceLine<'credit_alphanum4'>).asset_issuer === this.stellarUsdcIssuer,
      ) as StellarSdk.Horizon.HorizonApi.BalanceLine<'credit_alphanum4'> | undefined;

      return usdcBalance?.balance ?? '0.0000000';
    } catch (err) {
      throw this.wrapError('getStellarUsdcBalance', err);
    }
  }

  async getStellarXlmBalance(publicKey: string): Promise<string> {
    try {
      const account = await this.stellarServer.loadAccount(publicKey);
      const xlm = account.balances.find((b) => b.asset_type === 'native');
      return xlm?.balance ?? '0.0000000';
    } catch (err) {
      throw this.wrapError('getStellarXlmBalance', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stellar — USDC transfer
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sends USDC from one Stellar account to another.
   *
   * @param fromSecretEnc  AES-256-GCM encrypted secret key of the sender
   * @param toPublicKey    Recipient's Stellar public key (G...)
   * @param amountUsdc     Human-readable USDC amount e.g. "25.00"
   * @param memo           Optional text memo (max 28 bytes)
   */
  async sendStellarUsdc(opts: {
    fromSecretEnc: string;
    toPublicKey: string;
    amountUsdc: string;
    memo?: string;
  }): Promise<StellarTransferResult> {
    const { fromSecretEnc, toPublicKey, amountUsdc, memo } = opts;

    const senderKeypair = StellarSdk.Keypair.fromSecret(this.decryptSecret(fromSecretEnc));
    const senderPublicKey = senderKeypair.publicKey();

    this.logger.log(
      `sendStellarUsdc [from=${senderPublicKey}] [to=${toPublicKey}] [amount=${amountUsdc}]`,
    );

    try {
      const senderAccount = await this.stellarServer.loadAccount(senderPublicKey);
      const usdcAsset     = new StellarSdk.Asset('USDC', this.stellarUsdcIssuer);

      const txBuilder = new StellarSdk.TransactionBuilder(senderAccount, {
        fee:               StellarSdk.BASE_FEE,
        networkPassphrase: this.stellarNetwork,
      }).addOperation(
        StellarSdk.Operation.payment({
          destination: toPublicKey,
          asset:       usdcAsset,
          amount:      amountUsdc,
        }),
      );

      if (memo) {
        txBuilder.addMemo(StellarSdk.Memo.text(memo.slice(0, 28)));
      }

      const tx = txBuilder.setTimeout(30).build();
      tx.sign(senderKeypair);

      const result = await this.stellarServer.submitTransaction(tx);
      const balanceAfter = await this.getStellarUsdcBalance(senderPublicKey);

      this.logger.log(
        `sendStellarUsdc confirmed [hash=${result.hash}]` +
        ` [from=${senderPublicKey}] [balanceAfter=${balanceAfter}]`,
      );

      return { txHash: result.hash, balanceAfter };
    } catch (err) {
      // Stellar wraps errors in a response envelope — unwrap for useful messages
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as any).response?.data
      ) {
        const ops = (err as any).response.data?.extras?.result_codes?.operations;
        const msg = ops ? `Stellar op error: ${ops.join(', ')}` : String(err);
        throw new ContractCallException('sendStellarUsdc', msg);
      }
      throw this.wrapError('sendStellarUsdc', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stellar — Platform-level operations (custodial deposit / withdraw)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Platform deposits USDC into a user's Stellar wallet.
   * Called when a user on-ramps fiat → USDC.
   */
  async platformDepositUsdc(toPublicKey: string, amountUsdc: string): Promise<string> {
    this.logger.log(`platformDepositUsdc [to=${toPublicKey}] [amount=${amountUsdc}]`);
    const result = await this.sendStellarUsdc({
      fromSecretEnc: this.encryptSecret(this.stellarPlatformKeypair.secret()),
      toPublicKey,
      amountUsdc,
      memo: 'Cheese deposit',
    });
    return result.txHash;
  }

  /**
   * Withdraws USDC from a user's Stellar wallet back to the platform.
   * Called when a user off-ramps USDC → fiat.
   */
  async platformWithdrawUsdc(
    fromSecretEnc: string,
    amountUsdc: string,
    reference: string,
  ): Promise<string> {
    const keypair = StellarSdk.Keypair.fromSecret(this.decryptSecret(fromSecretEnc));
    this.logger.log(`platformWithdrawUsdc [from=${keypair.publicKey()}] [amount=${amountUsdc}]`);

    const result = await this.sendStellarUsdc({
      fromSecretEnc,
      toPublicKey: this.stellarPlatformKeypair.publicKey(),
      amountUsdc,
      memo: reference.slice(0, 28),
    });
    return result.txHash;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Encryption — AES-256-GCM
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Encrypts a Stellar secret key using AES-256-GCM.
   * Output format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
   */
  encryptSecret(secret: string): string {
    const iv         = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher     = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted  = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const authTag    = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts a Stellar secret key encrypted by encryptSecret.
   */
  decryptSecret(encryptedSecret: string): string {
    const [ivHex, authTagHex, ciphertextHex] = encryptedSecret.split(':');
    if (!ivHex || !authTagHex || !ciphertextHex) {
      throw new Error('Invalid encrypted secret format');
    }
    const iv         = Buffer.from(ivHex, 'hex');
    const authTag    = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher   = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final('utf8');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVM helpers
  // ─────────────────────────────────────────────────────────────────────────

  getEvmSignerAddress(): string  { return this.evmSigner.address; }
  getEvmContractAddress(): string { return this.evmContract.target as string; }
  getTokenDecimals(): number     { return this.tokenDecimals; }

  async getEvmChainId(): Promise<number> {
    const network = await this.evmProvider.getNetwork();
    return Number(network.chainId);
  }

  /** Convert human-readable amount string to on-chain bigint units */
  toUnits(amount: string): bigint {
    return ethers.parseUnits(amount, this.tokenDecimals);
  }

  /** Convert on-chain bigint units to human-readable string (8 dp) */
  toHuman(raw: bigint): string {
    return parseFloat(ethers.formatUnits(raw, this.tokenDecimals)).toFixed(8);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stellar helpers
  // ─────────────────────────────────────────────────────────────────────────

  getStellarPlatformPublicKey(): string {
    return this.stellarPlatformKeypair.publicKey();
  }

  getStellarUsdcIssuer(): string {
    return this.stellarUsdcIssuer;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private parseEventArg(
    receipt: ethers.TransactionReceipt,
    eventName: string,
    argName: string,
  ): string {
    const iface      = this.evmContract.interface;
    const eventTopic = iface.getEvent(eventName)!.topicHash;
    const log        = receipt.logs.find((l) => l.topics[0] === eventTopic);

    if (!log) {
      throw new ContractCallException(eventName, `${eventName} event not found in receipt`);
    }

    const parsed = iface.parseLog({ topics: [...log.topics], data: log.data })!;
    return parsed.args[argName] as string;
  }

  private wrapError(operation: string, err: unknown): ContractCallException {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(`Blockchain call failed [operation=${operation}]: ${message}`);
    return new ContractCallException(operation, message);
  }
}
