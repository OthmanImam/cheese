// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Wallet Store (Zustand)
// Owns: optimistic balance updates, last known rate cache,
//       pending transaction tracking
// ─────────────────────────────────────────────────────────
// NOTE: Live server data (balance, transactions) lives in
// React Query. This store only tracks ephemeral UI state
// that doesn't need to be refetched.
// ─────────────────────────────────────────────────────────

import { create } from 'zustand'
import type { TxStatus } from '@/types'

interface PendingTx {
  id:           string
  type:         'send' | 'bank_out'
  amountUsdc:   string
  recipient:    string
  status:       TxStatus
  startedAt:    number
}

interface WalletStoreState {
  // ── Rate cache (from last successful API call) ─────────
  cachedRate:    number              // effective rate (market + 20)
  rateUpdatedAt: number | null       // timestamp ms

  // ── Pending transactions ──────────────────────────────
  pendingTxs: PendingTx[]

  // ── Actions ──────────────────────────────────────────
  setCachedRate:     (rate: number) => void
  addPendingTx:      (tx: PendingTx) => void
  resolvePendingTx:  (id: string, status: TxStatus) => void
  clearPendingTxs:   () => void
}

export const useWalletStore = create<WalletStoreState>()((set) => ({
  // ── Initial state ──────────────────────────────────────
  cachedRate:    1610,    // fallback: ₦1590 market + ₦20 Cheese spread
  rateUpdatedAt: null,
  pendingTxs:    [],

  // ── Rate ────────────────────────────────────────────────
  setCachedRate: (rate) =>
    set({ cachedRate: rate, rateUpdatedAt: Date.now() }),

  // ── Pending transactions ────────────────────────────────
  addPendingTx: (tx) =>
    set((s) => ({ pendingTxs: [tx, ...s.pendingTxs] })),

  resolvePendingTx: (id, status) =>
    set((s) => ({
      pendingTxs: s.pendingTxs.map((tx) =>
        tx.id === id ? { ...tx, status } : tx,
      ),
    })),

  clearPendingTxs: () => set({ pendingTxs: [] }),
}))
