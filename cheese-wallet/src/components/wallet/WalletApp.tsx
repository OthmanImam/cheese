'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — WalletApp Root
// The single React tree that replaces the vanilla JS shell.
// Renders the correct screen based on Zustand state,
// mounts all global hooks (auto-lock, theme, etc.)
// ─────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
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

// ── PWA install banner ────────────────────────────────────
function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  if (!prompt || dismissed) return null

  async function install() {
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
    else setDismissed(true)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 40px)', maxWidth: 380,
      background: 'var(--bg2)', border: '1px solid rgba(201,168,76,0.25)',
      borderRadius: 16, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 1200,
    }}>
      <div style={{ fontSize: 28, lineHeight: 1 }}>🧀</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>Add Cheese to Home Screen</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Get the full app experience</div>
      </div>
      <button
        onClick={install}
        style={{ background: 'var(--gold)', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#0a0904', fontSize: 12, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: 'pointer', flexShrink: 0 }}
      >
        Install
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  )
}

// ── Push notification permission prompt ───────────────────
function PushPermissionPrompt() {
  const { isAuthenticated } = useAuthStore()
  const [show, setShow]     = useState(false)
  const asked               = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || asked.current) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    // Show our polite in-app prompt 3s after login
    const t = setTimeout(() => { asked.current = true; setShow(true) }, 3000)
    return () => clearTimeout(t)
  }, [isAuthenticated])

  if (!show) return null

  async function allow() {
    setShow(false)
    await Notification.requestPermission()
  }

  return (
    <div style={{
      position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 40px)', maxWidth: 380,
      background: 'var(--bg2)', border: '1px solid rgba(201,168,76,0.2)',
      borderRadius: 16, padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 1200,
      animation: 'slideDown 0.3s ease',
    }}>
      <div style={{ fontSize: 24, lineHeight: 1, paddingTop: 2 }}>🔔</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 3 }}>Stay updated</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
          Get instant alerts for incoming transfers and security events.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={allow}
            style={{ background: 'var(--gold)', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#0a0904', fontSize: 12, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: 'pointer' }}
          >
            Enable
          </button>
          <button
            onClick={() => setShow(false)}
            style={{ background: 'none', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '6px 14px', color: 'var(--muted)', fontSize: 12, fontFamily: "'Syne',sans-serif", cursor: 'pointer' }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}


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
  const { logout }  = useAuthStore()
  // useQueryClient is not available here without a QueryProvider wrapper,
  // so we dispatch a second custom event that QueryProvider listens to.
  useEffect(() => {
    function onExpired() {
      // tokenStore is cleared by the axios interceptor before this fires.
      // Clear auth state — React will re-render to auth screens automatically.
      logout()
      // Tell any cached queries they're now stale / invalid.
      window.dispatchEvent(new CustomEvent('cheese:query:clear'))
    }
    window.addEventListener('cheese:auth:expired', onExpired)
    return () => window.removeEventListener('cheese:auth:expired', onExpired)
  }, [logout])
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

        {/* PWA install prompt */}
        <PWAInstallBanner />

        {/* Push notification permission (shown 3s after first login) */}
        {isAuthenticated && <PushPermissionPrompt />}

        {/* Toast */}
        <Toast />
      </div>
    </>
  )
}
