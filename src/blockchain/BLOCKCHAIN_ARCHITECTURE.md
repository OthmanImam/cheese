# Cheese Wallet — Blockchain Module

Standalone NestJS module that owns all smart contract interactions for the Cheese Wallet platform.

## What this module does

- Creates an on-chain wallet for every user (called once during OTP verification in the auth flow)
- Registers the user's username on-chain so peer transfers work via @username without any off-chain lookup
- Debits USDC/USDT from a user wallet to the platform treasury (called by the accounting module during payment processing)
- Credits USDC/USDT from the platform treasury back to a wallet (called during reversals)
- Executes peer-to-peer transfers by username entirely on-chain
- Tracks every contract call in the blockchain_transactions table — full audit trail
- Retries failed wallet creations automatically via a scheduler

## Architecture

### Two entities

blockchain_wallets       — one row per user, holds wallet address and status
blockchain_transactions  — one row per contract call, holds tx hash, status, amounts, gas

### Three services

BlockchainService        — raw ethers.js wrapper, no Postgres writes, no business logic
WalletService            — orchestrates contract calls + Postgres writes, owns lifecycle
BlockchainTransactionService — query layer for blockchain_transactions

### The contract-first rule

For any state-changing operation (debit, credit, transfer):
  1. Write a SUBMITTED blockchain_transaction row
  2. Call the smart contract
  3. On success → update to CONFIRMED
  4. On failure → update to FAILED, re-throw

The contract call always happens before any Postgres state change.
If the contract succeeds but Postgres writes fail, the txHash in blockchain_transactions
is the proof of what happened on-chain and can be used for reconciliation.

## Integration with other modules

This module is designed to be imported by AuthModule and AccountingModule:

    // In AuthModule / AccountingModule
    import { BlockchainModule } from '../blockchain/blockchain.module';

    @Module({
      imports: [BlockchainModule],
    })

Then inject WalletService directly:

    constructor(private readonly walletService: WalletService) {}

    // During OTP verification:
    const wallet = await this.walletService.createWallet(userId, username, platformAddress);

    // During payment processing:
    const result = await this.walletService.debit(userId, amountUsdt, appReference);

## Running migrations

    npm run migration:run

Requires migrations 001 (AuthSchema) to have run first — blockchain_wallets references users(id).

## Environment variables

See .env.example for all required variables.
The three critical blockchain variables are:
  BLOCKCHAIN_RPC_URL         — your Alchemy/Infura/QuickNode endpoint
  PLATFORM_WALLET_PRIVATE_KEY — the custodial wallet private key (use a secrets manager)
  WALLET_CONTRACT_ADDRESS     — the deployed contract address
