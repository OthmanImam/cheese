'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Shared Layout Components
// ─────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useUiStore, type AppView } from '@/lib/stores/uiStore'

// ── Status Bar ────────────────────────────────────────────
export function StatusBar() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 30_000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="status-bar">
      <span className="time">{time || '9:41'}</span>
      <div className="status-icons">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1.5 8.5C5.5 4.5 10.5 2.5 12 2.5s6.5 2 10.5 6"/>
          <path d="M5 12c2-2 4.5-3.5 7-3.5s5 1.5 7 3.5"/>
          <path d="M8.5 15.5c1-1 2-1.5 3.5-1.5s2.5.5 3.5 1.5"/>
          <circle cx="12" cy="19" r="1" fill="currentColor"/>
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="7" width="16" height="10" rx="2"/>
          <path d="M22 11v2" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  )
}

// ── Bottom Nav ────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'home' as AppView, label: 'Home', icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
  { id: 'send' as AppView, label: 'Send', icon: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></> },
  { id: 'cards' as AppView, label: 'Wallet', icon: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></> },
  { id: 'history' as AppView, label: 'Activity', icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/> },
  { id: 'profile' as AppView, label: 'Me', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
]

export function BottomNav() {
  const { activeView, goTo } = useUiStore()
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ id, label, icon }) => (
        <div
          key={id}
          className={`nav-btn${activeView === id ? ' active' : ''}`}
          onClick={() => goTo(id)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
          <span>{label}</span>
          <div className="nav-dot" />
        </div>
      ))}
    </nav>
  )
}

// ── Screen Header ─────────────────────────────────────────
interface ScreenHeaderProps {
  title?: string
  onBack?: () => void
  right?: React.ReactNode
  hideBack?: boolean
}
export function ScreenHeader({ title, onBack, right, hideBack }: ScreenHeaderProps) {
  return (
    <div className="screen-header">
      {!hideBack ? (
        <div className="btn-icon" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="15 18 9 12 15 6"/></svg>
        </div>
      ) : <div style={{ width: 36 }} />}
      {title && <span className="screen-title">{title}</span>}
      {right ?? <div style={{ width: 36 }} />}
    </div>
  )
}

// ── Icon Btn ──────────────────────────────────────────────
export function IconBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return <div className="btn-icon" onClick={onClick}>{children}</div>
}

// ── Toast ─────────────────────────────────────────────────
export function Toast() {
  const { toast, hideToast } = useUiStore()
  useEffect(() => {
    if (!toast.visible) return
    const id = setTimeout(hideToast, 2800)
    return () => clearTimeout(id)
  }, [toast.visible, toast.title])
  return (
    <div className={`toast${toast.visible ? ' show' : ''}`} id="toast">
      <div className="toast-dot" />
      <div>
        <div id="toastTitle">{toast.title}</div>
        <div id="toastSub">{toast.message}</div>
      </div>
    </div>
  )
}

// ── Auth Step Progress ────────────────────────────────────
export function AuthSteps({ total, current }: { total: number; current: number }) {
  return (
    <div className="auth-steps">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`auth-step-bar${i < current ? ' done' : i === current ? ' active' : ''}`}
        />
      ))}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: '2px solid rgba(201,168,76,0.15)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite' }} />
  )
}

// ── Theme Toggle Btn ──────────────────────────────────────
const MOON = <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
const SUN  = <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>

export function ThemeToggle() {
  const { theme, toggleTheme } = useUiStore()
  return (
    <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {theme === 'dark' ? MOON : SUN}
      </svg>
    </button>
  )
}

// ── Amount Numpad ─────────────────────────────────────────
interface NumpadProps {
  value: string
  onChange: (v: string) => void
  currency?: string
  subLabel?: string
  allowDecimal?: boolean
}

