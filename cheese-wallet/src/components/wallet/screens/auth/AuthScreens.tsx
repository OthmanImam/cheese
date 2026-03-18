'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Auth Screens
// Splash · Login · Signup(1-4) · OTP · Device · ForgotPassword
// ─────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useUiStore }   from '@/lib/stores/uiStore'
import {
  useLogin, useSignup, useVerifyOtp, useResendOtp,
  useRegisterDevice, useForgotPassword, useResetPassword,
} from '@/lib/hooks/useAuth'
import { generateDeviceKey, signTransaction } from '@/lib/crypto/deviceSigning'
import {
  AuthField, AuthBtn, AuthSteps, OtpBoxes,
  PwStrength, isStrongPassword, ErrorBanner,
} from '../../shared/UI'
import type { AuthScreen } from '@/types'


// ── Countdown hook ────────────────────────────────────────
function useCountdown(from: number, active: boolean, key?: number) {
  const [secs, setSecs] = useState(from)
  useEffect(() => {
    if (!active) return
    setSecs(from)
    const id = setInterval(() => setSecs(s => { if (s <= 1) { clearInterval(id); return 0 } return s - 1 }), 1000)
    return () => clearInterval(id)
  }, [active, from, key])
  return secs
}

// ── Shared auth-screen wrapper ────────────────────────────
function AuthWrap({ children }: { children: React.ReactNode }) {
  return <div className="screen active"><div className="auth-wrap">{children}</div></div>
}

