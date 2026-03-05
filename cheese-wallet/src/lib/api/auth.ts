// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Auth API Service
// All functions return the unwrapped data payload.
// ─────────────────────────────────────────────────────────

import apiClient, { tokenStore } from './client'
import { ENDPOINTS } from '@/constants'
import type {
  ApiResponse,
  AuthTokens,
  DeviceKey,
  LoginPayload,
  OtpVerifyPayload,
  ResetPasswordPayload,
  SignupPayload,
  User,
} from '@/types'

// ── Login ──────────────────────────────────────────────────
export async function login(payload: LoginPayload): Promise<{ user: User; tokens: AuthTokens }> {
  const { data } = await apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
    ENDPOINTS.AUTH.LOGIN,
    payload,
  )
  tokenStore.set(data.data.tokens.accessToken)
  return data.data
}

// ── Signup ────────────────────────────────────────────────
export async function signup(payload: SignupPayload): Promise<{ userId: string; email: string }> {
  const { data } = await apiClient.post<ApiResponse<{ userId: string; email: string }>>(
    ENDPOINTS.AUTH.SIGNUP,
    payload,
  )
  return data.data
}

// ── OTP verify (signup or password reset) ─────────────────
export async function verifyOtp(payload: OtpVerifyPayload): Promise<{ verified: boolean }> {
  const { data } = await apiClient.post<ApiResponse<{ verified: boolean }>>(
    ENDPOINTS.AUTH.VERIFY_OTP,
    payload,
  )
  return data.data
}

// ── Resend OTP ────────────────────────────────────────────
export async function resendOtp(email: string, type: OtpVerifyPayload['type']): Promise<void> {
  await apiClient.post(ENDPOINTS.AUTH.RESEND_OTP, { email, type })
}

// ── Device registration ───────────────────────────────────
export async function registerDevice(
  payload: Omit<DeviceKey, 'registeredAt'>,
): Promise<DeviceKey> {
  const { data } = await apiClient.post<ApiResponse<DeviceKey>>(
    ENDPOINTS.DEVICE.REGISTER,
    payload,
  )
  return data.data
}

// ── Get current user ──────────────────────────────────────
export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<ApiResponse<User>>(ENDPOINTS.AUTH.ME)
  return data.data
}

// ── Forgot password — send reset code ────────────────────
export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email })
}

// ── Reset password ────────────────────────────────────────
export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, payload)
}

// ── Logout ────────────────────────────────────────────────
export async function logout(): Promise<void> {
  await apiClient.post(ENDPOINTS.AUTH.LOGOUT)
  tokenStore.clear()
}