export function AmountNumpad({ value, onChange, currency = '$', subLabel, allowDecimal = true }: NumpadProps) {
  function handle(k: string) {
    if (k === 'DEL') { onChange(value.slice(0, -1)); return }
    if (k === '.' && (!allowDecimal || value.includes('.'))) return
    if (k === '.' && !value) { onChange('0.'); return }
    // Max 2 decimal places
    const dotIdx = value.indexOf('.')
    if (dotIdx !== -1 && value.length - dotIdx > 2) return
    // No leading zeros
    const next = value === '0' && k !== '.' ? k : value + k
    onChange(next)
  }
  const num = parseFloat(value || '0')
  return (
    <div className="send-amount-section">
      <div className="amount-display">
        <span className="currency">{currency}</span>
        <span>{value || '0'}</span>
      </div>
      {subLabel && <div className="amount-sub">{subLabel}</div>}
      <div className="numpad">
        {['1','2','3','4','5','6','7','8','9','.','0','DEL'].map((k) => (
          <div
            key={k}
            className={`numpad-key${k === 'DEL' ? ' del' : k === '.' ? ' dot' : ''}`}
            onClick={() => handle(k)}
          >
            {k === 'DEL'
              ? <svg viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
              : k === '.' ? '·' : k}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Pin Pad ───────────────────────────────────────────────
interface PinPadProps {
  value: string
  onChange: (v: string) => void
  onComplete?: (pin: string) => void
  error?: boolean
  label?: string
  length?: number
}

export function PinPad({ value, onChange, onComplete, error, label = 'Enter 4-digit PIN', length = 4 }: PinPadProps) {
  function handle(k: string) {
    if (k === 'DEL') { onChange(value.slice(0, -1)); return }
    if (value.length >= length) return
    const next = value + k
    onChange(next)
    if (next.length === length) setTimeout(() => onComplete?.(next), 120)
  }
  const keys = [
    { k:'1',sub:'' },{ k:'2',sub:'ABC' },{ k:'3',sub:'DEF' },
    { k:'4',sub:'GHI' },{ k:'5',sub:'JKL' },{ k:'6',sub:'MNO' },
    { k:'7',sub:'PQRS' },{ k:'8',sub:'TUV' },{ k:'9',sub:'WXYZ' },
    { k:'',sub:'' },{ k:'0',sub:'' },{ k:'DEL',sub:'' },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'100%' }}>
      {label && <div className="send-pin-hint">{label}</div>}
      <div className="applock-dots" style={{ margin:'16px 0 24px' }}>
        {Array.from({ length }).map((_,i) => (
          <div key={i} className={`applock-dot${i < value.length ? (error ? ' error' : ' filled') : ''}`} />
        ))}
      </div>
      <div className="applock-numpad" style={{ maxWidth:280 }}>
        {keys.map(({ k, sub }, i) => k ? (
          <div key={i} className="aln" onClick={() => handle(k)}>
            {k === 'DEL'
              ? <svg viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
              : <><div className="aln-num">{k}</div>{sub && <div className="aln-abc">{sub}</div>}</>}
          </div>
        ) : <div key={i} />)}
      </div>
    </div>
  )
}

// ── OTP Boxes ─────────────────────────────────────────────
export function OtpBoxes({ value, length = 6 }: { value: string; length?: number }) {
  return (
    <div className="otp-row" style={{ justifyContent:'center', gap:10, marginBottom:24 }}>
      {Array.from({ length }).map((_,i) => (
        <div key={i} className={`otp-box${i < value.length ? ' filled' : ''}${i === value.length ? ' active' : ''}`}>
          {value[i] || ''}
        </div>
      ))}
    </div>
  )
}

// ── Error Banner ──────────────────────────────────────────
export function ErrorBanner({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  if (!message) return null
  return (
    <div style={{ background:'rgba(184,85,85,0.1)', border:'1px solid rgba(184,85,85,0.25)', borderRadius:12, padding:'14px 16px', margin:'0 0 14px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
      <span style={{ fontSize:13, color:'var(--danger)', flex:1 }}>{message}</span>
      {onRetry && <button onClick={onRetry} style={{ background:'none', border:'1px solid rgba(184,85,85,0.3)', borderRadius:8, padding:'6px 12px', color:'var(--danger)', fontSize:12, cursor:'pointer' }}>Retry</button>}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────
export function SkeletonBalance() {
  return <div style={{ padding:'8px 0' }}>
    <div className="skel skel-text" style={{ width:80, marginBottom:6 }} />
    <div className="skel skel-bal" />
    <div className="skel skel-sub" />
  </div>
}

export function SkeletonTxList({ count=4 }: { count?: number }) {
  return <div style={{ padding:'8px 0' }}>
    {Array.from({ length:count }).map((_,i) => <div key={i} className="skel skel-tx" style={{ marginBottom:10 }} />)}
  </div>
}

// ── Empty State ───────────────────────────────────────────
export function EmptyState({ icon, title, sub, ctaLabel, onCta }: { icon:React.ReactNode; title:string; sub:string; ctaLabel?:string; onCta?:() => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
      {ctaLabel && <button className="empty-cta" onClick={onCta}>{ctaLabel}</button>}
    </div>
  )
}

// ── Auth Field ────────────────────────────────────────────
interface AuthFieldProps {
  label: string; type?: string; value: string; onChange: (v: string) => void
  placeholder?: string; icon?: React.ReactNode; maxLength?: number; disabled?: boolean; showToggle?: boolean
}
export function AuthField({ label, type='text', value, onChange, placeholder, icon, maxLength, disabled, showToggle }: AuthFieldProps) {
  const [show, setShow] = useState(false)
  return (
    <div className="auth-field">
      {icon}
      <div className="auth-field-inner">
        <div className="auth-field-label">{label}</div>
        <input type={showToggle ? (show ? 'text' : 'password') : type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} disabled={disabled} autoComplete="off" />
      </div>
      {showToggle && <button className="auth-field-action" type="button" onClick={() => setShow(s => !s)}>{show ? 'Hide' : 'Show'}</button>}
    </div>
  )
}

// ── Password Strength ─────────────────────────────────────
function strengthOf(pw: string) {
  let s = 0
  if (pw.length >= 8) s++; if (/[A-Z]/.test(pw)) s++; if (/\d/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++
  return [{ label:'',color:'transparent',pct:'0%' },{ label:'Weak',color:'#b85555',pct:'25%' },{ label:'Fair',color:'#c9954c',pct:'50%' },{ label:'Good',color:'#c9a84c',pct:'75%' },{ label:'Strong',color:'#5a9e6f',pct:'100%' }][s]
}
export function isStrongPassword(pw: string) { return (pw.length>=8&&/[A-Z]/.test(pw)&&/\d/.test(pw)) }
export function PwStrength({ password }: { password: string }) {
  if (!password) return null
  const { label, color, pct } = strengthOf(password)
  return <div style={{ marginBottom:14 }}>
    <div className="pw-strength-bar"><div className="pw-strength-fill" style={{ width:pct, background:color, transition:'all 0.3s' }} /></div>
    <div className="pw-strength-label" style={{ color }}>{label}</div>
  </div>
}

// ── Info Chip ─────────────────────────────────────────────
export function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-info-chip">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p>{children}</p>
    </div>
  )
}

// ── Auth Primary Button ───────────────────────────────────
export function AuthBtn({ children, onClick, disabled, loading, outline }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; outline?: boolean }) {
  return (
    <button className={`auth-btn${outline ? ' outline' : ''}`} onClick={onClick} disabled={disabled || loading}>
      {loading ? <Spinner size={18} /> : children}
    </button>
  )
}