// ── 1. Splash ─────────────────────────────────────────────
export function SplashScreen() {
  const { setAuthScreen, setInitialised } = useAuthStore()
  useEffect(() => {
    const id = setTimeout(() => {
      setInitialised()
      setAuthScreen('login')
    }, 2000)
    return () => clearTimeout(id)
  }, [])
  return (
    <div className="screen active" style={{ background: 'var(--bg)' }}>
      <div className="splash-wrap">
        <div className="splash-glow" />
        <div className="splash-logo-mark">
          <svg viewBox="0 0 52 52" fill="none">
            <path d="M36 14C36 14 33 10 26 10C17.16 10 10 17.16 10 26C10 34.84 17.16 42 26 42C33 42 36 38 36 38" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M20 20C20 20 22 18 26 18C30 18 32 20 32 23C32 26 29 27.5 26 28C23 28.5 20 30 20 33C20 36 22.5 38 26 38" stroke="#e8c97a" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── 2. Login ──────────────────────────────────────────────
export function LoginScreen() {
  const { setAuthScreen } = useAuthStore()
  const { goTo }          = useUiStore()
  const login             = useLogin()

  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')

  async function handleLogin() {
    if (!identifier || !password) return
    try {
      // Sign the login action with the registered device key if one exists
      const storedDeviceKey = useAuthStore.getState().deviceKey
      const loginPayload: any = {
        identifier,
        password,
      }

      // Only add device signature if we have a stored device key
      if (storedDeviceKey?.id) {
        try {
          const sig = await signTransaction({
            deviceId:  storedDeviceKey.id,
            userId:    identifier,
            action:    'send_username', // reused as generic auth action
            amount:    '0',
            recipient: 'login',
          })
          loginPayload.deviceSignature = sig.deviceSignature
          loginPayload.deviceId = sig.deviceId
        } catch { 
          // Fall back to password-only login if signature fails
          // User will need to register the device after login
        }
      }

      await login.mutateAsync(loginPayload)
      goTo('home')
    } catch {}
  }

  return (
    <AuthWrap>
      <div className="auth-logo-mark">
        <svg viewBox="0 0 52 52" fill="none">
          <path d="M36 14C36 14 33 10 26 10C17.16 10 10 17.16 10 26C10 34.84 17.16 42 26 42C33 42 36 38 36 38" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M20 20C20 20 22 18 26 18C30 18 32 20 32 23C32 26 29 27.5 26 28C23 28.5 20 30 20 33C20 36 22.5 38 26 38" stroke="#e8c97a" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
        </svg>
      </div>
      <div className="auth-heading">Welcome<br/><em>back.</em></div>
      <div className="auth-sub">Sign in to your Cheese account.</div>

      <ErrorBanner message={login.error?.message} />

      <AuthField label="Email or Username" value={identifier} onChange={setIdentifier}
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
        placeholder="you@example.com" />

      <AuthField label="Password" value={password} onChange={setPassword}
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
        showToggle placeholder="••••••••" />

      <div style={{ textAlign:'right', marginBottom:16 }}>
        <span className="auth-link" onClick={() => setAuthScreen('forgot-email')}>Forgot password?</span>
      </div>

      <AuthBtn onClick={handleLogin} disabled={!identifier || !password} loading={login.isPending}>
        Sign In
      </AuthBtn>

      <div className="auth-divider"><div className="auth-divider-line"/><span>or</span><div className="auth-divider-line"/></div>

      <AuthBtn outline onClick={() => setAuthScreen('signup-1')}>
        Create Account
      </AuthBtn>
    </AuthWrap>
  )
}

// ── 3. Signup ─────────────────────────────────────────────
export function SignupScreen() {
  const { setAuthScreen, setPendingSignup, setPendingEmail, setDeviceKey } = useAuthStore()
  const signup = useSignup()

  const [step,      setStep]      = useState(1)
  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [username,  setUsername]  = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [agreed,    setAgreed]    = useState(false)

  async function handleSubmit() {
    // Generate device key before signup
    const deviceId = 'CHZ-' + Math.random().toString(36).slice(2,8).toUpperCase()
    const { publicKey } = await generateDeviceKey(deviceId)

    const payload = {
      fullName,
      email,
      phone,
      username,
      password,
      deviceId,
      devicePublicKey: publicKey,
    }
    setPendingSignup({ fullName, email, phone, username, password })
    try {
      await signup.mutateAsync(payload)
      // Store the device key for future use
      setDeviceKey({
        id: deviceId,
        publicKey,
        createdAt: new Date().toISOString(),
      })
      setPendingEmail(email)
      setAuthScreen('signup-otp')
    } catch {}
  }

  if (step === 1) return (
    <AuthWrap>
      <AuthSteps total={3} current={0} />
      <div className="auth-back" onClick={() => setAuthScreen('login')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </div>
      <div className="auth-heading">Personal<br/><em>details.</em></div>
      <AuthField label="Full Name" value={fullName} onChange={setFullName} placeholder="Oluwaseun Adeyemi" />
      <AuthField label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <AuthField label="Phone Number" type="tel" value={phone} onChange={setPhone} placeholder="+234 800 000 0000" />
      <AuthBtn onClick={() => setStep(2)} disabled={!fullName || !email || !phone}>Continue</AuthBtn>
    </AuthWrap>
  )

  if (step === 2) return (
    <AuthWrap>
      <AuthSteps total={3} current={1} />
      <div className="auth-back" onClick={() => setStep(1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </div>
      <div className="auth-heading">Choose a<br/><em>username.</em></div>
      <div className="auth-sub">This is how people send money to you.</div>
      <div style={{ display:'flex', alignItems:'center', gap:0, background:'var(--bg3)', border:'1px solid rgba(201,168,76,0.15)', borderRadius:'var(--r)', marginBottom:14, padding:'0 18px', height:60 }}>
        <span style={{ color:'var(--gold)', fontSize:18, marginRight:4 }}>@</span>
        <div style={{ flex:1 }}>
          <div className="auth-field-label">Username</div>
          <input style={{ background:'none', border:'none', outline:'none', fontFamily:'Syne,sans-serif', fontSize:16, color:'var(--text)', width:'100%' }}
            value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g,''))}
            placeholder="your.name" maxLength={24} />
        </div>
      </div>
      <AuthBtn onClick={() => setStep(3)} disabled={username.length < 3}>Continue</AuthBtn>
    </AuthWrap>
  )

  if (step === 3) return (
    <AuthWrap>
      <AuthSteps total={3} current={2} />
      <div className="auth-back" onClick={() => setStep(2)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </div>
      <div className="auth-heading">Create a<br/><em>password.</em></div>
      <ErrorBanner message={signup.error?.message} />
      <AuthField label="Password" value={password} onChange={setPassword} showToggle placeholder="Min 8 characters" />
      <PwStrength password={password} />
      <AuthField label="Confirm Password" value={confirm} onChange={setConfirm} showToggle placeholder="Repeat password" />
      {confirm && confirm !== password && <div style={{ fontSize:12, color:'var(--danger)', marginBottom:12 }}>Passwords do not match</div>}
      <div className="auth-check-row" onClick={() => setAgreed(a => !a)}>
        <div className={`auth-check-box${agreed ? ' checked' : ''}`}>
          {agreed && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <span className="auth-check-label">I agree to the <span style={{ color:'var(--gold)' }}>Terms of Service</span> and <span style={{ color:'var(--gold)' }}>Privacy Policy</span></span>
      </div>
      <AuthBtn onClick={handleSubmit} disabled={!isStrongPassword(password) || password !== confirm || !agreed} loading={signup.isPending}>
        Create Account
      </AuthBtn>
    </AuthWrap>
  )

  return null
}

// ── 4. OTP Verify ─────────────────────────────────────────
export function OtpScreen({ type = 'signup' }: { type?: 'signup' | 'forgot-password' }) {
  const { setAuthScreen, pendingEmail, deviceKey, pendingSignup } = useAuthStore()
  const { goTo } = useUiStore()
  const verifyOtp = useVerifyOtp()
  const resendOtp = useResendOtp()
  const login = useLogin()

  const [otp,      setOtp]      = useState('')
  const [resent,   setResent]   = useState(false)
  const [resendKey, setResendKey] = useState(0) // Force countdown restart
  const countdown              = useCountdown(60, true, resendKey)

  async function handleVerify() {
    if (otp.length !== 6) return
    try {
      await verifyOtp.mutateAsync({ email: pendingEmail ?? '', otp, type: type === 'signup' ? 'email_verify' : 'password_reset' })
      
      if (type === 'signup') {
        // After signup OTP verification, automatically log in
        const storedDeviceKey = deviceKey
        const password = pendingSignup?.password
        if (storedDeviceKey && pendingEmail && password) {
          try {
            const sig = await signTransaction({
              deviceId: storedDeviceKey.id,
              userId: pendingEmail,
              action: 'send_username', // reused as generic auth action
              amount: '0',
              recipient: 'login',
            })
            await login.mutateAsync({
              identifier: pendingEmail,
              password,
              deviceSignature: sig.deviceSignature,
              deviceId: storedDeviceKey.id,
            })
            goTo('home')
          } catch (loginErr) {
            console.error('Auto-login failed:', loginErr)
            setAuthScreen('login') // Fallback to manual login
          }
        } else {
          setAuthScreen('login') // Fallback if missing data
        }
      } else {
        setAuthScreen('new-password')
      }
    } catch {}
  }

  async function handleResend() {
    if (countdown > 0) return
    try {
      await resendOtp.mutateAsync({ email: pendingEmail ?? '', type: type === 'signup' ? 'email_verify' : 'password_reset' })
      setResent(true)
      setResendKey(k => k + 1) // Force countdown restart
    } catch {}
  }

  // Auto-submit when 6 digits entered
  useEffect(() => { if (otp.length === 6) handleVerify() }, [otp])

  return (
    <AuthWrap>
      <div className="auth-back" onClick={() => setAuthScreen(type === 'signup' ? 'signup-3' : 'forgot-email')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </div>
      <div className="auth-heading">Enter the<br/><em>code.</em></div>
      <div className="auth-sub">We sent a 6-digit code to <strong style={{ color:'var(--text)' }}>{pendingEmail}</strong></div>

      <ErrorBanner message={verifyOtp.error?.message} />

      <OtpBoxes value={otp} length={6} />

      {/* Inline numpad for OTP */}
      <div className="numpad" style={{ maxWidth:280, margin:'0 auto 20px' }}>
        {['1','2','3','4','5','6','7','8','9','.','0','DEL'].map((k) => (
          <div key={k} className={`numpad-key${k==='DEL'?' del':k==='.'?' dot':''}`}
            onClick={() => {
              if (k === 'DEL') { setOtp(v => v.slice(0,-1)); return }
              if (k === '.') return
              if (otp.length >= 6) return
              setOtp(v => v + k)
            }}>
            {k === 'DEL' ? <svg viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg> : k === '.' ? '' : k}
          </div>
        ))}
      </div>

      <AuthBtn onClick={handleVerify} disabled={otp.length !== 6} loading={verifyOtp.isPending}>Verify Code</AuthBtn>

      <div style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--muted)' }}>
        {countdown > 0
          ? <>Resend in <strong style={{ color:'var(--text)' }}>{countdown}s</strong></>
          : <span className="auth-link" onClick={handleResend}>{resent ? 'Code resent ✓' : 'Resend code'}</span>}
      </div>
    </AuthWrap>
  )
}

// ── 5. Device Registration ────────────────────────────────
export function DeviceScreen() {
  const { setAuthScreen, deviceKey } = useAuthStore()
  const { goTo }                     = useUiStore()
  const registerDevice               = useRegisterDevice()
  const [generating, setGenerating]  = useState(false)
  const [generated,  setGenerated]   = useState(false)
  const [deviceId,   setDeviceId]    = useState('')
  const [pubKey,     setPubKey]      = useState('')

  async function generate() {
    setGenerating(true)
    try {
      // Real Web Crypto ECDSA P-256 key generation.
      // Private key stored non-extractable in IndexedDB — never leaves device.
      const newDeviceId = 'CHZ-' + Math.random().toString(36).slice(2,8).toUpperCase()
      const { publicKey } = await generateDeviceKey(newDeviceId)
      setDeviceId(newDeviceId)
      setPubKey(publicKey)
      setGenerated(true)
    } catch (err) {
      console.error('Key generation failed', err)
    } finally {
      setGenerating(false)
    }
  }

  async function register() {
    try {
      await registerDevice.mutateAsync({
        id: deviceId,
        publicKey:  pubKey,
        createdAt: new Date().toISOString(),
      })
      goTo('home')
    } catch {}
  }

  return (
    <AuthWrap>
      <div className="auth-heading">Secure your<br/><em>account.</em></div>
      <div className="auth-sub">We generate a cryptographic key on this device. Every transaction you make will be signed by it.</div>

      <div className="auth-info-chip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <p>Your private key <strong>never leaves this device</strong>. Not even Cheese can access it.</p>
      </div>

      {generated && (
        <div style={{ background:'var(--bg3)', border:'1px solid rgba(201,168,76,0.15)', borderRadius:'var(--r)', padding:'16px 18px', marginBottom:16 }}>
          <div style={{ fontSize:10, letterSpacing:2, color:'var(--muted)', textTransform:'uppercase', marginBottom:8 }}>Device ID</div>
          <div style={{ fontFamily:'DM Mono,monospace', fontSize:16, color:'var(--gold)' }}>{deviceId}</div>
          <div style={{ fontSize:10, letterSpacing:2, color:'var(--muted)', textTransform:'uppercase', margin:'12px 0 8px' }}>Public Key (ed25519)</div>
          <div style={{ fontFamily:'DM Mono,monospace', fontSize:10, color:'var(--text2)', wordBreak:'break-all', lineHeight:1.6 }}>{pubKey}</div>
        </div>
      )}

      <ErrorBanner message={registerDevice.error?.message} />

      {!generated
        ? <AuthBtn onClick={generate} loading={generating}>Generate Device Key</AuthBtn>
        : <AuthBtn onClick={register} loading={registerDevice.isPending}>Register &amp; Continue</AuthBtn>}
    </AuthWrap>
  )
}

// ── 6. Forgot Password — Email ────────────────────────────
export function ForgotEmailScreen() {
  const { setAuthScreen } = useAuthStore()
  const forgotPw = useForgotPassword()
  const [email, setEmail] = useState('')

  async function handleSend() {
    if (!email) return
    try {
      await forgotPw.mutateAsync(email)
      setAuthScreen('forgot-otp')
    } catch {}
  }

  return (
    <AuthWrap>
      <div className="auth-back" onClick={() => setAuthScreen('login')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </div>
      <div className="auth-heading">Reset your<br/><em>password.</em></div>
      <div className="auth-sub">We'll send a reset code to your email.</div>
      <ErrorBanner message={forgotPw.error?.message} />
      <AuthField label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <AuthBtn onClick={handleSend} disabled={!email} loading={forgotPw.isPending}>Send Reset Code</AuthBtn>
    </AuthWrap>
  )
}

// ── 7. Forgot Password — OTP ──────────────────────────────
export function ForgotOtpScreen() {
  return <OtpScreen type="forgot-password" />
}

// ── 8. New Password ───────────────────────────────────────
export function NewPasswordScreen() {
  const { setAuthScreen, pendingEmail } = useAuthStore()
  const resetPw = useResetPassword()
  const [otp,      setOtp]      = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')

  async function handleReset() {
    try {
      await resetPw.mutateAsync({ email: pendingEmail ?? '', otp, newPassword: password })
      setAuthScreen('pw-success')
    } catch {}
  }

  return (
    <AuthWrap>
      <div className="auth-back" onClick={() => setAuthScreen('forgot-otp')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
      </div>
      <div className="auth-heading">New<br/><em>password.</em></div>
      <ErrorBanner message={resetPw.error?.message} />
      <AuthField label="New Password" value={password} onChange={setPassword} showToggle placeholder="Min 8 characters" />
      <PwStrength password={password} />
      <AuthField label="Confirm Password" value={confirm} onChange={setConfirm} showToggle placeholder="Repeat password" />
      <AuthBtn onClick={handleReset} disabled={!isStrongPassword(password) || password !== confirm} loading={resetPw.isPending}>Set New Password</AuthBtn>
    </AuthWrap>
  )
}

// ── 9. Password Success ───────────────────────────────────
export function PwSuccessScreen() {
  const { setAuthScreen } = useAuthStore()
  return (
    <AuthWrap>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 0', textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:'50%', border:'2px solid var(--success)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" width={32} height={32}><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div className="auth-heading" style={{ textAlign:'center', fontSize:32 }}>All done!</div>
        <div className="auth-sub">Your password has been updated. Sign in with your new password.</div>
        <AuthBtn onClick={() => setAuthScreen('login')}>Back to Sign In</AuthBtn>
      </div>
    </AuthWrap>
  )
}

// ── Router: AuthScreen → Component ────────────────────────
export function AuthRouter() {
  const { authScreen } = useAuthStore()
  switch (authScreen) {
    case 'splash':      return <SplashScreen />
    case 'login':       return <LoginScreen />
    case 'signup-1':
    case 'signup-2':
    case 'signup-3':    return <SignupScreen />
    case 'signup-otp':  return <OtpScreen type="signup" />
    case 'device':      return <DeviceScreen />
    case 'forgot-email':return <ForgotEmailScreen />
    case 'forgot-otp':  return <ForgotOtpScreen />
    case 'new-password':return <NewPasswordScreen />
    case 'pw-success':  return <PwSuccessScreen />
    default:            return <SplashScreen />
  }
}


