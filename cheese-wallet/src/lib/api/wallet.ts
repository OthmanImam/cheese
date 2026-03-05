// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Wallet, Transactions, Banks, Rates, Card
// ─────────────────────────────────────────────────────────

import apiClient from './client'
import { ENDPOINTS } from '@/constants'
import type {
  AccountResolvePayload,
  AccountResolveResponse,
  ApiResponse,
  BankTransferPayload,
  BankTransferResponse,
  DepositNetwork,
  ExchangeRate,
  NigerianBank,
  Transaction,
  TransactionListResponse,
  VirtualCard,
  WalletAddress,
  WalletBalance,
} from '@/types'

// ── Wallet ────────────────────────────────────────────────
export async function getBalance(): Promise<WalletBalance> {
  const { data } = await apiClient.get<ApiResponse<WalletBalance>>(ENDPOINTS.WALLET.BALANCE)
  return data.data
}

export async function getWalletAddress(): Promise<WalletAddress> {
  const { data } = await apiClient.get<ApiResponse<WalletAddress>>(ENDPOINTS.WALLET.ADDRESS)
  return data.data
}

export async function getDepositNetworks(): Promise<DepositNetwork[]> {
  const { data } = await apiClient.get<ApiResponse<DepositNetwork[]>>(
    ENDPOINTS.WALLET.DEPOSIT_NETWORKS,
  )
  return data.data
}

// ── Transactions ──────────────────────────────────────────
export async function getTransactions(page = 1, pageSize = 20): Promise<TransactionListResponse> {
  const { data } = await apiClient.get<ApiResponse<TransactionListResponse>>(
    ENDPOINTS.TRANSACTIONS.LIST,
    { params: { page, pageSize } },
  )
  return data.data
}

export async function getTransaction(id: string): Promise<Transaction> {
  const { data } = await apiClient.get<ApiResponse<Transaction>>(
    ENDPOINTS.TRANSACTIONS.BY_ID(id),
  )
  return data.data
}

// ── Send USDC ─────────────────────────────────────────────
export async function resolveUsername(username: string): Promise<{ address: string; username: string }> {
  const { data } = await apiClient.get<ApiResponse<{ address: string; username: string }>>(
    ENDPOINTS.SEND.RESOLVE_USERNAME(username),
  )
  return data.data
}

export async function sendToUsername(payload: {
  username: string
  amountUsdc: string
  pin: string
  deviceSignature: string
  deviceId: string
}): Promise<Transaction> {
  const { data } = await apiClient.post<ApiResponse<Transaction>>(
    ENDPOINTS.SEND.TO_USERNAME,
    payload,
  )
  return data.data
}

export async function sendToAddress(payload: {
  address: string
  amountUsdc: string
  network: string
  pin: string
  deviceSignature: string
  deviceId: string
}): Promise<Transaction> {
  const { data } = await apiClient.post<ApiResponse<Transaction>>(
    ENDPOINTS.SEND.TO_ADDRESS,
    payload,
  )
  return data.data
}

// ── Banks ─────────────────────────────────────────────────
export async function getBanks(): Promise<NigerianBank[]> {
  const { data } = await apiClient.get<ApiResponse<NigerianBank[]>>(ENDPOINTS.BANK.LIST)
  return data.data
}

export async function resolveAccount(
  payload: AccountResolvePayload,
): Promise<AccountResolveResponse> {
  const { data } = await apiClient.post<ApiResponse<AccountResolveResponse>>(
    ENDPOINTS.BANK.RESOLVE_ACCOUNT,
    payload,
  )
  return data.data
}

export async function bankTransfer(payload: BankTransferPayload): Promise<BankTransferResponse> {
  const { data } = await apiClient.post<ApiResponse<BankTransferResponse>>(
    ENDPOINTS.BANK.TRANSFER,
    payload,
  )
  return data.data
}

// ── Exchange Rate ─────────────────────────────────────────
export async function getExchangeRate(): Promise<ExchangeRate> {
  const { data } = await apiClient.get<ApiResponse<ExchangeRate>>(ENDPOINTS.RATES.CURRENT)
  return data.data
}

// ── Virtual Card ──────────────────────────────────────────
export async function getCard(): Promise<VirtualCard> {
  const { data } = await apiClient.get<ApiResponse<VirtualCard>>(ENDPOINTS.CARD.DETAILS)
  return data.data
}

export async function freezeCard(): Promise<VirtualCard> {
  const { data } = await apiClient.post<ApiResponse<VirtualCard>>(ENDPOINTS.CARD.FREEZE)
  return data.data
}

export async function unfreezeCard(): Promise<VirtualCard> {
  const { data } = await apiClient.post<ApiResponse<VirtualCard>>(ENDPOINTS.CARD.UNFREEZE)
  return data.data
}

export async function revealCvv(pin: string): Promise<{ cvv: string; expiresAt: string }> {
  const { data } = await apiClient.post<ApiResponse<{ cvv: string; expiresAt: string }>>(
    ENDPOINTS.CARD.CVV,
    { pin },
  )
  return data.data
}
