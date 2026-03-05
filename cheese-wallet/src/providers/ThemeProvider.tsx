'use client'

// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Theme Provider
// Reads theme from Zustand and writes [data-theme] on the
// phone wrapper so CSS variables switch cleanly.
// ─────────────────────────────────────────────────────────

import { useEffect, type ReactNode } from 'react'
import { useUiStore } from '@/lib/stores/uiStore'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    // Set on <html> for the landing page
    document.documentElement.setAttribute('data-theme', theme)
    // Also set on the .phone element if it's rendered (wallet page)
    const phone = document.querySelector('.phone')
    if (phone) phone.setAttribute('data-theme', theme)
  }, [theme])

  return <>{children}</>
}
