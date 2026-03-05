'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — UI Store (Zustand) — full rebuild
// ─────────────────────────────────────────────────────────
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Theme } from '@/types'

export type AppView =
  | 'home' | 'send' | 'cards' | 'cardscreen' | 'history' | 'profile'
  | 'notifications' | 'txdetail' | 'kyc' | 'security' | 'profile-edit'
  | 'earn' | 'support' | 'applock'

export type ModalId  = 'addFunds' | 'cryptoDeposit' | 'askReceive' | 'bankFlow' | null
export type SendMethod = 'username' | 'account' | 'evm' | 'qr' | null
export type SendStep   = 'method' | 'recipient' | 'amount' | 'confirm' | 'pin' | 'processing' | 'success'
export type BankStep   = 'amount' | 'bank' | 'account' | 'review' | 'pin' | 'done'

interface SendFlow { method: SendMethod; step: SendStep; recipient: string; recipientName: string; amount: string }
interface BankFlow { step: BankStep; amount: string; bankCode: string; bankName: string; bankColor: string; accountNumber: string; resolvedName: string; reference: string }
interface Toast    { title: string; message: string; visible: boolean }

export interface TxDetailData {
  type:       'in' | 'out' | 'bank_out' | 'card_spend'
  amount:     string
  desc:       string
  date:       string
  ref:        string
  hash?:      string
  network?:   string
  fee:        string
  status:     'confirmed' | 'pending' | 'failed'
  fromScreen: AppView
}

interface UiState {
  theme: Theme;  setTheme: (t: Theme) => void;  toggleTheme: () => void
  activeView: AppView;  prevView: AppView;  showNav: boolean
  setActiveView: (v: AppView) => void;  setShowNav: (v: boolean) => void
  goTo: (v: AppView) => void;  goBack: () => void
  balanceVisible: boolean;  toggleBalance: () => void
  activeModal: ModalId;  openModal: (id: ModalId) => void;  closeModal: () => void
  toast: Toast;  showToast: (title: string, message: string) => void;  hideToast: () => void
  sendFlow: SendFlow
  setSendMethod: (m: SendMethod) => void;  setSendStep: (s: SendStep) => void
  setSendRecipient: (r: string, name?: string) => void;  setSendAmount: (a: string) => void;  resetSend: () => void
  bankFlow: BankFlow
  setBankStep: (s: BankStep) => void;  setBankAmount: (a: string) => void
  selectBank: (code: string, name: string, color: string) => void
  setBankAccount: (acct: string, name: string) => void
  setBankReference: (ref: string) => void;  resetBankFlow: () => void
  txDetail: TxDetailData | null
  openTxDetail: (tx: Omit<TxDetailData, 'fromScreen'>) => void;  closeTxDetail: () => void
  onboarded: boolean;  setOnboarded: () => void
  autoLockMinutes: number | 'never';  setAutoLock: (v: number | 'never') => void
  biometricEnabled: boolean;  toggleBiometric: () => void
}

const DS: SendFlow = { method: null, step: 'method', recipient: '', recipientName: '', amount: '' }
const DB: BankFlow = { step: 'amount', amount: '', bankCode: '', bankName: '', bankColor: '#c9a84c', accountNumber: '', resolvedName: '', reference: '' }
const NAV: AppView[] = ['home','send','cards','history','profile']

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      activeView: 'home', prevView: 'home', showNav: true,
      setActiveView: (v) => set({ activeView: v }),
      setShowNav:    (v) => set({ showNav: v }),
      goTo: (v) => set((s) => ({ prevView: s.activeView, activeView: v, showNav: NAV.includes(v) })),
      goBack: () => get().goTo(get().prevView),

      balanceVisible: true,
      toggleBalance: () => set((s) => ({ balanceVisible: !s.balanceVisible })),

      activeModal: null,
      openModal:  (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),

      toast: { title: '', message: '', visible: false },
      showToast: (title, message) => set({ toast: { title, message, visible: true } }),
      hideToast: () => set((s) => ({ toast: { ...s.toast, visible: false } })),

      sendFlow: DS,
      setSendMethod:    (m)    => set((s) => ({ sendFlow: { ...s.sendFlow, method: m, step: 'recipient' } })),
      setSendStep:      (step) => set((s) => ({ sendFlow: { ...s.sendFlow, step } })),
      setSendRecipient: (r, name = '') => set((s) => ({ sendFlow: { ...s.sendFlow, recipient: r, recipientName: name, step: 'amount' } })),
      setSendAmount:    (a)    => set((s) => ({ sendFlow: { ...s.sendFlow, amount: a } })),
      resetSend:        () => set({ sendFlow: DS }),

      bankFlow: DB,
      setBankStep:      (step)         => set((s) => ({ bankFlow: { ...s.bankFlow, step } })),
      setBankAmount:    (a)            => set((s) => ({ bankFlow: { ...s.bankFlow, amount: a } })),
      selectBank:       (code, name, color) => set((s) => ({ bankFlow: { ...s.bankFlow, bankCode: code, bankName: name, bankColor: color, step: 'account' } })),
      setBankAccount:   (acct, name)   => set((s) => ({ bankFlow: { ...s.bankFlow, accountNumber: acct, resolvedName: name, step: 'review' } })),
      setBankReference: (ref)          => set((s) => ({ bankFlow: { ...s.bankFlow, reference: ref } })),
      resetBankFlow:    () => set({ bankFlow: DB }),

      txDetail: null,
      openTxDetail: (tx) => set((s) => ({ txDetail: { ...tx, fromScreen: s.activeView }, activeView: 'txdetail', prevView: s.activeView, showNav: false })),
      closeTxDetail: () => { const from = get().txDetail?.fromScreen ?? 'history'; set({ activeView: from, showNav: NAV.includes(from), txDetail: null }) },

      onboarded: false,
      setOnboarded: () => set({ onboarded: true }),

      autoLockMinutes: 5,
      setAutoLock: (v) => set({ autoLockMinutes: v }),
      biometricEnabled: true,
      toggleBiometric: () => set((s) => ({ biometricEnabled: !s.biometricEnabled })),
    }),
    {
      name: 'cheese-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme, balanceVisible: s.balanceVisible, onboarded: s.onboarded, autoLockMinutes: s.autoLockMinutes, biometricEnabled: s.biometricEnabled }),
    } as Parameters<typeof persist>[1],
  ),
)
