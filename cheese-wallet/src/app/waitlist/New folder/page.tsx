'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter }                    from 'next/navigation'
import Link                             from 'next/link'
// if you need base URL outside of axios instance, derive from env
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// ── Types ────────────────────────────────────────────────────
type Step = 'form' | 'success'
type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'error'

// ── Helpers ─────────────────────────────────────────────────
function sanitiseUsername(v: string) {
  return v.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '')
}

// ── Page ─────────────────────────────────────────────────────
export default function WaitlistPage() {
  const router = useRouter()
  const [step, setStep]           = useState<Step>('form')
  const [email, setEmail]         = useState('')
  const [username, setUsername]   = useState('')
  const [avail, setAvail]         = useState<Availability>('idle')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [position, setPosition]   = useState<number | null>(null)
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Username availability check (debounced 500ms) ─────────
  useEffect(() => {
    if (username.length < 3) { setAvail('idle'); return }
    setAvail('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/waitlist/check/${username}`)
        const data = await res.json()
        setAvail(data?.data?.available ? 'available' : 'taken')
      } catch {
        setAvail('error')
      }
    }, 500)
  }, [username])

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email) { setError('Please enter your email address.'); return }
    if (username.length < 3) { setError('Username must be at least 3 characters.'); return }
    if (avail === 'taken') { setError('That username is already reserved. Try another.'); return }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/waitlist/join`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, username }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data?.message ?? data?.error ?? 'Something went wrong. Please try again.'
        setError(Array.isArray(msg) ? msg[0] : msg)
        return
      }
      setPosition(data?.data?.position ?? null)
      setStep('success')
    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Availability indicator ─────────────────────────────────
  function AvailBadge() {
    if (username.length < 3 || avail === 'idle') return null
    if (avail === 'checking') return (
      <span style={badge('#888', 'rgba(255,255,255,0.06)')}>
        <span style={spin} /> Checking…
      </span>
    )
    if (avail === 'available') return (
      <span style={badge('#4ade80', 'rgba(74,222,128,0.1)')}>✓ Available</span>
    )
    if (avail === 'taken') return (
      <span style={badge('#f87171', 'rgba(248,113,113,0.1)')}>✗ Already taken</span>
    )
    return null
  }

  // ── Success state ─────────────────────────────────────────
  if (step === 'success') {
    return (
      <main style={pageWrap}>
        <Nav />
        <div style={cardWrap}>
          <div style={{ ...card, textAlign: 'center', padding: '56px 40px' }}>
            <div style={successIcon}>🧀</div>
            <h1 style={{ ...h1, fontSize: 32, marginBottom: 12 }}>
              You&apos;re in.
            </h1>
            <p style={{ ...sub, maxWidth: 340, margin: '0 auto 8px' }}>
              <strong style={{ color: '#C9A84C' }}>@{username}</strong> is reserved for you.
              We&apos;ll email <strong style={{ color: '#F5F5F5' }}>{email}</strong> the moment Cheese launches.
            </p>
            {position && (
              <div style={positionBadge}>
                #{position.toLocaleString()} in line
              </div>
            )}
            <p style={{ ...sub, fontSize: 13, color: '#555', margin: '20px auto 0', maxWidth: 320 }}>
              Share your link to move up the list and unlock early perks.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/waitlist`
                  navigator.clipboard?.writeText(`${url}?ref=${username}`)
                    .catch(() => {})
                }}
                style={btnSecondary}
              >
                Copy Referral Link
              </button>
              <Link href="/" style={{ ...btnGold, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                Back to Home
              </Link>
            </div>
          </div>
        </div>
        <BgGlow />
      </main>
    )
  }

  // ── Form state ────────────────────────────────────────────
  return (
    <main style={pageWrap}>
      <Nav />
      <div style={cardWrap}>
        <div style={card}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={spotsBar}>
              <span style={blinkDot} />
              Only 5,000 name reservations available
            </div>
            <h1 style={h1}>Reserve your name.</h1>
            <p style={sub}>
              Claim your @username before launch. Free forever — no card needed.
              Be first in line when Cheese goes live.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={label}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tunde@example.com"
                autoComplete="email"
                required
                style={input}
              />
            </div>

            {/* Username */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ ...label, marginBottom: 0 }}>Reserve a username</label>
                <AvailBadge />
              </div>
              <div style={{ position: 'relative' }}>
                <span style={atSign}>@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(sanitiseUsername(e.target.value))}
                  placeholder="your_username"
                  autoComplete="username"
                  maxLength={20}
                  style={{ ...input, paddingLeft: 36,
                    borderColor: avail === 'available' ? 'rgba(74,222,128,0.4)'
                               : avail === 'taken'     ? 'rgba(248,113,113,0.4)'
                               : 'rgba(255,255,255,0.08)',
                  }}
                />
              </div>
              <div style={hint}>3–20 chars · letters, numbers, underscores</div>
            </div>

            {/* Error */}
            {error && (
              <div style={errorBox}>{error}</div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || avail === 'taken' || avail === 'checking'}
              style={{
                ...btnGold,
                width: '100%',
                height: 54,
                fontSize: 16,
                marginTop: 4,
                opacity: (loading || avail === 'taken' || avail === 'checking') ? 0.5 : 1,
                cursor: (loading || avail === 'taken' || avail === 'checking') ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Reserving…' : 'Reserve My Name →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#444', marginTop: 4 }}>
              Free · No credit card · You&apos;ll be first to know at launch
            </p>
          </form>
        </div>

        {/* Perks below form */}
        <div style={perksRow}>
          {[
            ['🔒', 'Your name is locked in'],
            ['⚡', 'First access at launch'],
            ['💰', 'Early adopter perks'],
          ].map(([icon, text]) => (
            <div key={text} style={perkItem}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 13, color: '#666' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
      <BgGlow />
    </main>
  )
}

// ── Sub-components ───────────────────────────────────────────
function Nav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      padding: '18px 6%',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <div style={{
          width: 32, height: 32, background: 'linear-gradient(135deg,#C9A84C,#A8822C)',
          borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>🧀</div>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#F5F5F5', letterSpacing: '-0.01em' }}>
          CHEESE
        </span>
      </Link>
      <Link href="/" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>
        ← Back to home
      </Link>
    </nav>
  )
}

function BgGlow() {
  return (
    <>
      <div style={{
        position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', right: '-10%',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
    </>
  )
}

// ── Styles ───────────────────────────────────────────────────
const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0A0A0A',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '100px 16px 48px',
  position: 'relative',
  fontFamily: "'Syne', 'Inter', sans-serif",
}
const cardWrap: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  position: 'relative',
  zIndex: 1,
}
const card: React.CSSProperties = {
  background: '#141414',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 24,
  padding: '40px 36px',
  boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
}
const h1: React.CSSProperties = {
  fontSize: 38,
  fontWeight: 800,
  color: '#F5F5F5',
  letterSpacing: '-0.03em',
  lineHeight: 1.1,
  marginBottom: 14,
}
const sub: React.CSSProperties = {
  fontSize: 15,
  color: '#666',
  lineHeight: 1.6,
  marginBottom: 0,
}
const spotsBar: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  color: '#C9A84C',
  background: 'rgba(201,168,76,0.08)',
  border: '1px solid rgba(201,168,76,0.15)',
  borderRadius: 20,
  padding: '5px 14px',
  marginBottom: 20,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}
const blinkDot: React.CSSProperties = {
  width: 6, height: 6,
  borderRadius: '50%',
  background: '#C9A84C',
  display: 'inline-block',
  animation: 'pulse 2s infinite',
}
const label: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#999',
  marginBottom: 8,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}
const input: React.CSSProperties = {
  width: '100%',
  height: 52,
  background: '#1A1A1A',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  padding: '0 16px',
  color: '#F5F5F5',
  fontSize: 15,
  outline: 'none',
  fontFamily: "'Syne', sans-serif",
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
}
const atSign: React.CSSProperties = {
  position: 'absolute',
  left: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#666',
  fontSize: 16,
  pointerEvents: 'none',
  zIndex: 1,
}
const hint: React.CSSProperties = {
  fontSize: 11,
  color: '#444',
  marginTop: 6,
  letterSpacing: '0.03em',
}
const errorBox: React.CSSProperties = {
  background: 'rgba(248,113,113,0.08)',
  border: '1px solid rgba(248,113,113,0.2)',
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 13,
  color: '#f87171',
  lineHeight: 1.5,
}
const btnGold: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#C9A84C',
  color: '#0A0904',
  border: 'none',
  borderRadius: 14,
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
  transition: 'opacity 0.2s',
  padding: '0 24px',
  height: 46,
}
const btnSecondary: React.CSSProperties = {
  height: 46,
  padding: '0 20px',
  background: '#1A1A1A',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  color: '#F5F5F5',
  fontSize: 14,
  fontFamily: "'Syne', sans-serif",
  cursor: 'pointer',
}
const successIcon: React.CSSProperties = {
  width: 80, height: 80,
  background: 'rgba(201,168,76,0.1)',
  border: '1px solid rgba(201,168,76,0.25)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 36,
  margin: '0 auto 24px',
}
const positionBadge: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 16,
  padding: '8px 20px',
  background: 'rgba(201,168,76,0.1)',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: 20,
  fontSize: 15,
  fontWeight: 700,
  color: '#C9A84C',
  fontFamily: "'DM Mono', monospace",
}
const perksRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-around',
  marginTop: 20,
  padding: '0 8px',
}
const perkItem: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
}
function badge(color: string, bg: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 600,
    color, background: bg,
    border: `1px solid ${color}40`,
    borderRadius: 20, padding: '3px 10px',
    fontFamily: "'Syne', sans-serif",
    letterSpacing: '0.03em',
  }
}
const spin: React.CSSProperties = {
  display: 'inline-block',
  width: 8, height: 8,
  border: '1.5px solid currentColor',
  borderTopColor: 'transparent',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite',
}
