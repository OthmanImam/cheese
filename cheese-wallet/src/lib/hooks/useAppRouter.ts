// ─────────────────────────────────────────────────────────
// CHEESE WALLET — App Router Hook
// Central navigation replacing all goTo / goToAuth calls
// ─────────────────────────────────────────────────────────
import { useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useUiStore }   from '@/lib/stores/uiStore'
import type { AppScreen, AuthScreen } from '@/types'

export type Screen = AppScreen | AuthScreen | 'applock'

export function useAppRouter() {
  const { setAuthScreen }    = useAuthStore()
  const { setActiveScreen }  = useUiStore()
  const { setShowNav }       = useUiStore()

  const APP_SCREENS: AppScreen[]   = ['home','send','cards','cardscreen','history','profile']
  const NO_NAV: string[] = ['notifications','txdetail','kyc','security','profile-edit','earn','support','applock']

  const goTo = useCallback((screen: AppScreen | 'notifications' | 'txdetail' | 'kyc' | 'security' | 'profile-edit' | 'earn' | 'support' | 'applock') => {
    setActiveScreen(screen as AppScreen)
  }, [setActiveScreen])

  const goToAuth = useCallback((screen: AuthScreen) => {
    setAuthScreen(screen)
    setActiveScreen('home') // keeps app screen tracked but auth overlay shows
  }, [setAuthScreen, setActiveScreen])

  return { goTo, goToAuth, NO_NAV, APP_SCREENS }
}
