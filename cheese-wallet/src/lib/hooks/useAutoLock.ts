// ─────────────────────────────────────────────────────────
// CHEESE WALLET — useAutoLock
// Triggers AppLock screen after N minutes of inactivity
// ─────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react'
import { useUiStore }        from '../stores/uiStore'
import { useAuthStore }      from '../stores/authStore'

export function useAutoLock() {
  const { autoLockMinutes, activeView, goTo } = useUiStore()
  const { isAuthenticated }                   = useAuthStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function resetTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isAuthenticated || autoLockMinutes === 'never') return
    timerRef.current = setTimeout(() => {
      goTo('applock')
    }, (autoLockMinutes as number) * 60 * 1000)
  }

  // Reset timer on activity
  useEffect(() => {
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [autoLockMinutes, isAuthenticated])

  // Reset timer on screen change too
  useEffect(() => {
    if (activeView !== 'applock') resetTimer()
  }, [activeView])
}
