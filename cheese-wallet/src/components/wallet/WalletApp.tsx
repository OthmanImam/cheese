'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — WalletApp Root
// The single React tree that replaces the vanilla JS shell.
// Renders the correct screen based on Zustand state,
// mounts all global hooks (auto-lock, theme, etc.)
// ─────────────────────────────────────────────────────────
import { useEffect }           from 'react'
import { useAuthStore }        from '@/lib/stores/authStore'
import { useUiStore }          from '@/lib/stores/uiStore'
import { useAutoLock }         from '@/lib/hooks/useAutoLock'
import { StatusBar, BottomNav, Toast, ThemeToggle } from './shared/UI'
import { SplashScreen, LoginScreen, SignupScreen, OtpScreen, DeviceScreen, ForgotEmailScreen, ForgotOtpScreen, NewPasswordScreen, PwSuccessScreen } from './screens/auth/AuthScreens'
import { HomeScreen }          from './screens/app/HomeScreen'
import { SendScreen }          from './screens/app/SendScreen'
import { CardsScreen, CardDetailScreen } from './screens/app/CardsScreen'
import { HistoryScreen } from './screens/app/HistoryScreen'
import { ProfileScreen }       from './screens/app/ProfileScreen'
import {
  NotificationsScreen,
  TxDetailScreen,
  AppLockScreen,
  KycScreen,
  SecurityScreen,
  ProfileEditScreen,
  EarnScreen,
  SupportScreen,
} from './screens/app/SecondaryScreens'
import {
  AddFundsModal,
  CryptoDepositModal,
  AskReceiveModal,
  BankFlowModal,
  OnboardingOverlay,
} from './Modals'

// ── App screen map ────────────────────────────────────────
function AppScreens() {
  const { activeView }        = useUiStore()
  const { isAuthenticated }   = useAuthStore()

  // While auth isn't confirmed, show nothing (splash handles it)
  return (
    <>
      {/* ── App views ── */}
      {isAuthenticated && (
        <>
          {activeView === 'home'          && <HomeScreen />}
          {activeView === 'send'          && <SendScreen />}
          {activeView === 'cards'         && <CardsScreen />}
          {activeView === 'cardscreen'    && <CardDetailScreen />}
          {activeView === 'history'       && <HistoryScreen />}
          {activeView === 'txdetail'      && <TxDetailScreen />}
          {activeView === 'profile'       && <ProfileScreen />}
          {activeView === 'profile-edit'  && <ProfileEditScreen />}
          {activeView === 'notifications' && <NotificationsScreen />}
          {activeView === 'kyc'           && <KycScreen />}
          {activeView === 'security'      && <SecurityScreen />}
          {activeView === 'earn'          && <EarnScreen />}
          {activeView === 'support'       && <SupportScreen />}
          {activeView === 'applock'       && <AppLockScreen />}
        </>
      )}
    </>
  )
}

// ── Auth screen map ───────────────────────────────────────
function AuthScreens() {
  const { isAuthenticated, isInitialised } = useAuthStore()
  const { authScreen }                     = useAuthStore()

  if (isAuthenticated) return null

  return (
    <>
      {!isInitialised                            && <SplashScreen />}
      {isInitialised && authScreen === 'login'   && <LoginScreen />}
      {isInitialised && authScreen === 'signup-1'   && <SignupScreen />}
      {isInitialised && authScreen === 'signup-2'   && <SignupScreen />}
      {isInitialised && authScreen === 'signup-3'   && <SignupScreen />}
      {isInitialised && authScreen === 'signup-otp' && <OtpScreen type="signup" />}
      {isInitialised && authScreen === 'device'     && <DeviceScreen />}
      {isInitialised && authScreen === 'forgot-email'  && <ForgotEmailScreen />}
      {isInitialised && authScreen === 'forgot-otp'    && <ForgotOtpScreen />}
      {isInitialised && authScreen === 'new-password'  && <NewPasswordScreen />}
      {isInitialised && authScreen === 'pw-success'    && <PwSuccessScreen />}
    </>
  )
}

// ── Theme syncer ──────────────────────────────────────────
function ThemeSyncer() {
  const { theme } = useUiStore()
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.querySelector('.phone')?.setAttribute('data-theme', theme)
  }, [theme])
  return null
}

// ── Auto-lock mount ───────────────────────────────────────
function AutoLockMount() {
  useAutoLock()
  return null
}

// ── Auth event handler ────────────────────────────────────
function AuthEventListener() {
  const { logout } = useAuthStore()
  useEffect(() => {
    function onExpired() {
      logout()
    }
    window.addEventListener('cheese:auth:expired', onExpired)
    return () => window.removeEventListener('cheese:auth:expired', onExpired)
  }, [])
  return null
}

// ── Main WalletApp shell ──────────────────────────────────
export function WalletApp() {
  const { isAuthenticated, isInitialised } = useAuthStore()
  const { activeView, showNav }            = useUiStore()

  const showBottomNav = isAuthenticated && showNav && activeView !== 'applock'

  return (
    <>
      <ThemeSyncer />
      <AutoLockMount />
      <AuthEventListener />

      <div className="phone">
        <StatusBar />

        {/* Screens */}
        <AuthScreens />
        <AppScreens />

        {/* Bottom nav */}
        {showBottomNav && <BottomNav />}

        {/* Modals */}
        <AddFundsModal />
        <CryptoDepositModal />
        <AskReceiveModal />
        <BankFlowModal />

        {/* Onboarding overlay — shown after first login */}
        {isAuthenticated && isInitialised && <OnboardingOverlay />}

        {/* Toast */}
        <Toast />
      </div>
    </>
  )
}
