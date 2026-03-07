// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Auth Store (Zustand)
// Owns: user session, device key, auth flow state
// ─────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthScreen, DeviceKey, User } from '@/types'

interface AuthState {
  // ── Data ────────────────────────────────────────────────
  user:           User | null
  deviceKey:      DeviceKey | null
  isAuthenticated: boolean
  isInitialised:  boolean   // splash complete

  // ── Signup flow temp data ─────────────────────────────
  pendingEmail:   string | null   // email waiting for OTP verify
  pendingSignup:  Partial<{
    fullName: string
    email: string
    phone: string
    username: string
    password: string
  }> | null

  // ── Active auth screen ────────────────────────────────
  authScreen: AuthScreen

  // ── Actions ──────────────────────────────────────────
  setUser:            (user: User) => void
  clearUser:          () => void
  setDeviceKey:       (key: DeviceKey) => void
  setAuthenticated:   (v: boolean) => void
  setInitialised:     () => void
  setAuthScreen:      (screen: AuthScreen) => void
  setPendingEmail:    (email: string | null) => void
  setPendingSignup:   (data: AuthState['pendingSignup']) => void
  logout:             () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ── Initial state ──────────────────────────────────
      user:             null,
      deviceKey:        null,
      isAuthenticated:  false,
      isInitialised:    false,
      pendingEmail:     null,
      pendingSignup:    null,
      authScreen:       'splash',

      // ── Actions ────────────────────────────────────────
      setUser:          (user)   => set({ user, isAuthenticated: true }),
      clearUser:        ()       => set({ user: null, isAuthenticated: false }),
      setDeviceKey:     (key)    => set({ deviceKey: key }),
      setAuthenticated: (v)      => set({ isAuthenticated: v }),
      setInitialised:   ()       => set({ isInitialised: true }),
      setAuthScreen:    (screen) => set({ authScreen: screen }),
      setPendingEmail:  (email)  => set({ pendingEmail: email }),
      setPendingSignup: (data)   => set({ pendingSignup: data }),

      logout: () => set({
        user:            null,
        isAuthenticated: false,
        pendingEmail:    null,
        pendingSignup:   null,
        authScreen:      'login',
      }),
    }),
    {
      name:    'cheese-auth',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist device key and user across reloads.
      // Access token lives in memory only (tokenStore in api/client.ts).
      partialize: (state) => ({
        deviceKey:  state.deviceKey,
        user:       state.user,
      }),
    } as Parameters<typeof persist>[1],
  ),
)

// ── Auth expiry event → logout ──────────────────────────
// Fired by api/client.ts when a token refresh fails.
// Runs once at module load; safe because the store is a singleton.
if (typeof window !== 'undefined') {
  window.addEventListener('cheese:auth:expired', () => {
    useAuthStore.getState().logout()
  })
}
