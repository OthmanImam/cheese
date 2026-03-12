// Minimal constants used by wallet hooks and other code
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

export const STALE_TIMES: any = {
  BALANCE: 0,
  BANKS: 0,
  TRANSACTIONS: 0,
  EARN: 0,
  EXCHANGE_RATE: 0,
  CARD: 0,
};

export const ENDPOINTS: any = {
  AUTH: {
    LOGIN: '',
    SIGNUP: '',
    VERIFY_OTP: '',
    RESEND_OTP: '',
    ME: '',
    FORGOT_PASSWORD: '',
    RESET_PASSWORD: '',
    VERIFY_PIN: '',
    CHANGE_PIN: '',
    LOGOUT: '',
  },
  DEVICE: {
    REGISTER: '',
  },
};
