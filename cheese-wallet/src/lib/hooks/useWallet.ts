// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Wallet & Transaction Hooks (React Query)
// ─────────────────────────────────────────────────────────

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as walletApi from '@/lib/api/wallet'
import { QUERY_KEYS, STALE_TIMES } from '@/constants'
import { useAuthStore } from '@/lib/stores/authStore'
import { useWalletStore } from '@/lib/stores/walletStore'

// ── Balance ───────────────────────────────────────────────
export function useBalance() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  QUERY_KEYS.BALANCE,
    queryFn:   walletApi.getBalance,
    enabled:   isAuthenticated,
    staleTime: STALE_TIMES.BALANCE,
    refetchInterval: STALE_TIMES.BALANCE,   // live polling
  })
}

// ── Wallet address ────────────────────────────────────────
export function useWalletAddress() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  QUERY_KEYS.ADDRESS,
    queryFn:   walletApi.getWalletAddress,
    enabled:   isAuthenticated,
    staleTime: Infinity,   // address never changes
  })
}

// ── Deposit networks ──────────────────────────────────────
export function useDepositNetworks() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  QUERY_KEYS.DEPOSIT_NETWORKS,
    queryFn:   walletApi.getDepositNetworks,
    enabled:   isAuthenticated,
    staleTime: STALE_TIMES.BANKS,   // rarely changes
  })
}

// ── Transactions list ─────────────────────────────────────
export function useTransactions(page = 1) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  QUERY_KEYS.TRANSACTIONS(page),
    queryFn:   () => walletApi.getTransactions(page),
    enabled:   isAuthenticated,
    staleTime: STALE_TIMES.TRANSACTIONS,
    placeholderData: (prev) => prev,   // keep previous page while fetching next
  })
}

// ── Single transaction ────────────────────────────────────
export function useTransaction(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.TRANSACTION(id),
    queryFn:  () => walletApi.getTransaction(id),
    enabled:  !!id,
  })
}

// ── Resolve username (debounced in component) ─────────────
export function useResolveUsername(username: string) {
  return useQuery({
    queryKey: QUERY_KEYS.RESOLVE_USERNAME(username),
    queryFn:  () => walletApi.resolveUsername(username),
    enabled:  username.length >= 3,
    staleTime: 60_000,
    retry: false,
  })
}

// ── Send to username ──────────────────────────────────────
export function useSendToUsername() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: walletApi.sendToUsername,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BALANCE })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS(1) })
    },
  })
}

// ── Send to EVM address ───────────────────────────────────
export function useSendToAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: walletApi.sendToAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BALANCE })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS(1) })
    },
  })
}

// ── Update profile ────────────────────────────────────────
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: walletApi.updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(QUERY_KEYS.PROFILE, user)
      queryClient.setQueryData(QUERY_KEYS.ME, user)
    },
  })
}

// ── Device management ─────────────────────────────────────
export function useDevices() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  QUERY_KEYS.DEVICES,
    queryFn:   walletApi.listDevices,
    enabled:   isAuthenticated,
    staleTime: STALE_TIMES.PROFILE,
  })
}

export function useRevokeDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (deviceId: string) => walletApi.revokeDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEVICES })
    },
  })
}

// ── Notifications ─────────────────────────────────────────
export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  QUERY_KEYS.NOTIFICATIONS,
    queryFn:   walletApi.getNotifications,
    enabled:   isAuthenticated,
    staleTime: STALE_TIMES.NOTIFICATIONS,
    refetchInterval: STALE_TIMES.NOTIFICATIONS,
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: walletApi.markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS })
    },
  })
}

// ── Earn ──────────────────────────────────────────────────
export function useEarnBalance() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  QUERY_KEYS.EARN_BALANCE,
    queryFn:   walletApi.getEarnBalance,
    enabled:   isAuthenticated,
    staleTime: STALE_TIMES.EARN,
    refetchInterval: STALE_TIMES.EARN,
  })
}

// ── Referral ──────────────────────────────────────────────
export function useReferral() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  QUERY_KEYS.REFERRAL,
    queryFn:   walletApi.getReferralInfo,
    enabled:   isAuthenticated,
    staleTime: STALE_TIMES.PROFILE,
  })
}

// ── Card transactions (card_spend type) ───────────────────
export function useCardTransactions(limit = 10) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  [...QUERY_KEYS.TRANSACTIONS(1), 'card'],
    queryFn:   async () => {
      const res = await walletApi.getTransactions(1, 50)
      return res.transactions.filter(tx => tx.type === 'card_payment').slice(0, limit)
    },
    enabled:   isAuthenticated,
    staleTime: STALE_TIMES.TRANSACTIONS,
  })
}

// ── PayLink ───────────────────────────────────────────────
export function useCreatePayLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: walletApi.createPayLink,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PAYLINK_MY })
    },
  })
}

export function useResolvePayLink(token: string) {
  return useQuery({
    queryKey:  QUERY_KEYS.PAYLINK_TOKEN(token),
    queryFn:   () => walletApi.resolvePayLink(token),
    enabled:   !!token,
    staleTime: 30_000,
    retry:     false,
  })
}

export function useMyPayLinks(page = 1) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  [...QUERY_KEYS.PAYLINK_MY, page],
    queryFn:   () => walletApi.getMyPayLinks(page),
    enabled:   isAuthenticated,
    staleTime: 30_000,
  })
}

export function usePayPayLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ token, payload }: { token: string; payload: import('@/types').PayLinkPayPayload }) =>
      walletApi.payPayLink(token, payload),
    onSuccess: (_data, { token }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PAYLINK_TOKEN(token) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BALANCE })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PAYLINK_MY })
    },
  })
}

export function useCancelPayLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: walletApi.cancelPayLink,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PAYLINK_MY })
    },
  })
}
