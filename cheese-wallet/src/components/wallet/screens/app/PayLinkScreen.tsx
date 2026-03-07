'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — PayLink Screen
// Flow: Form → Generated Link Card → My Requests list
// ─────────────────────────────────────────────────────────
import { useState, useCallback }  from 'react'
import { useUiStore }             from '@/lib/stores/uiStore'
import { useAuthStore }           from '@/lib/stores/authStore'
import {
  useCreatePayLink,
  useMyPayLinks,
  useCancelPayLink,
}                                 from '@/lib/hooks/useWallet'
import { useExchangeRate }        from '@/lib/hooks/useBanks'
import { ScreenHeader, ErrorBanner } from '../../shared/UI'
import type { CreatePayLinkResponse, PayLinkData } from '@/types'

// ── Helpers ────────────────────────────────────────────────
function fmtUsdc(v: string | number) {
  return `$${parseFloat(String(v)).toFixed(2)}`
}
function fmtNgn(usdc: number, rate: number) {
  return `₦${(usdc * rate).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}
function timeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3_600_000)
  if (h < 24) return `${h}h left`
  return `${Math.floor(h / 24)}d left`
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#C9A84C', bg: 'rgba(201,168,76,0.12)'  },
  paid:      { label: 'Paid',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  expired:   { label: 'Expired',   color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  cancelled: { label: 'Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

// ══════════════════════════════════════════════════════════
// STEP 1 — Request Form
// ══════════════════════════════════════════════════════════
function PaymentRequestForm({ onCreated }: { onCreated: (r: CreatePayLinkResponse) => void }) {
  const [amount, setAmount]   = useState('')
  const [note, setNote]       = useState('')
  const [error, setError]     = useState<string | null>(null)
  const { mutateAsync, isPending } = useCreatePayLink()
  const { data: rate }        = useExchangeRate()
  const ngnRate               = parseFloat(rate?.effectiveRate ?? '0')

  const numericAmount = parseFloat(amount || '0')
  const hasAmount     = numericAmount >= 0.01

  function handleKey(k: string) {
    setError(null)
    if (k === 'DEL') {
      setAmount((v: string) => v.slice(0, -1))
      return
    }
    if (k === '.' && amount.includes('.')) return
    if (k === '.' && amount === '') { setAmount('0.'); return }
    if (amount.includes('.') && amount.split('.')[1].length >= 2) return
    if (!amount && k === '0') { setAmount('0'); return }
    setAmount((v: string) => v + k)
  }

  async function handleCreate() {
    if (!hasAmount) { setError('Enter an amount to request'); return }
    if (numericAmount > 50_000) { setError('Maximum request is $50,000 USDC'); return }
    try {
      const res = await mutateAsync({
        amountUsdc:     numericAmount.toFixed(2),
        note:           note.trim() || undefined,
        expiresInHours: 168,
      })
      onCreated(res)
    } catch (e: any) {
      setError(e.message ?? 'Failed to create payment request')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
        {/* Amount display */}
        <div style={{
          textAlign: 'center',
          padding: '28px 0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: amount ? 48 : 40,
            fontFamily: "'DM Mono', monospace",
            fontWeight: 300,
            color: amount ? 'var(--text)' : 'rgba(255,255,255,0.2)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            minHeight: 56,
            transition: 'font-size 0.15s',
          }}>
            {amount ? `$${amount}` : '$0.00'}
          </div>
          {hasAmount && ngnRate > 0 && (
            <div style={{
              marginTop: 8,
              fontSize: 14,
              color: 'var(--gold)',
              fontFamily: "'DM Mono', monospace",
              opacity: 0.8,
            }}>
              ≈ {fmtNgn(numericAmount, ngnRate)}
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>USDC</div>
        </div>

        {/* Note field */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            What's it for? (optional)
          </div>
          <input
            type="text"
            placeholder="Dinner, rent, split, etc."
            value={note}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value.slice(0, 140))}
            maxLength={140}
            style={{
              width: '100%',
              background: 'var(--bg2)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px 16px',
              color: 'var(--text)',
              fontSize: 15,
              fontFamily: "'Syne', sans-serif",
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
            {note.length}/140
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Expiry note */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: 'rgba(201,168,76,0.06)',
          border: '1px solid rgba(201,168,76,0.12)',
          borderRadius: 10,
          marginBottom: 20,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
            Link expires in 7 days · Anyone with the link can pay
          </span>
        </div>
      </div>

      {/* Numpad */}
      <div style={{ padding: '0 20px 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginBottom: 12 }}>
          {['1','2','3','4','5','6','7','8','9','.','0','DEL'].map(k => (
            <div
              key={k}
              onClick={() => handleKey(k)}
              style={{
                height: 52,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: k === 'DEL' ? 18 : 22,
                fontFamily: "'DM Mono', monospace",
                color: k === 'DEL' ? 'var(--muted)' : 'var(--text)',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'background 0.1s',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
              onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onPointerUp={(e: React.PointerEvent<HTMLDivElement>) => (e.currentTarget.style.background = 'transparent')}
              onPointerLeave={(e: React.PointerEvent<HTMLDivElement>) => (e.currentTarget.style.background = 'transparent')}
            >
              {k === 'DEL'
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                : k}
            </div>
          ))}
        </div>

        <button
          onClick={handleCreate}
          disabled={!hasAmount || isPending}
          style={{
            width: '100%',
            height: 54,
            background: hasAmount && !isPending ? 'var(--gold)' : 'rgba(201,168,76,0.2)',
            border: 'none',
            borderRadius: 14,
            color: hasAmount && !isPending ? '#0a0904' : 'rgba(255,255,255,0.3)',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'Syne', sans-serif",
            letterSpacing: '0.02em',
            cursor: hasAmount && !isPending ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {isPending ? (
            <>
              <div style={{
                width: 18, height: 18,
                border: '2px solid rgba(10,9,4,0.3)',
                borderTopColor: '#0a0904',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Creating...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Create Request Link
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// STEP 2 — Generated Link Card
// ══════════════════════════════════════════════════════════
function PaymentLinkCard({
  result,
  onNewRequest,
  onViewAll,
}: {
  result:       CreatePayLinkResponse
  onNewRequest: () => void
  onViewAll:    () => void
}) {
  const { showToast }  = useUiStore()
  const user           = useAuthStore(s => s.user)
  const { data: rate } = useExchangeRate()
  const ngnRate        = parseFloat(rate?.effectiveRate ?? '0')
  const amount         = parseFloat(result.amountUsdc)
  const [copied, setCopied] = useState(false)

  const shareText = `${user?.fullName?.split(' ')[0] ?? 'Someone'} is requesting ${fmtNgn(amount, ngnRate)} (${fmtUsdc(amount)} USDC). Pay here: ${result.url}`

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result.url)
      setCopied(true)
      showToast('Copied!', 'Payment link copied to clipboard')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      showToast('Error', 'Could not copy — tap the link to copy manually')
    }
  }, [result.url, showToast])

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener')
  }

  const shareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(result.url)}&text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener')
  }

  const nativeShare = async () => {
    if (!('share' in navigator)) { copyLink(); return }
    try {
      await navigator.share({ title: 'Payment Request', text: shareText, url: result.url })
    } catch {
      // user cancelled
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 32px', display: 'flex', flexDirection: 'column' }}>
      {/* Success header */}
      <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
        <div style={{
          width: 72, height: 72,
          background: 'rgba(201,168,76,0.12)',
          border: '1.5px solid rgba(201,168,76,0.3)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" style={{ width: 32, height: 32 }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: 'var(--text)' }}>
          Link Created
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Share it to receive payment
        </div>
      </div>

      {/* Link card */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        {/* Amount header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%)',
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(201,168,76,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center' }}>
            <span style={{ fontSize: 36, fontFamily: "'DM Mono', monospace", fontWeight: 300, color: 'var(--gold)' }}>
              {fmtUsdc(result.amountUsdc)}
            </span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>USDC</span>
          </div>
          {ngnRate > 0 && (
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              ≈ {fmtNgn(amount, ngnRate)}
            </div>
          )}
          {result.note && (
            <div style={{
              textAlign: 'center', fontSize: 13, color: 'var(--text)',
              marginTop: 10, padding: '8px 16px',
              background: 'rgba(0,0,0,0.2)', borderRadius: 8,
            }}>
              "{result.note}"
            </div>
          )}
        </div>

        {/* Link display */}
        <div
          onClick={copyLink}
          style={{
            padding: '14px 16px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Payment Link
            </div>
            <div style={{
              fontSize: 12,
              fontFamily: "'DM Mono', monospace",
              color: 'var(--gold)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {result.url}
            </div>
          </div>
          <div style={{
            width: 36, height: 36,
            background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(201,168,76,0.1)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}>
            {copied
              ? <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" style={{ width: 16, height: 16 }}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            }
          </div>
        </div>

        {/* Expiry row */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Expires {new Date(result.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
          </div>
          <div style={{
            fontSize: 11, color: '#C9A84C',
            background: 'rgba(201,168,76,0.1)',
            padding: '3px 8px', borderRadius: 6,
          }}>
            {result.expiresInHours / 24}d window
          </div>
        </div>
      </div>

      {/* Share buttons */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Share via
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {/* Copy */}
          <ShareBtn
            onClick={copyLink}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            }
            label={copied ? 'Copied!' : 'Copy'}
            color={copied ? '#4ade80' : '#C9A84C'}
          />
          {/* WhatsApp */}
          <ShareBtn
            onClick={shareWhatsApp}
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.089.534 4.055 1.47 5.765L0 24l6.395-1.44A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.82 9.82 0 0 1-5.007-1.368l-.36-.212-3.798.855.87-3.692-.233-.379A9.793 9.793 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
              </svg>
            }
            label="WhatsApp"
            color="#25D366"
          />
          {/* Telegram */}
          <ShareBtn
            onClick={shareTelegram}
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            }
            label="Telegram"
            color="#29B6F6"
          />
        </div>

        {/* Native share (mobile) */}
        {'share' in navigator && (
          <button
            onClick={nativeShare}
            style={{
              width: '100%',
              marginTop: 8,
              height: 46,
              background: 'var(--bg2)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              color: 'var(--text)',
              fontSize: 14,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Share Link
          </button>
        )}
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onNewRequest}
          style={{
            flex: 1,
            height: 46,
            background: 'var(--bg2)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            color: 'var(--text)',
            fontSize: 14,
            fontFamily: "'Syne', sans-serif",
            cursor: 'pointer',
          }}
        >
          New Request
        </button>
        <button
          onClick={onViewAll}
          style={{
            flex: 1,
            height: 46,
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: 12,
            color: 'var(--gold)',
            fontSize: 14,
            fontFamily: "'Syne', sans-serif",
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          My Requests
        </button>
      </div>
    </div>
  )
}

// Share button helper
function ShareBtn({ onClick, icon, label, color }: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  color: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 68,
        background: 'var(--bg2)',
        border: `1px solid ${color}20`,
        borderRadius: 14,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
        color,
        transition: 'background 0.15s',
      }}
      onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => (e.currentTarget.style.background = `${color}15`)}
      onPointerUp={(e: React.PointerEvent<HTMLButtonElement>) => (e.currentTarget.style.background = 'var(--bg2)')}
      onPointerLeave={(e: React.PointerEvent<HTMLButtonElement>) => (e.currentTarget.style.background = 'var(--bg2)')}
    >
      {icon}
      <span style={{ fontSize: 11, fontFamily: "'Syne',sans-serif", fontWeight: 600 }}>{label}</span>
    </button>
  )
}

// ══════════════════════════════════════════════════════════
// My Requests list
// ══════════════════════════════════════════════════════════
function MyRequestsPanel() {
  const { data, isLoading }  = useMyPayLinks()
  const { mutateAsync: cancel } = useCancelPayLink()
  const { showToast }        = useUiStore()
  const { data: rate }       = useExchangeRate()
  const ngnRate              = parseFloat(rate?.effectiveRate ?? '0')
  const [cancelling, setCancelling] = useState<string | null>(null)

  async function handleCancel(token: string) {
    setCancelling(token)
    try {
      await cancel(token)
      showToast('Cancelled', 'Payment request cancelled')
    } catch (e: any) {
      showToast('Error', e.message)
    } finally {
      setCancelling(null)
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Copied!', 'Link copied to clipboard')
    } catch { /* ignore */ }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{
            height: 80, background: 'var(--bg2)', borderRadius: 14,
            opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ))}
      </div>
    )
  }

  const links: PayLinkData[] = data?.data ?? []

  if (!links.length) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '60px 40px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64,
          background: 'rgba(201,168,76,0.08)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" style={{ width: 28, height: 28 }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: 'var(--text)' }}>
          No requests yet
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          Create a payment request and share the link to receive money
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map(link => {
          const badge = STATUS_BADGE[link.status] ?? STATUS_BADGE.pending
          const amount = parseFloat(link.amountUsdc)
          return (
            <div
              key={link.id}
              style={{
                background: 'var(--bg2)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 18, fontFamily: "'DM Mono',monospace", fontWeight: 300, color: 'var(--text)' }}>
                    {fmtUsdc(link.amountUsdc)}
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6, fontFamily: "'Syne',sans-serif" }}>USDC</span>
                  </div>
                  {ngnRate > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: "'DM Mono',monospace" }}>
                      {fmtNgn(amount, ngnRate)}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  color: badge.color, background: badge.bg,
                  padding: '3px 9px', borderRadius: 20,
                  fontFamily: "'Syne',sans-serif",
                }}>
                  {badge.label}
                </div>
              </div>

              {link.note && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontStyle: 'italic' }}>
                  "{link.note}"
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                  {link.status === 'paid' && link.paidAt
                    ? `Paid by @${link.payer?.username} · ${new Date(link.paidAt).toLocaleDateString()}`
                    : link.status === 'pending'
                    ? timeLeft(link.expiresAt)
                    : new Date(link.createdAt).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {link.status === 'pending' && (
                    <>
                      <button
                        onClick={() => copyLink(link.url)}
                        style={{
                          height: 30, padding: '0 12px',
                          background: 'rgba(201,168,76,0.1)',
                          border: '1px solid rgba(201,168,76,0.2)',
                          borderRadius: 8,
                          color: '#C9A84C', fontSize: 11,
                          fontFamily: "'Syne',sans-serif", fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleCancel(link.token)}
                        disabled={cancelling === link.token}
                        style={{
                          height: 30, padding: '0 12px',
                          background: 'rgba(248,113,113,0.08)',
                          border: '1px solid rgba(248,113,113,0.15)',
                          borderRadius: 8,
                          color: '#f87171', fontSize: 11,
                          fontFamily: "'Syne',sans-serif", fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {cancelling === link.token ? '...' : 'Cancel'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// Root PayLink Screen
// ══════════════════════════════════════════════════════════
type Tab = 'create' | 'history'
type CreateStep = 'form' | 'link'

export function PayLinkScreen() {
  const { goBack, showToast } = useUiStore()
  const [tab,       setTab]   = useState<Tab>('create')
  const [step,      setStep]  = useState<CreateStep>('form')
  const [generated, setGenerated] = useState<CreatePayLinkResponse | null>(null)

  function handleCreated(r: CreatePayLinkResponse) {
    setGenerated(r)
    setStep('link')
  }

  function handleNewRequest() {
    setGenerated(null)
    setStep('form')
  }

  function handleViewAll() {
    setTab('history')
    setStep('form')
    setGenerated(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.6); opacity: 0 }
          to   { transform: scale(1);   opacity: 1 }
        }
        @keyframes spin {
          to { transform: rotate(360deg) }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5 }
          50%       { opacity: 0.25 }
        }
        @keyframes fadeUp {
          from { transform: translateY(12px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
      `}</style>

      <ScreenHeader
        title="Request Payment"
        onBack={step === 'link' ? handleNewRequest : goBack}
      />

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4,
        padding: '0 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {(['create', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'create') { setStep('form'); setGenerated(null) } }}
            style={{
              flex: 1,
              height: 36,
              background: tab === t ? 'rgba(201,168,76,0.12)' : 'transparent',
              border: tab === t ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent',
              borderRadius: 10,
              color: tab === t ? 'var(--gold)' : 'var(--muted)',
              fontSize: 13,
              fontFamily: "'Syne', sans-serif",
              fontWeight: tab === t ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'capitalize',
            }}
          >
            {t === 'create' ? 'New Request' : 'My Requests'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {tab === 'create' && step === 'form' && (
          <PaymentRequestForm onCreated={handleCreated} />
        )}
        {tab === 'create' && step === 'link' && generated && (
          <PaymentLinkCard
            result={generated}
            onNewRequest={handleNewRequest}
            onViewAll={handleViewAll}
          />
        )}
        {tab === 'history' && (
          <MyRequestsPanel />
        )}
      </div>
    </div>
  )
}
