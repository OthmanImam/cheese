'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — /pay/[token]
// Public page opened by anyone who receives a payment link.
// Handles: pending, paid, expired, cancelled states.
// Auth users can pay directly; others are prompted to sign up.
// ─────────────────────────────────────────────────────────
import React, { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/constants'
import { QueryProvider } from '@/providers/QueryProvider'
import { useResolvePayLink, usePayPayLink } from '@/lib/hooks/useWallet'
import { useAuthStore } from '@/lib/stores/authStore'
import { useUiStore } from '@/lib/stores/uiStore'
import { signTransaction, hashPin } from '@/lib/crypto/deviceSigning'
import type { PayLinkData } from '@/types'

// ── Exchange rate helper (standalone, no hook dependency) ──
async function fetchRate(): Promise<number> {
  try {
    const r = await fetch(`${API_BASE_URL}/rates/current`)
    const j = await r.json()
    return parseFloat(j?.data?.effectiveRate ?? '0')
  } catch {
    return 0
  }
}

function fmtUsdc(v: string | number) {
  return parseFloat(String(v)).toFixed(2)
}
function fmtNgn(usdc: number, rate: number) {
  if (!rate) return ''
  return `₦${(usdc * rate).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}

// ══════════════════════════════════════════════════════════
// PIN Modal
// ══════════════════════════════════════════════════════════
function PinModal({ onConfirm, onCancel, loading }: {
  onConfirm: (pin: string) => void
  onCancel:  () => void
  loading:   boolean
}) {
  const [pin, setPin] = useState('')

  function handleKey(k: string) {
    if (k === 'DEL') { setPin((v: string) => v.slice(0, -1)); return }
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    if (next.length === 4) onConfirm(next)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 9999,
      animation: 'slideUp 0.3s cubic-bezier(0.34, 1.1, 0.64, 1)',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#111',
        borderRadius: '24px 24px 0 0',
        padding: '28px 24px 40px',
        border: '1px solid rgba(201,168,76,0.15)',
        borderBottom: 'none',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52,
            background: 'rgba(201,168,76,0.1)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" style={{ width: 22, height: 22 }}>
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#F5F5F5', fontFamily: "'Syne', sans-serif", marginBottom: 6 }}>
            Enter your PIN
          </div>
          <div style={{ fontSize: 13, color: '#999' }}>
            Confirm payment from your Cheese Wallet
          </div>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 28 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 14, height: 14,
              borderRadius: '50%',
              background: i < pin.length ? '#C9A84C' : 'rgba(255,255,255,0.1)',
              border: i === pin.length ? '2px solid #C9A84C' : '2px solid transparent',
              transition: 'background 0.15s',
            }} />
          ))}
        </div>

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 260, margin: '0 auto 20px' }}>
          {['1','2','3','4','5','6','7','8','9','','0','DEL'].map((k, idx) => (
            <div
              key={idx}
              onClick={() => k && handleKey(k)}
              style={{
                height: 54,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: k === 'DEL' ? 16 : 22,
                fontFamily: "'DM Mono', monospace",
                color: k ? '#F5F5F5' : 'transparent',
                borderRadius: 14,
                background: k ? 'rgba(255,255,255,0.04)' : 'transparent',
                cursor: k ? 'pointer' : 'default',
                userSelect: 'none',
                transition: 'background 0.1s',
              }}
              onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => k && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onPointerUp={(e: React.PointerEvent<HTMLDivElement>) => k && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onPointerLeave={(e: React.PointerEvent<HTMLDivElement>) => k && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            >
              {k === 'DEL'
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                : k}
            </div>
          ))}
        </div>

        <button
          onClick={onCancel}
          style={{
            width: '100%', height: 46,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            color: '#666',
            fontSize: 14,
            fontFamily: "'Syne', sans-serif",
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Success animation
// ══════════════════════════════════════════════════════════
function SuccessModal({ amount, recipient, fee, onDone }: {
  amount:    string
  recipient: string
  fee:       string
  onDone:    () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 340,
        background: '#111',
        borderRadius: 28,
        padding: '40px 28px',
        border: '1px solid rgba(74,222,128,0.2)',
        textAlign: 'center',
        animation: 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Animated check */}
        <div style={{
          width: 88, height: 88,
          background: 'rgba(74,222,128,0.1)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          border: '2px solid rgba(74,222,128,0.3)',
          animation: 'glowPulse 2s ease-in-out infinite',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" style={{ width: 40, height: 40 }}>
            <polyline points="20 6 9 17 4 12" strokeDasharray="30" strokeDashoffset="0" style={{ animation: 'drawCheck 0.5s 0.2s ease-out forwards' }}/>
          </svg>
        </div>

        <div style={{ fontSize: 26, fontWeight: 700, color: '#F5F5F5', fontFamily: "'Syne', sans-serif", marginBottom: 8 }}>
          Payment Sent!
        </div>
        <div style={{ fontSize: 14, color: '#999', marginBottom: 28, lineHeight: 1.5 }}>
          Your payment to <span style={{ color: '#F5F5F5' }}>@{recipient}</span> is confirmed on the Stellar network.
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 24,
          textAlign: 'left',
        }}>
          {[
            { label: 'Amount', value: `$${amount} USDC` },
            { label: 'Platform fee', value: `$${parseFloat(fee).toFixed(4)} USDC` },
            { label: 'Network', value: 'Stellar' },
            { label: 'Status', value: '✓ Confirmed' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#666' }}>{label}</span>
              <span style={{
                fontSize: 12,
                color: label === 'Status' ? '#4ade80' : '#F5F5F5',
                fontFamily: "'DM Mono', monospace",
              }}>{value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onDone}
          style={{
            width: '100%', height: 52,
            background: 'linear-gradient(135deg, #C9A84C, #E2C06A)',
            border: 'none',
            borderRadius: 14,
            color: '#0a0904',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'Syne', sans-serif",
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Status badge states
// ══════════════════════════════════════════════════════════
function StatusPage({ status, link }: { status: 'paid' | 'expired' | 'cancelled'; link: PayLinkData }) {
  const router = useRouter()
  const configs = {
    paid: {
      icon:    '✓',
      iconBg:  'rgba(74,222,128,0.12)',
      iconColor: '#4ade80',
      title:   'Already Paid',
      body:    `This payment request was fulfilled${link.paidAt ? ` on ${new Date(link.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.`,
      sub:     link.payer ? `Paid by @${link.payer.username}` : undefined,
    },
    expired: {
      icon:    '⏰',
      iconBg:  'rgba(107,114,128,0.12)',
      iconColor: '#6b7280',
      title:   'Link Expired',
      body:    'This payment request has passed its expiry date. Ask the sender to create a new one.',
      sub:     undefined,
    },
    cancelled: {
      icon:    '✕',
      iconBg:  'rgba(248,113,113,0.12)',
      iconColor: '#f87171',
      title:   'Request Cancelled',
      body:    'The sender cancelled this payment request.',
      sub:     undefined,
    },
  }
  const c = configs[status]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center', gap: 0 }}>
      <div style={{
        width: 80, height: 80,
        background: c.iconBg,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32,
        marginBottom: 20,
      }}>
        {c.icon}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', fontFamily: "'Syne', sans-serif", marginBottom: 10 }}>
        {c.title}
      </div>
      <div style={{ fontSize: 14, color: '#999', lineHeight: 1.6, maxWidth: 280, marginBottom: c.sub ? 10 : 32 }}>
        {c.body}
      </div>
      {c.sub && (
        <div style={{ fontSize: 13, color: c.iconColor, marginBottom: 32, fontFamily: "'DM Mono', monospace" }}>
          {c.sub}
        </div>
      )}
      <button
        onClick={() => router.push('/')}
        style={{
          height: 50, padding: '0 32px',
          background: 'rgba(201,168,76,0.1)',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: 14,
          color: '#C9A84C',
          fontSize: 15,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Open Cheese Wallet
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Main PayPage component
// ══════════════════════════════════════════════════════════
function PayPageInner({ token }: { token: string }) {
  const router     = useRouter()
  const user       = useAuthStore((s: { user: import('@/types').User | null }) => s.user)
  const deviceKey  = useAuthStore((s: { deviceKey: import('@/types').DeviceKey | null }) => s.deviceKey)
  const isAuth     = useAuthStore((s: { isAuthenticated: boolean }) => s.isAuthenticated)

  const { data: link, isLoading, error } = useResolvePayLink(token)
  const { mutateAsync: payLink, isPending: paying } = usePayPayLink()

  const [ngnRate, setNgnRate]   = useState(0)
  const [showPin, setShowPin]   = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [success, setSuccess]   = useState<{ amount: string; fee: string; recipient: string } | null>(null)

  useEffect(() => {
    fetchRate().then(setNgnRate)
  }, [])

  async function handlePayNow() {
    if (!isAuth || !user) {
      // Not logged in — send to app with deep link param
      router.push(`/wallet?paytoken=${token}`)
      return
    }
    if (!deviceKey?.deviceId) {
      setPayError('Device not registered. Please open Cheese Wallet and log in first.')
      return
    }
    setPayError(null)
    setShowPin(true)
  }

  async function handlePinConfirm(pin: string) {
    if (!deviceKey?.deviceId || !link) return
    setShowPin(false)

    try {
      const pinHash = await hashPin(pin, deviceKey.deviceId)
      const { deviceSignature } = await signTransaction({
        userId:    user!.id,
        amount:    link.amountUsdc,
        recipient: link.creator.username,
        deviceId:  deviceKey.deviceId,
        action:    'send_username',
      })

      const res = await payLink({
        token,
        payload: { pinHash, deviceId: deviceKey.deviceId, deviceSignature },
      })

      setSuccess({
        amount:    fmtUsdc(link.amountUsdc),
        fee:       res.fee,
        recipient: link.creator.username,
      })
    } catch (e: any) {
      setPayError(e.message ?? 'Payment failed. Please try again.')
    }
  }

  const amount   = parseFloat(link?.amountUsdc ?? '0')
  const ngnValue = fmtNgn(amount, ngnRate)

  // ── States ────────────────────────────────────────────
  if (isLoading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(201,168,76,0.2)',
        borderTopColor: '#C9A84C',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )

  if (error || !link) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#F5F5F5', fontFamily: "'Syne', sans-serif", marginBottom: 8 }}>
        Link Not Found
      </div>
      <div style={{ fontSize: 13, color: '#999' }}>
        This payment link doesn't exist or has been removed.
      </div>
    </div>
  )

  if (link.status === 'paid')      return <StatusPage status="paid"      link={link} />
  if (link.status === 'expired')   return <StatusPage status="expired"   link={link} />
  if (link.status === 'cancelled') return <StatusPage status="cancelled" link={link} />

  // ── Pending — the main pay view ───────────────────────
  const expiryDiff = new Date(link.expiresAt).getTime() - Date.now()
  const expiryH    = Math.floor(expiryDiff / 3_600_000)
  const expiryStr  = expiryH < 24 ? `${expiryH}h` : `${Math.floor(expiryH / 24)}d`

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
        {/* Creator card */}
        <div style={{
          background: 'rgba(201,168,76,0.06)',
          border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: 20,
          padding: '24px 20px',
          marginBottom: 16,
          textAlign: 'center',
          animation: 'fadeUp 0.4s ease',
        }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #C9A84C, #A8822C)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            fontSize: 26,
            fontWeight: 700,
            color: '#0a0904',
            fontFamily: "'Syne', sans-serif",
          }}>
            {link.creator.username[0].toUpperCase()}
          </div>

          <div style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5', fontFamily: "'Syne', sans-serif" }}>
            {link.creator.fullName}
          </div>
          <div style={{ fontSize: 13, color: '#C9A84C', fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
            @{link.creator.username}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            is requesting payment
          </div>
        </div>

        {/* Amount card */}
        <div style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          padding: '24px 20px',
          marginBottom: 16,
          animation: 'fadeUp 0.4s 0.08s ease both',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Amount Requested
            </div>
            <div style={{ fontSize: 44, fontFamily: "'DM Mono', monospace", fontWeight: 300, color: '#F5F5F5', lineHeight: 1 }}>
              ${fmtUsdc(link.amountUsdc)}
            </div>
            <div style={{ fontSize: 14, color: '#666', marginTop: 6, fontFamily: "'DM Mono', monospace" }}>
              USDC {ngnValue && <span style={{ color: '#C9A84C' }}>· {ngnValue}</span>}
            </div>
          </div>

          {link.note && (
            <div style={{
              marginTop: 18,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Note
              </div>
              <div style={{ fontSize: 14, color: '#F5F5F5', lineHeight: 1.5 }}>
                "{link.note}"
              </div>
            </div>
          )}

          {/* Expiry pill */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, color: expiryH < 6 ? '#f87171' : '#666',
              background: expiryH < 6 ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.04)',
              padding: '5px 12px', borderRadius: 20,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 12, height: 12 }}>
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Expires in {expiryStr}
            </div>
          </div>
        </div>

        {/* Fee note */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10,
          marginBottom: 16,
          animation: 'fadeUp 0.4s 0.16s ease both',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" style={{ width: 14, height: 14, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize: 11, color: '#555', lineHeight: 1.4 }}>
            A 0.1% platform fee applies on top of this amount, deducted from your Cheese Wallet.
          </span>
        </div>

        {payError && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 12,
            color: '#f87171',
            fontSize: 13,
            marginBottom: 16,
            animation: 'fadeUp 0.3s ease',
          }}>
            {payError}
          </div>
        )}
      </div>

      {/* Pay button area */}
      <div style={{ padding: '16px 20px 40px', animation: 'fadeUp 0.4s 0.2s ease both' }}>
        {isAuth ? (
          <button
            onClick={handlePayNow}
            disabled={paying}
            style={{
              width: '100%', height: 56,
              background: paying ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg, #C9A84C 0%, #E2C06A 100%)',
              border: 'none', borderRadius: 16,
              color: '#0a0904',
              fontSize: 17,
              fontWeight: 700,
              fontFamily: "'Syne', sans-serif",
              cursor: paying ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: paying ? 'none' : '0 8px 24px rgba(201,168,76,0.25)',
              transition: 'all 0.2s',
            }}
          >
            {paying
              ? <>
                  <div style={{ width: 20, height: 20, border: '2px solid rgba(10,9,4,0.3)', borderTopColor: '#0a0904', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Processing…
                </>
              : <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Pay ${fmtUsdc(link.amountUsdc)} USDC
                </>
            }
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => router.push(`/wallet?paytoken=${token}`)}
              style={{
                width: '100%', height: 56,
                background: 'linear-gradient(135deg, #C9A84C 0%, #E2C06A 100%)',
                border: 'none', borderRadius: 16,
                color: '#0a0904', fontSize: 16,
                fontWeight: 700, fontFamily: "'Syne', sans-serif",
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(201,168,76,0.25)',
              }}
            >
              Sign in to Pay
            </button>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#555' }}>
              Don't have an account?{' '}
              <a href="/wallet" style={{ color: '#C9A84C', textDecoration: 'none' }}>
                Download Cheese Wallet
              </a>
            </div>
          </div>
        )}
      </div>

      {/* PIN modal */}
      {showPin && (
        <PinModal
          onConfirm={handlePinConfirm}
          onCancel={() => setShowPin(false)}
          loading={paying}
        />
      )}

      {/* Success modal */}
      {success && (
        <SuccessModal
          amount={success.amount}
          recipient={success.recipient}
          fee={success.fee}
          onDone={() => router.push('/wallet')}
        />
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════
// Page shell — Cheese branding + provider wrapper
// ══════════════════════════════════════════════════════════
export default function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  return (
    <QueryProvider>
      <div style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Syne', sans-serif",
      }}>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Mono:wght@300;400&family=Syne:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />

        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0 }
          @keyframes spin    { to { transform: rotate(360deg) } }
          @keyframes popIn   { from { transform: scale(0.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
          @keyframes fadeUp  { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
          @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
          @keyframes glowPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.3) }
            50%       { box-shadow: 0 0 0 12px rgba(74,222,128,0) }
          }
          @keyframes drawCheck {
            from { stroke-dashoffset: 30 }
            to   { stroke-dashoffset: 0  }
          }
          input { font-family: inherit }
          button { font-family: inherit }
        `}</style>

        {/* Phone frame */}
        <div style={{
          width: '100%',
          maxWidth: 430,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0A0A0A',
        }}>
          {/* Header bar */}
          <div style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #C9A84C, #A8822C)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>
                🧀
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#F5F5F5', letterSpacing: '-0.01em' }}>Cheese Wallet</div>
                <div style={{ fontSize: 10, color: '#666', letterSpacing: '0.06em' }}>PAYMENT REQUEST</div>
              </div>
            </div>

            {/* Secured badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, color: '#4ade80',
              background: 'rgba(74,222,128,0.08)',
              border: '1px solid rgba(74,222,128,0.15)',
              padding: '4px 10px', borderRadius: 20,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 12, height: 12 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Secured
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <PayPageInner token={token} />
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 20px 24px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#333' }}>
              Powered by{' '}
              <a href="/" style={{ color: '#666', textDecoration: 'none' }}>Cheese Wallet</a>
              {' '}· Stellar Network · USDC
            </div>
          </div>
        </div>
      </div>
    </QueryProvider>
  )
}
