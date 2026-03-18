// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Auth Hooks (React Query)
// ─────────────────────────────────────────────────────────

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as authApi      from '@/lib/api/auth'
import { QUERY_KEYS }    from '@/constants'
import { useAuthStore }  from '@/lib/stores/authStore'
import type {
  LoginPayload,
  OtpVerifyPayload,
  ResetPasswordPayload,
  SignupPayload,
} from '@/types'

// ── Get current user ──────────────────────────────────────
export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  QUERY_KEYS.ME,
    queryFn:   authApi.getMe,
    enabled:   isAuthenticated,
    staleTime: 5 * 60_000,
  })
}

// ── Login ─────────────────────────────────────────────────
export function useLogin() {
  const { setUser, setAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: ({ user }) => {
      setUser(user)
      setAuthenticated(true)
      queryClient.setQueryData(QUERY_KEYS.ME, user)
    },
  })
}

// ── Signup ────────────────────────────────────────────────
export function useSignup() {
  const { setPendingEmail } = useAuthStore()
  return useMutation({
    mutationFn: (payload: SignupPayload) => authApi.signup(payload),
    onSuccess: ({ email }) => setPendingEmail(email),
  })
}

// ── OTP verify ────────────────────────────────────────────
export function useVerifyOtp() {
  return useMutation({
    mutationFn: (payload: OtpVerifyPayload) => authApi.verifyOtp(payload),
  })
}

// ── Resend OTP ────────────────────────────────────────────
export function useResendOtp() {
  return useMutation({
    mutationFn: ({ email, type }: { email: string; type: OtpVerifyPayload['type'] }) =>
      authApi.resendOtp(email, type),
  })
}

// ── Register device ───────────────────────────────────────
export function useRegisterDevice() {
  const { setDeviceKey } = useAuthStore()
  return useMutation({
    mutationFn: authApi.registerDevice,
    onSuccess:  (deviceKey) => setDeviceKey(deviceKey),
  })
}

// ── Forgot password ───────────────────────────────────────
export function useForgotPassword() {
  const { setPendingEmail } = useAuthStore()
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess:  (_, email) => setPendingEmail(email),
  })
}

// ── Reset password ────────────────────────────────────────
export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => authApi.resetPassword(payload),
  })
}

// ── Logout ────────────────────────────────────────────────
export function useLogout() {
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      logout()
      queryClient.clear()
    },
  })
}

// ── Verify PIN ────────────────────────────────────────────
// Accepts { pinHash, deviceId } — use hashPin() from deviceSigning to build these.
export function useVerifyPin() {
  return useMutation({
    mutationFn: authApi.verifyPin,
  })
}

// ── Change PIN ────────────────────────────────────────────
export function useChangePin() {
  return useMutation({
    mutationFn: authApi.changePin,
  })
}
