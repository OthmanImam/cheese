'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — /wallet page
// Entry point: mounts providers + WalletApp shell
// ─────────────────────────────────────────────────────────
import { QueryProvider }  from '@/providers/QueryProvider'
import { ThemeProvider }  from '@/providers/ThemeProvider'
import { WalletApp }      from '@/components/wallet/WalletApp'

export default function WalletPage() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <WalletApp />
      </ThemeProvider>
    </QueryProvider>
  )
}
