// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Type Definitions
// ─────────────────────────────────────────────────────────

// ── API Response Wrapper ──────────────────────────────────
export interface ApiResponse<T> {
  statusCode: number
  message: string
  data: T
}

export interface ApiError {
  statusCode: number
  message: string
  error?: string
}

export type Theme = 'light' | 'dark' | 'auto'

export type TxStatus = 'pending' | 'confirmed' | 'failed'

// ── Auth Types ────────────────────────────────────────────
export interface User {
  id: string
  email: string
  fullName: string
  phone: string
  username: string
  profileImage?: string
  createdAt: string
  emailVerified: boolean
  phoneVerified: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface DeviceKey {
  id: string
  publicKey: string
  createdAt: string
}

export type AuthScreen = 'splash' | 'login' | 'signup-1' | 'signup-2' | 'signup-3' | 'signup-otp' | 'device' | 'forgot-email' | 'forgot-otp' | 'pw-success' | 'new-password'

export type AppScreen = 'home' | 'send' | 'cards' | 'cardscreen' | 'history' | 'profile' | 'notifications' | 'txdetail' | 'kyc' | 'security' | 'profile-edit' | 'earn' | 'support' | 'applock'

export interface LoginPayload {
  identifier: string
  password: string
  deviceId?: string
  deviceSignature?: string
}

export interface SignupPayload {
  fullName: string
  email: string
  phone: string
  username: string
  password: string
  deviceId: string
  devicePublicKey: string
  referralCode?: string
}

export interface OtpVerifyPayload {
  email: string
  otp: string
  type: 'email_verify' | 'password_reset' | 'login_2fa'
}

export interface ResetPasswordPayload {
  email: string
  newPassword: string
  otp: string
}

// ── Wallet Types ──────────────────────────────────────────
export interface WalletBalance {
  totalUSDC: string
  totalUSD: string
  lastSync: string
}

export interface WalletAddress {
  address: string
  chain: string
  network: string
}

export interface DepositNetwork {
  id: string
  name: string
  symbol: string
  decimals: number
  minAmount: string
  maxAmount: string
  fee: string
  estimatedTime: string
}

// ── Transaction Types ─────────────────────────────────────
export interface Transaction {
  id: string
  type: 'deposit' | 'withdrawal' | 'send_username' | 'send_address' | 'bank_transfer' | 'yield_credit' | 'referral_bonus' | 'card_payment' | 'fee' | 'pay_request'
  status: 'pending' | 'completed' | 'failed' | 'reversed'
  amountUsdc: string
  amountNgn: string | null
  feeUsdc: string
  rateApplied: string | null
  recipientUsername: string | null
  recipientAddress: string | null
  recipientName: string | null
  bankName: string | null
  accountNumber: string | null
  txHash: string | null
  network: string | null
  reference: string
  description: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
}

export interface TransactionListResponse {
  transactions: Transaction[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ── Bank Types ────────────────────────────────────────────
export interface NigerianBank {
  id: string
  code: string
  name: string
  slug: string
}

export interface AccountResolvePayload {
  bankCode: string
  accountNumber: string
}

export interface AccountResolveResponse {
  accountName: string
  accountNumber: string
  bankCode: string
}

export interface BankTransferPayload {
  bankCode: string
  accountNumber: string
  accountName: string
  amountNgn: string
  amountUsdc: string
  pin: string
  deviceSignature: string
  deviceId: string
}

export interface BankTransferResponse {
  id: string
  status: 'pending' | 'completed' | 'failed'
  amount: string
  amountUSD: string
  bankCode: string
  accountNumber: string
  accountName: string
  timestamp: string
  reference: string
}

// ── Card Types ────────────────────────────────────────────
export interface VirtualCard {
  id: string
  cardNumber: string
  expiryDate: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  holderName: string
  status: 'active' | 'inactive' | 'frozen'
  balance: string
  currency: string
  last4: string
  createdAt: string
  limits: {
    daily: string
    monthly: string
    perTransaction: string
  }
}

// ── Rates Types ───────────────────────────────────────────
export interface ExchangeRate {
  id: string
  usdToNgn: string
  effectiveRate: string
  spreadPercent: string
  source: string
  fetchedAt: string
}

// ── Earn / Yield Types ────────────────────────────────────
export interface EarnBalance {
  balance: number
  earnedMonth: number
  earnedTotal: number
  apy: number
  protocol: string
  compounding: string
}

// ── Referral Types ────────────────────────────────────────
export interface ReferralInfo {
  code: string
  link: string
  totalReferrals: number
  pendingReward: number
  paidReward: number
}

// ── PayLink Types ─────────────────────────────────────────
export interface CreatePayLinkPayload {
  amount: string
  amountUSD: string
  description?: string
  expiresIn?: number // seconds
  metadata?: Record<string, unknown>
}

export interface CreatePayLinkResponse {
  token: string
  link: string
  amount: string
  expiresAt: string
}

export interface PayLinkData {
  token: string
  amount: string
  amountUSD: string
  description?: string
  creatorUsername: string
  expiresAt: string
  status: 'active' | 'expired' | 'completed'
  paidAt?: string
}

export interface PayLinkPayPayload {
  pin: string
  deviceSignature: string
  deviceId: string
}

export interface PayLinkPayResponse {
  id: string
  status: 'completed'
  amount: string
  timestamp: string
  reference: string
}

export interface MyLinksResponse {
  links: Array<CreatePayLinkResponse & { status: string; paidAt?: string }>
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
