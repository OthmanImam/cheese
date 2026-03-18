'use client'

// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Reusable UI Primitives
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

// ── OTP Input ─────────────────────────────────────────────
interface OtpInputProps {
  length?: number
  value: string
  onChange: (v: string) => void
  prefix?: string  // for unique element IDs
}

export function OtpInput({ length = 6, value, onChange, prefix = 'otp' }: OtpInputProps) {
  const digits = value.split('')

  function handleKey(k: string) {
    if (k === 'DEL') {
      onChange(value.slice(0, -1))
      return
    }
    if (!/^\d$/.test(k)) return
    if (value.length >= length) return
    onChange(value + k)
  }

  return (
    <div>
      <div className="otp-row" style={{ justifyContent: 'center', gap: 10, marginBottom: 24 }}>
        {Array.from({ length }).map((_, i) => (
          <div
            key={`${prefix}-${i}`}
            className={`otp-box${i < digits.length ? ' filled' : ''}${i === digits.length ? ' active' : ''}`}
          >
            {digits[i] || ''}
          </div>
        ))}
      </div>
      <div className="numpad" style={{ maxWidth: 280, margin: '0 auto' }}>
        {['1','2','3','4','5','6','7','8','9','.','0','DEL'].map((k) => (
          <div
            key={k}
            className={`numpad-key${k === 'DEL' ? ' del' : k === '.' ? ' dot' : ''}`}
            onClick={() => handleKey(k === '.' ? 'DEL' : k)}
          >
            {k === 'DEL'
              ? <svg viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
              : k === '.'
              ? '⌫'
              : k}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PIN Pad ───────────────────────────────────────────────
interface PinPadProps {
  length?: number
  value: string
  onChange: (v: string) => void
  onComplete?: (pin: string) => void
  error?: boolean
  label?: string
}

export function PinPad({ length = 4, value, onChange, onComplete, error, label }: PinPadProps) {
  function handleKey(k: string) {
    if (k === 'DEL') { onChange(value.slice(0, -1)); return }
    if (value.length >= length) return
    const next = value + k
    onChange(next)
    if (next.length === length) onComplete?.(next)
  }

  const numKeys = [
    { k: '1', sub: '' }, { k: '2', sub: 'ABC' }, { k: '3', sub: 'DEF' },
    { k: '4', sub: 'GHI' }, { k: '5', sub: 'JKL' }, { k: '6', sub: 'MNO' },
    { k: '7', sub: 'PQRS' }, { k: '8', sub: 'TUV' }, { k: '9', sub: 'WXYZ' },
    { k: '', sub: '' }, { k: '0', sub: '' }, { k: 'DEL', sub: '' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {label && <div className="send-pin-hint">{label}</div>}
      <div className="applock-dots" style={{ margin: '16px 0 24px' }}>
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`applock-dot${i < value.length ? (error ? ' error' : ' filled') : ''}`}
          />
        ))}
      </div>
      <div className="applock-numpad" style={{ maxWidth: 280 }}>
        {numKeys.map(({ k, sub }, i) =>
          k ? (
            <div key={i} className="aln" onClick={() => handleKey(k)}>
              {k === 'DEL'
                ? <svg viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                : <><div className="aln-num">{k}</div>{sub && <div className="aln-abc">{sub}</div>}</>}
            </div>
          ) : (
            <div key={i} />
          )
        )}
      </div>
    </div>
  )
}

// ── Password Strength ─────────────────────────────────────
function calcStrength(pw: string): { score: number; label: string; color: string; pct: string } {
  let s = 0
  if (pw.length >= 8)     s++
  if (/[A-Z]/.test(pw))   s++
  if (/\d/.test(pw))      s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const map = [
    { label: '', color: 'transparent', pct: '0%' },
    { label: 'Weak',   color: '#b85555', pct: '25%' },
    { label: 'Fair',   color: '#c9954c', pct: '50%' },
    { label: 'Good',   color: '#c9a84c', pct: '75%' },
    { label: 'Strong', color: '#5a9e6f', pct: '100%' },
  ]
  return { score: s, ...map[s] }
}

interface PwStrengthProps { password: string }
export function PwStrength({ password }: PwStrengthProps) {
  const { label, color, pct } = calcStrength(password)
  if (!password) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="pw-strength-bar">
        <div className="pw-strength-fill" style={{ width: pct, background: color, transition: 'all 0.3s' }} />
      </div>
      <div className="pw-strength-label" style={{ color }}>{label}</div>
    </div>
  )
}

export function isPasswordStrong(pw: string) { return calcStrength(pw).score >= 3 }

// ── Skeleton Loader ───────────────────────────────────────
export function SkeletonBalance() {
  return (
    <div style={{ padding: '8px 0' }}>
      <div className="skel skel-text" style={{ width: 80, marginBottom: 6 }} />
      <div className="skel skel-bal" />
      <div className="skel skel-sub" />
    </div>
  )
}

export function SkeletonTxList({ count = 4 }: { count?: number }) {
  return (
    <div style={{ padding: '8px 0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skel skel-tx" style={{ marginBottom: 10 }} />
      ))}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  sub: string
  ctaLabel?: string
  onCta?: () => void
}

export function EmptyState({ icon, title, sub, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
      {ctaLabel && <button className="empty-cta" onClick={onCta}>{ctaLabel}</button>}
    </div>
  )
}

// ── Error Banner ──────────────────────────────────────────
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{
      background: 'rgba(184,85,85,0.1)', border: '1px solid rgba(184,85,85,0.25)',
      borderRadius: 12, padding: '14px 16px', margin: '0 0 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <span style={{ fontSize: 13, color: 'var(--danger)', flex: 1 }}>{message}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: 'none', border: '1px solid rgba(184,85,85,0.3)', borderRadius: 8,
          padding: '6px 12px', color: 'var(--danger)', fontSize: 12, cursor: 'pointer',
        }}>Retry</button>
      )}
    </div>
  )
}

// ── Auth Field ────────────────────────────────────────────
interface AuthFieldProps {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  icon?: React.ReactNode
  maxLength?: number
  disabled?: boolean
  showToggle?: boolean  // for password fields
}

export function AuthField({ label, type = 'text', value, onChange, placeholder, icon, maxLength, disabled, showToggle }: AuthFieldProps) {
  const [show, setShow] = useState(false)
  const inputType = showToggle ? (show ? 'text' : 'password') : type

  return (
    <div className="auth-field">
      {icon && icon}
      <div className="auth-field-inner">
        <div className="auth-field-label">{label}</div>
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      {showToggle && (
        <button className="auth-field-action" type="button" onClick={() => setShow(s => !s)}>
          {show ? 'Hide' : 'Show'}
        </button>
      )}
    </div>
  )
}

// ── Countdown Timer ───────────────────────────────────────
export function useCountdown(from: number, active: boolean) {
  const [secs, setSecs] = useState(from)
  useEffect(() => {
    if (!active) return
    setSecs(from)
    const id = setInterval(() => setSecs(s => { if (s <= 1) { clearInterval(id); return 0 } return s - 1 }), 1000)
    return () => clearInterval(id)
  }, [active, from])
  return secs
}
