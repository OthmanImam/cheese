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
  const { setActiveView }  = useUiStore()
  const { setShowNav }       = useUiStore()

  const APP_SCREENS: AppScreen[]   = ['home','send','cards','cardscreen','history','profile']
  const NO_NAV: string[] = ['notifications','txdetail','kyc','security','profile-edit','earn','support','applock']

  const goTo = useCallback((screen: AppScreen | 'notifications' | 'txdetail' | 'kyc' | 'security' | 'profile-edit' | 'earn' | 'support' | 'applock') => {
    setActiveView(screen as AppScreen)
  }, [setActiveView])

  const goToAuth = useCallback((screen: AuthScreen) => {
    setAuthScreen(screen)
    setActiveView('home') // keeps app screen tracked but auth overlay shows
  }, [setAuthScreen, setActiveView])

  return { goTo, goToAuth, NO_NAV, APP_SCREENS }
}
