import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { ethers, Contract, JsonRpcProvider, Wallet, TransactionReceipt } from 'ethers';
import { ContractCallException } from '../exceptions/blockchain.exceptions';

// Placeholder types (ethers not installed)
type JsonRpcProvider = any;
type Wallet = any;
type Contract = any;
type TransactionReceipt = any;

// Helper functions to replace ethers
const ethersHelper = {
  getAddress: (addr: string) => addr,
  parseUnits: (amount: string, decimals: number) => BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals))),
  formatUnits: (raw: bigint | string, decimals: number) => (BigInt(raw) / BigInt(Math.pow(10, decimals))).toString(),
};

export interface WalletCreationResult {
  /** EIP-55 checksummed wallet address emitted by the WalletCreated event */
  walletAddress: string;
  /** Tx hash of the createWallet call */
  txHash: string;
  /** Block number where the tx was mined */
  blockNumber: number;
  /** Gas used by the transaction */
  gasUsed: string;
}

export interface ContractOperationResult {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  /** Balance of the primary wallet AFTER the operation (human-readable, 8 dp) */
  balanceAfter: string;
}

/**
 * BlockchainService
 *
 * Thin wrapper around ethers.js v6 and the Cheese Wallet smart contract.
 * Responsibilities:
 *   - Manage provider + signer lifecycle
 *   - Convert human-readable amounts ↔ on-chain units
 *   - Submit transactions and wait for receipts
 *   - Parse events from receipts
 *   - Return raw results to callers (WalletService, TransactionService)
 *
 * This service has NO business logic — it does not write to Postgres,
 * does not create DTOs, and does not throw application-level exceptions
 * other than ContractCallException. All orchestration lives in WalletService.
 *
 * ── Assumed contract interface ────────────────────────────────────────────
 *
 *   createWallet(address user, string calldata username)
 *     external returns (address walletAddress)
 *     emits WalletCreated(address indexed user, address indexed wallet, string username)
 *
 *   debit(address wallet, uint256 amount, string calldata ref)
 *     external returns (bool)
 *     emits Debited(address indexed wallet, uint256 amount, string ref)
 *
 *   credit(address wallet, uint256 amount, string calldata ref)
 *     external returns (bool)
 *     emits Credited(address indexed wallet, uint256 amount, string ref)
 *
 *   transferByUsername(string calldata fromUsername, string calldata toUsername,
 *                      uint256 amount, string calldata ref)
 *     external returns (bool)
 *     emits Transferred(address indexed from, address indexed to, uint256 amount, string ref)
 *
 *   getBalance(address wallet) external view returns (uint256)
 *
 *   getWalletByUsername(string calldata username) external view returns (address)
 *
 * ── Amount handling ───────────────────────────────────────────────────────
 *
 *   All public methods accept amounts as human-readable strings ("31.25").
 *   Internally they are scaled to on-chain units using the configured
 *   TOKEN_DECIMALS (default 6 for USDC/USDT).
 *   All returned balance strings are normalised to 8 decimal places.
 */
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);

  private provider:  JsonRpcProvider;
  private signer:    Wallet;
  private contract:  Contract;

  private tokenDecimals: number;

  private readonly CONTRACT_ABI = [
    // ── State-changing ────────────────────────────────────────────────────
    'function createWallet(address user, string calldata username) external returns (address walletAddress)',
    'function debit(address wallet, uint256 amount, string calldata ref) external returns (bool)',
    'function credit(address wallet, uint256 amount, string calldata ref) external returns (bool)',
    'function transferByUsername(string calldata fromUsername, string calldata toUsername, uint256 amount, string calldata ref) external returns (bool)',
    // ── View ─────────────────────────────────────────────────────────────
    'function getBalance(address wallet) external view returns (uint256)',
    'function getWalletByUsername(string calldata username) external view returns (address)',
    'function tokenDecimals() external view returns (uint8)',
    // ── Events ───────────────────────────────────────────────────────────
    'event WalletCreated(address indexed user, address indexed wallet, string username)',
    'event Debited(address indexed wallet, uint256 amount, string ref)',
    'event Credited(address indexed wallet, uint256 amount, string ref)',
    'event Transferred(address indexed fromWallet, address indexed toWallet, uint256 amount, string ref)',
  ];

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    // TODO: Implement ethers initialization when ethers package is installed
    this.logger.warn('BlockchainService: onModuleInit stubbed (ethers not installed)');
    /*
    const rpcUrl          = this.config.getOrThrow<string>('BLOCKCHAIN_RPC_URL');
    const privateKey      = this.config.getOrThrow<string>('PLATFORM_WALLET_PRIVATE_KEY');
    const contractAddress = this.config.getOrThrow<string>('WALLET_CONTRACT_ADDRESS');

    this.provider = new JsonRpcProvider(rpcUrl);
    this.signer   = new Wallet(privateKey, this.provider);
    this.contract = new Contract(contractAddress, this.CONTRACT_ABI, this.signer);

    // Read token decimals from the contract itself — no hardcoding
    this.tokenDecimals = Number(await this.contract.tokenDecimals());

    const network = await this.provider.getNetwork();
    this.logger.log(
      `Blockchain ready [chain=${network.name}] [chainId=${network.chainId}]` +
      ` [contract=${contractAddress}] [signer=${this.signer.address}]` +
      ` [tokenDecimals=${this.tokenDecimals}]`,
    );
    */
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Wallet creation
  // ─────────────────────────────────────────────────────────────────────────

  async createWallet(evmAddress: string, username: string): Promise<WalletCreationResult> {
    this.logger.log(`createWallet [username=${username}] [evmAddress=${evmAddress}]`);
    try {
      const tx      = await this.contract.createWallet(evmAddress, username.toLowerCase());
      const receipt = await tx.wait(1) as TransactionReceipt;

      const walletAddress = this.parseEventArg(receipt, 'WalletCreated', 'wallet');

      this.logger.log(
        `createWallet confirmed [username=${username}]` +
        ` [wallet=${walletAddress}] [txHash=${receipt.hash}] [block=${receipt.blockNumber}]`,
      );

      return {
        walletAddress: ethersHelper.getAddress(walletAddress),
        txHash:        receipt.hash,
        blockNumber:   receipt.blockNumber,
        gasUsed:       receipt.gasUsed.toString(),
      };
    } catch (err) {
      throw this.wrapError('createWallet', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Balance (view — no gas)
  // ─────────────────────────────────────────────────────────────────────────

  async getBalance(walletAddress: string): Promise<string> {
    try {
      const raw: bigint = await this.contract.getBalance(walletAddress);
      return this.toHuman(raw);
    } catch (err) {
      throw this.wrapError('getBalance', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Debit
  // ─────────────────────────────────────────────────────────────────────────

  async debit(
    walletAddress: string,
    amount: string,
    appReference: string,
  ): Promise<ContractOperationResult> {
    const units = this.toUnits(amount);
    this.logger.log(`debit [wallet=${walletAddress}] [amount=${amount}] [ref=${appReference}]`);
    try {
      const tx      = await this.contract.debit(walletAddress, units, appReference);
      const receipt = await tx.wait(1) as TransactionReceipt;
      const balanceAfter = await this.getBalance(walletAddress);

      this.logger.log(
        `debit confirmed [txHash=${receipt.hash}] [balanceAfter=${balanceAfter}]`,
      );

      return {
        txHash:       receipt.hash,
        blockNumber:  receipt.blockNumber,
        gasUsed:      receipt.gasUsed.toString(),
        balanceAfter,
      };
    } catch (err) {
      throw this.wrapError('debit', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Credit
  // ─────────────────────────────────────────────────────────────────────────

  async credit(
    walletAddress: string,
    amount: string,
    appReference: string,
  ): Promise<ContractOperationResult> {
    const units = this.toUnits(amount);
    this.logger.log(`credit [wallet=${walletAddress}] [amount=${amount}] [ref=${appReference}]`);
    try {
      const tx      = await this.contract.credit(walletAddress, units, appReference);
      const receipt = await tx.wait(1) as TransactionReceipt;
      const balanceAfter = await this.getBalance(walletAddress);

      this.logger.log(
        `credit confirmed [txHash=${receipt.hash}] [balanceAfter=${balanceAfter}]`,
      );

      return {
        txHash:       receipt.hash,
        blockNumber:  receipt.blockNumber,
        gasUsed:      receipt.gasUsed.toString(),
        balanceAfter,
      };
    } catch (err) {
      throw this.wrapError('credit', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Transfer by username
  // ─────────────────────────────────────────────────────────────────────────

  async transferByUsername(
    fromUsername: string,
    toUsername: string,
    amount: string,
    appReference: string,
  ): Promise<ContractOperationResult> {
    const units = this.toUnits(amount);
    this.logger.log(
      `transferByUsername [@${fromUsername} → @${toUsername}]` +
      ` [amount=${amount}] [ref=${appReference}]`,
    );
    try {
      const tx      = await this.contract.transferByUsername(
        fromUsername.toLowerCase(),
        toUsername.toLowerCase(),
        units,
        appReference,
      );
      const receipt = await tx.wait(1) as TransactionReceipt;

      // Resolve sender's wallet to read post-transfer balance
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

  // ─────────────────────────────────────────────────────────────────────────
  // Username resolution (view)
  // ─────────────────────────────────────────────────────────────────────────

  async resolveUsername(username: string): Promise<string | null> {
    try {
      const address: string = await this.contract.getWalletByUsername(username.toLowerCase());
      const zero = '0x0000000000000000000000000000000000000000';
      return address === zero ? null : ethersHelper.getAddress(address);
    } catch (err) {
      throw this.wrapError('getWalletByUsername', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  getSignerAddress(): string {
    return this.signer.address;
  }

  getContractAddress(): string {
    return this.contract.target as string;
  }

  getTokenDecimals(): number {
    return this.tokenDecimals;
  }

  async getChainId(): Promise<number> {
    const network = await this.provider.getNetwork();
    return Number(network.chainId);
  }

  /** Convert human-readable amount string to on-chain bigint units */
  toUnits(amount: string): bigint {
    return ethersHelper.parseUnits(amount, this.tokenDecimals);
  }

  /** Convert on-chain bigint units to human-readable string (8 dp) */
  toHuman(raw: bigint): string {
    const formatted = ethersHelper.formatUnits(raw, this.tokenDecimals);
    return parseFloat(formatted).toFixed(8);
  }

  /** Parse a named argument from the first matching event in a receipt */
  private parseEventArg(
    receipt: TransactionReceipt,
    eventName: string,
    argName: string,
  ): string {
    const iface      = this.contract.interface;
    const eventTopic = iface.getEvent(eventName)!.topicHash;
    const log        = receipt.logs.find((l) => l.topics[0] === eventTopic);

    if (!log) {
      throw new ContractCallException(eventName, `${eventName} event not found in receipt`);
    }

    const parsed = iface.parseLog(log)!;
    return parsed.args[argName] as string;
  }

  /** Wrap any ethers/contract error into a ContractCallException */
  private wrapError(operation: string, err: unknown): ContractCallException {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(`Contract call failed [operation=${operation}]: ${message}`);
    return new ContractCallException(operation, message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stellar/Wallet methods (stubs for compilation)
  // ─────────────────────────────────────────────────────────────────────────

  async createStellarWallet(): Promise<{ secretKeyEnc: string; publicKey: string }> {
    // TODO: Implement Stellar wallet creation
    this.logger.warn('createStellarWallet not yet implemented');
    return { secretKeyEnc: '', publicKey: '' };
  }

  async ensureTrustline(secretKeyEnc: string): Promise<void> {
    // TODO: Implement Stellar trustline establishment
    this.logger.warn('ensureTrustline not yet implemented');
  }

  verifyDeviceSignature(opts: any): boolean {
    // TODO: Implement device signature verification
    this.logger.warn('verifyDeviceSignature not yet implemented');
    return true;
  }

  async getStellarBalance(publicKey: string): Promise<{ usdc: string }> {
    // TODO: Implement Stellar balance lookup
    this.logger.warn(`getStellarBalance not yet implemented for ${publicKey}`);
    return { usdc: '0.00' };
  }

  async getUsdcBalance(publicKey: string): Promise<{ usdc: string }> {
    // Alias for getStellarBalance
    return this.getStellarBalance(publicKey);
  }

  async sendUsdc(opts: {
    fromSecretEnc: string;
    toAddress: string;
    amountUsdc: string;
    memo?: string;
  }): Promise<string> {
    // TODO: Implement Stellar USDC transfer
    this.logger.warn('sendUsdc not yet implemented');
    return '0x' + '0'.repeat(64); // mock tx hash
  }

  encryptSecret(secret: string): string {
    // TODO: Implement proper encryption
    return Buffer.from(secret).toString('base64');
  }

  decryptSecret(encryptedSecret: string): string {
    // TODO: Implement proper decryption
    return Buffer.from(encryptedSecret, 'base64').toString('utf-8');
  }

  async getContractBalance(username: string): Promise<string> {
    // TODO: Implement contract balance lookup
    this.logger.warn(`getContractBalance not yet implemented for ${username}`);
    return '0.00';
  }

  async getEvmBalance(evmAddress: string | null): Promise<string> {
    // TODO: Implement EVM balance lookup
    this.logger.warn(`getEvmBalance not yet implemented for ${evmAddress}`);
    return '0.00';
  }

  async registerUser(username: string, evmAddress: string): Promise<string> {
    // TODO: Implement user registration
    this.logger.warn(`registerUser not yet implemented for ${username}`);
    return '0x' + '0'.repeat(64); // mock tx hash
  }

  async contractDeposit(username: string, amountUsdc: string): Promise<void> {
    // TODO: Implement contract deposit
    this.logger.warn(`contractDeposit not yet implemented for ${username}`);
  }

  async contractDepositByAddress(stellarAddress: string, amountUsdc: string): Promise<void> {
    // TODO: Implement contract deposit by address
    this.logger.warn(`contractDepositByAddress not yet implemented for ${stellarAddress}`);
  }

  async contractWithdraw(username: string, amountUsdc: string, toAddress: string): Promise<void> {
    // TODO: Implement contract withdrawal
    this.logger.warn(`contractWithdraw not yet implemented for ${username}`);
  }
}
