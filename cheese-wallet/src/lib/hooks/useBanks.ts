// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Banks, Exchange Rate & Card Hooks
// ─────────────────────────────────────────────────────────

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as walletApi from '@/lib/api/wallet'
import { QUERY_KEYS, STALE_TIMES } from '@/constants'
import { useAuthStore } from '@/lib/stores/authStore'
import { useWalletStore } from '@/lib/stores/walletStore'
import type { AccountResolvePayload, BankTransferPayload } from '@/types'

// ── Banks list ────────────────────────────────────────────
export function useBanks() {
  return useQuery({
    queryKey:  QUERY_KEYS.BANKS,
    queryFn:   walletApi.getBanks,
    staleTime: STALE_TIMES.BANKS,
  })
}

// ── Resolve account number ────────────────────────────────
export function useResolveAccount(payload: AccountResolvePayload | null) {
  return useQuery({
    queryKey: QUERY_KEYS.RESOLVE_ACCOUNT(
      payload?.accountNumber ?? '',
      payload?.bankCode ?? '',
    ),
    queryFn: () => walletApi.resolveAccount(payload!),
    enabled: !!payload && payload.accountNumber.length === 10 && !!payload.bankCode,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

// ── Bank transfer ─────────────────────────────────────────
export function useBankTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BankTransferPayload) => walletApi.bankTransfer(payload),
    onSuccess: () => {
      // Invalidate balance and transaction list after a successful transfer
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BALANCE })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS(1) })
    },
  })
}

// ── Exchange rate ─────────────────────────────────────────
// Also syncs into walletStore so the vanilla-JS wallet UI
// can read the latest effective rate without React Query.
export function useExchangeRate() {
  const setCachedRate = useWalletStore((s) => s.setCachedRate)

  return useQuery({
    queryKey:  QUERY_KEYS.EXCHANGE_RATE,
    queryFn:   async () => {
      const rate = await walletApi.getExchangeRate()
      setCachedRate(parseFloat(rate.effectiveRate))
      return rate
    },
    staleTime:       STALE_TIMES.EXCHANGE_RATE,
    refetchInterval: STALE_TIMES.EXCHANGE_RATE,
  })
}

// ── Virtual card ──────────────────────────────────────────
export function useCard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey:  QUERY_KEYS.CARD,
    queryFn:   walletApi.getCard,
    enabled:   isAuthenticated,
    staleTime: STALE_TIMES.CARD,
  })
}

export function useFreezeCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: walletApi.freezeCard,
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.CARD, updated)
    },
  })
}

export function useUnfreezeCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: walletApi.unfreezeCard,
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.CARD, updated)
    },
  })
}

export function useRevealCvv() {
  return useMutation({
    mutationFn: (pin: string) => walletApi.revealCvv(pin),
  })
}
