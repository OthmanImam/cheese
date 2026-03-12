// Minimal constants used by wallet hooks and other code

// ── API Base URL ──────────────────────────────────────────
// Matches the NestJS backend's /v1 prefix
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'

// ── Query Keys for React Query ────────────────────────────
export const QUERY_KEYS: any = {
  BALANCE: ['balance'],
  ADDRESS: ['address'],
  ME: ['me'],
  BANKS: ['banks'],
  RESOLVE_USERNAME: (u = '') => ['resolve_username', u],
  RESOLVE_ACCOUNT: (a = '', b = '') => ['resolve_account', a, b],
  TRANSACTIONS: (p: number = 1) => ['transactions', p],
  EARN_BALANCE: ['earn_balance'],
  REFERRAL: ['referral'],
  CARD: ['card'],
  DEPOSIT_NETWORKS: ['deposit_networks'],
  EXCHANGE_RATE: ['exchange_rate'],
  NOTIFICATIONS: ['notifications'],
  PAYLINK_MY: ['paylink_my'],
  PAYLINK_TOKEN: (t: string) => ['paylink_token', t],
};

// ── Stale Times ───────────────────────────────────────────
export const STALE_TIMES: any = {
  BALANCE: 0,
  BANKS: 0,
  TRANSACTIONS: 0,
  EARN: 0,
  EXCHANGE_RATE: 0,
  CARD: 0,
};

// ── API Endpoints ────────────────────────────────────────
export const ENDPOINTS: any = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    VERIFY_OTP: '/auth/verify-otp',
    RESEND_OTP: '/auth/resend-otp',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_PIN: '/auth/verify-pin',
    CHANGE_PIN: '/auth/change-pin',
    LOGOUT: '/auth/logout',
  },
  DEVICE: {
    REGISTER: '/devices/register',
  },
  WALLET: {
    BALANCE: '/wallet/balance',
    ADDRESS: '/wallet/address',
    DEPOSIT_NETWORKS: '/wallet/deposit-networks',
  },
  TRANSACTIONS: {
    LIST: '/transactions',
    BY_ID: (id: string) => `/transactions/${id}`,
  },
  SEND: {
    RESOLVE_USERNAME: (username: string) => `/send/resolve/${username}`,
    TO_USERNAME: '/send/to-username',
    TO_ADDRESS: '/send/to-address',
  },
  BANK: {
    LIST: '/banks',
    RESOLVE: '/banks/resolve',
    TRANSFER: '/banks/transfer',
  },
  CARD: {
    LIST: '/cards',
    CREATE: '/cards/create',
    DETAILS: (id: string) => `/cards/${id}`,
  },
  EARN: {
    BALANCE: '/earn/balance',
  },
  REFERRAL: {
    INFO: '/referral/info',
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: '/notifications/mark-read',
  },
  PAYLINK: {
    CREATE: '/paylink/create',
    RESOLVE: (token: string) => `/paylink/${token}`,
    PAY: (token: string) => `/paylink/${token}/pay`,
    MY: '/paylink/my',
    CANCEL: (token: string) => `/paylink/${token}/cancel`,
  },
  WAITLIST: {
    REGISTER: '/waitlist/register',
    LEADERBOARD: '/waitlist/leaderboard',
    CHECK_USERNAME: (username: string) => `/waitlist/check-username/${username}`,
    SHARE: '/waitlist/share',
    REFERRAL: '/waitlist/referral',
  },
};
