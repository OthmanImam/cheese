// ─────────────────────────────────────────────────────────
// CHEESE WALLET — useAutoLock
// Triggers AppLock screen after N minutes of inactivity.
//
// Fix: useCallback prevents stale closures in event listeners.
// Timer is correctly restarted when returning from AppLock.
// ─────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef } from 'react'
import { useUiStore }                     from '../stores/uiStore'
import { useAuthStore }                   from '../stores/authStore'

export function useAutoLock() {
  const autoLockMinutes = useUiStore((s) => s.autoLockMinutes)
  const activeView      = useUiStore((s) => s.activeView)
  const goTo            = useUiStore((s) => s.goTo)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Memoized so event listeners always call the latest version
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isAuthenticated || autoLockMinutes === 'never' || activeView === 'applock') return
    timerRef.current = setTimeout(() => {
      goTo('applock')
    }, (autoLockMinutes as number) * 60 * 1000)
  }, [isAuthenticated, autoLockMinutes, activeView, goTo])

  // Re-register event listeners whenever deps change
  useEffect(() => {
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  // Restart timer when user returns from applock (unlock)
  useEffect(() => {
    if (activeView !== 'applock' && isAuthenticated) {
      resetTimer()
    }
  }, [activeView, isAuthenticated, resetTimer])
}
