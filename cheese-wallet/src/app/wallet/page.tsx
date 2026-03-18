'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — /wallet page
// Entry point: mounts providers + WalletApp shell
// ─────────────────────────────────────────────────────────
import { QueryProvider }  from '@/providers/QueryProvider'
import { WalletApp }      from '@/components/wallet/WalletApp'
import { ThemeProvider } from '@/providers/ThemeProvider'

export default function WalletPage() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <WalletApp />
      </ThemeProvider>
    </QueryProvider>
  )
}
