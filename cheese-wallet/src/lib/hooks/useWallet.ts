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
