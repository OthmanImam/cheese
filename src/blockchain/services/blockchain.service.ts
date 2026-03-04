import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ethers,
  Contract,
  JsonRpcProvider,
  Wallet,
  TransactionReceipt,
} from 'ethers';
import { ContractCallException } from '../exceptions/blockchain.exceptions';

// ── Return types ──────────────────────────────────────────────────────────────

export interface WalletCreationResult {
  /** Deployed UserWallet contract address */
  walletAddress: string;
  /** On-chain tx hash of the createWallet call */
  txHash: string;
  /** Block number where the tx was mined */
  blockNumber: number;
  /** Gas used (stringified bigint) */
  gasUsed: string;
}

export interface TransferResult {
  txHash:      string;
  blockNumber: number;
  gasUsed:     string;
  /** Sender balance AFTER the transfer (human-readable, 8 dp) */
  balanceAfter: string;
}

/**
 * BlockchainService
 *
 * Thin ethers.js v6 adapter for the three Cheese Wallet smart contracts:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  UserWalletFactory  (WALLET_FACTORY_ADDRESS)                        │
 *   │    createWallet(userId, username)   → deploys UserWallet per user   │
 *   │    transferByUsername(from, to, amount) → P2P USDC send             │
 *   │    getWallet(userId)                → wallet address lookup         │
 *   │    getWalletByUsername(username)    → wallet address lookup         │
 *   ├─────────────────────────────────────────────────────────────────────┤
 *   │  CheeseVault  (CHEESE_VAULT_ADDRESS)                                │
 *   │    processPayment(userWallet, amount, paymentId) → bill payment     │
 *   │    refundPayment(userWallet, amount, refundFee, paymentId) → refund │
 *   │    feeAmount()  → current flat fee                                  │
 *   ├─────────────────────────────────────────────────────────────────────┤
 *   │  UserWallet  (per-user address, read-only from here)                │
 *   │    getBalance() → USDC balance of one wallet                        │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * ── Amount handling ──────────────────────────────────────────────────────────
 *
 *   All public methods accept amounts as human-readable strings ("31.25").
 *   Internally scaled to on-chain units using TOKEN_DECIMALS (default 6 for USDC).
 *   All returned balance strings are normalised to 8 decimal places.
 *
 * ── Responsibility boundary ──────────────────────────────────────────────────
 *
 *   This service has NO business logic. It does not write to Postgres, does not
 *   create DTOs, and throws only ContractCallException. All orchestration lives
 *   in WalletService.
 *
 * ── Environment variables ────────────────────────────────────────────────────
 *
 *   BLOCKCHAIN_RPC_URL          — JSON-RPC endpoint (Alchemy / Infura / QuickNode)
 *   PLATFORM_WALLET_PRIVATE_KEY — EOA that signs all transactions (backend signer)
 *   WALLET_FACTORY_ADDRESS      — Deployed UserWalletFactory address
 *   CHEESE_VAULT_ADDRESS        — Deployed CheeseVault address
 *   TOKEN_DECIMALS              — USDC decimals (default 6)
 */
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);

  private provider: JsonRpcProvider;
  private signer:   Wallet;

  private factory:  Contract; // UserWalletFactory
  private vault:    Contract; // CheeseVault

  private tokenDecimals: number;

  // ── ABIs ──────────────────────────────────────────────────────────────────

  private readonly FACTORY_ABI = [
    // State-changing
    'function createWallet(string calldata userId, string calldata username) external returns (address wallet)',
    'function transferByUsername(string calldata fromUsername, string calldata toUsername, uint256 amount) external',
    // View
    'function getWallet(string calldata userId) external view returns (address)',
    'function getWalletByUsername(string calldata username) external view returns (address)',
    'function hasWallet(string calldata userId) external view returns (bool)',
    'function isUsernameTaken(string calldata username) external view returns (bool)',
    'function totalWallets() external view returns (uint256)',
    // Events
    'event WalletCreated(bytes32 indexed userIdHash, bytes32 indexed usernameHash, address indexed wallet, string username, uint256 timestamp)',
    'event Transfer(address indexed fromWallet, address indexed toWallet, string fromUsername, string toUsername, uint256 amount, uint256 timestamp)',
  ];

  private readonly VAULT_ABI = [
    // Operator
    'function processPayment(address userWallet, uint256 paymentAmount, bytes32 paymentId) external',
    // Admin
    'function refundPayment(address userWallet, uint256 paymentAmount, bool refundFee, bytes32 paymentId) external',
    // View
    'function feeAmount() external view returns (uint256)',
    'function getAvailableWithdrawal() external view returns (uint256 payments, uint256 fees, uint256 total)',
    'function verifyVaultAccounting() external view returns (bool isValid)',
    // Events
    'event PaymentProcessed(address indexed userWallet, bytes32 indexed paymentId, uint256 paymentAmount, uint256 feeAmount, uint256 remainingBalance)',
    'event PaymentRefunded(address indexed userWallet, bytes32 indexed paymentId, uint256 refundAmount, uint256 newBalance)',
  ];

  /** Minimal ABI — instantiated per wallet address for balance reads */
  private readonly USER_WALLET_ABI = [
    'function getBalance() external view returns (uint256)',
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const rpcUrl         = this.config.getOrThrow<string>('BLOCKCHAIN_RPC_URL');
    const privateKey     = this.config.getOrThrow<string>('PLATFORM_WALLET_PRIVATE_KEY');
    const factoryAddress = this.config.getOrThrow<string>('WALLET_FACTORY_ADDRESS');
    const vaultAddress   = this.config.getOrThrow<string>('CHEESE_VAULT_ADDRESS');

    this.tokenDecimals = parseInt(
      this.config.get<string>('TOKEN_DECIMALS') ?? '6',
      10,
    );

    this.provider = new JsonRpcProvider(rpcUrl);
    this.signer   = new Wallet(privateKey, this.provider);

    this.factory = new Contract(factoryAddress, this.FACTORY_ABI, this.signer);
    this.vault   = new Contract(vaultAddress,   this.VAULT_ABI,   this.signer);

    const network = await this.provider.getNetwork();
    this.logger.log(
      `Blockchain ready` +
      ` [chain=${network.name}] [chainId=${network.chainId}]` +
      ` [signer=${this.signer.address}]` +
      ` [factory=${factoryAddress}]` +
      ` [vault=${vaultAddress}]` +
      ` [tokenDecimals=${this.tokenDecimals}]`,
    );
  }

  // ── Wallet creation ────────────────────────────────────────────────────────

  /**
   * Deploy a new UserWallet for a user via the factory.
   *
   * Maps to: UserWalletFactory.createWallet(userId, username)
   * Parses:  WalletCreated event → wallet address
   */
  async createWallet(userId: string, username: string): Promise<WalletCreationResult> {
    this.logger.log(`createWallet [userId=${userId}] [username=@${username}]`);
    try {
      const tx      = await this.factory.createWallet(userId, username.toLowerCase());
      const receipt = await tx.wait(1) as TransactionReceipt;

      const walletAddress = this.parseEventArg(
        receipt, this.factory, 'WalletCreated', 'wallet',
      );

      this.logger.log(
        `createWallet confirmed [username=@${username}]` +
        ` [wallet=${walletAddress}] [txHash=${receipt.hash}]`,
      );

      return {
        walletAddress: ethers.getAddress(walletAddress),
        txHash:        receipt.hash,
        blockNumber:   receipt.blockNumber,
        gasUsed:       receipt.gasUsed.toString(),
      };
    } catch (err) {
      throw this.wrapError('createWallet', err);
    }
  }

  // ── Balance ────────────────────────────────────────────────────────────────

  /**
   * Read USDC balance from a user's individual UserWallet contract.
   *
   * Maps to: UserWallet(walletAddress).getBalance()
   */
  async getBalance(walletAddress: string): Promise<string> {
    try {
      const walletContract = new Contract(
        walletAddress,
        this.USER_WALLET_ABI,
        this.provider, // read-only — no signer needed
      );
      const raw: bigint = await walletContract.getBalance();
      return this.toHuman(raw);
    } catch (err) {
      throw this.wrapError('getBalance', err);
    }
  }

  // ── Bill payment (debit) ───────────────────────────────────────────────────

  /**
   * Charge a user for a bill payment.
   * USDC flows: UserWallet → CheeseVault (payment + fee).
   *
   * Maps to: CheeseVault.processPayment(userWallet, paymentAmount, paymentId)
   * The vault internally calls UserWallet.transferToVault().
   *
   * @param walletAddress  User's deployed UserWallet contract address
   * @param amount         Human-readable payment amount EXCLUDING fee ("25.00")
   * @param appReference   Unique app-level reference string; hashed to bytes32 paymentId
   */
  async debit(
    walletAddress: string,
    amount:        string,
    appReference:  string,
  ): Promise<TransferResult> {
    const paymentAmount = this.toUnits(amount);
    const paymentId     = this.toPaymentId(appReference);

    this.logger.log(
      `debit (processPayment) [wallet=${walletAddress}]` +
      ` [amount=${amount}] [ref=${appReference}]`,
    );
    try {
      const tx      = await this.vault.processPayment(walletAddress, paymentAmount, paymentId);
      const receipt = await tx.wait(1) as TransactionReceipt;
      const balanceAfter = await this.getBalance(walletAddress);

      this.logger.log(
        `debit confirmed [txHash=${receipt.hash}]` +
        ` [balanceAfter=${balanceAfter}]`,
      );

      return {
        txHash:       receipt.hash,
        blockNumber:  receipt.blockNumber,
        gasUsed:      receipt.gasUsed.toString(),
        balanceAfter,
      };
    } catch (err) {
      throw this.wrapError('processPayment', err);
    }
  }

  // ── Refund (credit) ────────────────────────────────────────────────────────

  /**
   * Refund a failed bill payment back to a user's wallet.
   * USDC flows: CheeseVault → UserWallet.
   *
   * Maps to: CheeseVault.refundPayment(userWallet, paymentAmount, refundFee, paymentId)
   *
   * @param walletAddress  User's deployed UserWallet contract address
   * @param amount         Original payment amount EXCLUDING fee ("25.00")
   * @param appReference   Must match the original debit appReference
   * @param refundFee      Whether to also refund the flat fee (default true)
   */
  async credit(
    walletAddress: string,
    amount:        string,
    appReference:  string,
    refundFee = true,
  ): Promise<TransferResult> {
    const paymentAmount = this.toUnits(amount);
    const paymentId     = this.toPaymentId(appReference);

    this.logger.log(
      `credit (refundPayment) [wallet=${walletAddress}]` +
      ` [amount=${amount}] [refundFee=${refundFee}] [ref=${appReference}]`,
    );
    try {
      const tx      = await this.vault.refundPayment(walletAddress, paymentAmount, refundFee, paymentId);
      const receipt = await tx.wait(1) as TransactionReceipt;
      const balanceAfter = await this.getBalance(walletAddress);

      this.logger.log(
        `credit confirmed [txHash=${receipt.hash}]` +
        ` [balanceAfter=${balanceAfter}]`,
      );

      return {
        txHash:       receipt.hash,
        blockNumber:  receipt.blockNumber,
        gasUsed:      receipt.gasUsed.toString(),
        balanceAfter,
      };
    } catch (err) {
      throw this.wrapError('refundPayment', err);
    }
  }

  // ── P2P transfer by username ───────────────────────────────────────────────

  /**
   * Transfer USDC from one user to another identified by @username.
   * USDC flows: senderWallet → recipientWallet (no vault involved).
   *
   * Maps to: UserWalletFactory.transferByUsername(fromUsername, toUsername, amount)
   * The factory resolves usernames → wallet addresses and calls
   * UserWallet.transferToUser() atomically.
   *
   * @param fromUsername  Sender's @handle (case-insensitive)
   * @param toUsername    Recipient's @handle (case-insensitive)
   * @param amount        Human-readable USDC amount ("50.00")
   * @param appReference  App-level reference for DB logging (not sent on-chain)
   */
  async transferByUsername(
    fromUsername: string,
    toUsername:   string,
    amount:       string,
    appReference: string,
  ): Promise<TransferResult> {
    const units = this.toUnits(amount);
    this.logger.log(
      `transferByUsername [@${fromUsername} → @${toUsername}]` +
      ` [amount=${amount}] [ref=${appReference}]`,
    );
    try {
      const tx      = await this.factory.transferByUsername(
        fromUsername.toLowerCase(),
        toUsername.toLowerCase(),
        units,
      );
      const receipt = await tx.wait(1) as TransactionReceipt;

      // Resolve sender wallet address to read post-transfer balance
      const senderWallet = await this.resolveUsername(fromUsername);
      const balanceAfter = senderWallet
        ? await this.getBalance(senderWallet)
        : '0.00000000';

      this.logger.log(
        `transferByUsername confirmed [txHash=${receipt.hash}]` +
        ` [@${fromUsername} balanceAfter=${balanceAfter}]`,
      );

      return {
        txHash:       receipt.hash,
        blockNumber:  receipt.blockNumber,
        gasUsed:      receipt.gasUsed.toString(),
        balanceAfter,
      };
    } catch (err) {
      throw this.wrapError('transferByUsername', err);
    }
  }

  // ── Username resolution ────────────────────────────────────────────────────

  /**
   * Resolve a @username to the user's wallet address.
   *
   * Maps to: UserWalletFactory.getWalletByUsername(username)
   * Returns null if username is not registered.
   */
  async resolveUsername(username: string): Promise<string | null> {
    try {
      const address: string = await this.factory.getWalletByUsername(
        username.toLowerCase(),
      );
      const zero = '0x0000000000000000000000000000000000000000';
      return address === zero ? null : ethers.getAddress(address);
    } catch (err) {
      throw this.wrapError('getWalletByUsername', err);
    }
  }

  /**
   * Look up a wallet address by internal userId.
   *
   * Maps to: UserWalletFactory.getWallet(userId)
   * Returns null if no wallet exists for this userId.
   */
  async getWalletAddress(userId: string): Promise<string | null> {
    try {
      const address: string = await this.factory.getWallet(userId);
      const zero = '0x0000000000000000000000000000000000000000';
      return address === zero ? null : ethers.getAddress(address);
    } catch (err) {
      throw this.wrapError('getWallet', err);
    }
  }

  /**
   * Check whether a @username is already taken (case-insensitive).
   *
   * Maps to: UserWalletFactory.isUsernameTaken(username)
   */
  async isUsernameTaken(username: string): Promise<boolean> {
    try {
      return await this.factory.isUsernameTaken(username.toLowerCase());
    } catch (err) {
      throw this.wrapError('isUsernameTaken', err);
    }
  }

  // ── Vault utilities ────────────────────────────────────────────────────────

  /**
   * Read the current flat fee applied to every bill payment.
   *
   * Maps to: CheeseVault.feeAmount()
   * Returns fee as a human-readable string ("1.00").
   */
  async getFeeAmount(): Promise<string> {
    try {
      const raw: bigint = await this.vault.feeAmount();
      return this.toHuman(raw);
    } catch (err) {
      throw this.wrapError('feeAmount', err);
    }
  }

  /**
   * Read how much USDC the treasurer can withdraw from the vault.
   *
   * Maps to: CheeseVault.getAvailableWithdrawal()
   */
  async getVaultWithdrawable(): Promise<{
    payments: string;
    fees:     string;
    total:    string;
  }> {
    try {
      const result = await this.vault.getAvailableWithdrawal();
      return {
        payments: this.toHuman(result.payments),
        fees:     this.toHuman(result.fees),
        total:    this.toHuman(result.total),
      };
    } catch (err) {
      throw this.wrapError('getAvailableWithdrawal', err);
    }
  }

  // ── Accessors (used by WalletService / Scheduler) ─────────────────────────

  getSignerAddress():   string { return this.signer.address; }
  getFactoryAddress():  string { return this.factory.target as string; }
  getVaultAddress():    string { return this.vault.target as string; }
  getTokenDecimals():   number { return this.tokenDecimals; }

  async getChainId(): Promise<number> {
    const network = await this.provider.getNetwork();
    return Number(network.chainId);
  }

  // ── Unit conversion helpers ────────────────────────────────────────────────

  /** Human-readable string → on-chain bigint ("25.50" → 25_500_000n for 6 dp) */
  toUnits(amount: string): bigint {
    return ethers.parseUnits(amount, this.tokenDecimals);
  }

  /** On-chain bigint → human-readable string (25_500_000n → "25.50000000") */
  toHuman(raw: bigint): string {
    return parseFloat(ethers.formatUnits(raw, this.tokenDecimals)).toFixed(8);
  }

  /**
   * Convert an app-level reference string to a bytes32 paymentId.
   * Uses keccak256 so the same reference always produces the same ID.
   * This is the on-chain deduplication key inside CheeseVault.
   */
  toPaymentId(appReference: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(appReference));
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Parse a named argument from the first matching event log in a receipt.
   * Requires the contract interface to include the event ABI.
   */
  private parseEventArg(
    receipt:   TransactionReceipt,
    contract:  Contract,
    eventName: string,
    argName:   string,
  ): string {
    const iface      = contract.interface;
    const eventTopic = iface.getEvent(eventName)!.topicHash;
    const log        = receipt.logs.find((l) => l.topics[0] === eventTopic);

    if (!log) {
      throw new ContractCallException(
        eventName,
        `${eventName} event not found in receipt [txHash=${receipt.hash}]`,
      );
    }

    const parsed = iface.parseLog(log)!;
    return parsed.args[argName] as string;
  }

  /** Wrap any ethers/contract error into a typed ContractCallException */
  private wrapError(operation: string, err: unknown): ContractCallException {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(`Contract call failed [op=${operation}]: ${message}`);
    return new ContractCallException(operation, message);
  }
}
