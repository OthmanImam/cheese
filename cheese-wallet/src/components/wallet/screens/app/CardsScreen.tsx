'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Cards / Wallet Screen + Card Detail
// ─────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useUiStore }          from '@/lib/stores/uiStore'
import { useBalance, useCardTransactions } from '@/lib/hooks/useWallet'
import { useCard, useFreezeCard, useUnfreezeCard, useRevealCvv } from '@/lib/hooks/useBanks'
import { SkeletonTxList, ScreenHeader, ErrorBanner, PinPad } from '../../shared/UI'

// ── Wallet overview screen (cards nav tab) ────────────────
export function CardsScreen() {
  const { goTo, showToast }   = useUiStore()
  const { data: balance }     = useBalance()
  const { data: card }        = useCard()
  const usd = parseFloat(balance?.totalUSDC ?? '0')

  return (
    <div className="screen active" id="screen-cards">
      <div className="screen-header">
        <span className="screen-title">My Wallet</span>
        <div className="btn-icon" onClick={() => goTo('cardscreen')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
        </div>
      </div>

      <div style={{ padding:'0 24px 100px' }}>
        {/* Balance card */}
        <div style={{ background:'var(--bg3)', border:'1px solid rgba(201,168,76,0.15)', borderRadius:'var(--r2)', padding:20, marginBottom:14 }}>
          <div style={{ fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'var(--muted)', marginBottom:8 }}>USDC Balance</div>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:38, fontWeight:300, color:'var(--text)' }}>
            ${usd.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}
          </div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>USD Coin · Arbitrum</div>
        </div>

        {/* Virtual card mini-preview */}
        {card && (
          <div className="virtual-card" style={{ marginBottom:14, cursor:'pointer' }} onClick={() => goTo('cardscreen')}>
            <div className="vc-chip" />
            <div className="vc-number">•••• •••• •••• {card.last4}</div>
            <div className="vc-row">
              <div><div className="vc-expiry-label">Expires</div><div className="vc-expiry">{card.expiryMonth} / {card.expiryYear}</div></div>
              <div className="vc-name">{card.holderName}</div>
              <div className="vc-network">CHEESE</div>
            </div>
          </div>
        )}
        {!card && (
          <div style={{ background:'var(--bg3)', border:'1.5px dashed rgba(201,168,76,0.25)', borderRadius:'var(--r2)', padding:32, textAlign:'center', marginBottom:14, cursor:'pointer' }} onClick={() => showToast('Virtual Card', 'Request your free virtual dollar card')}>
            <div style={{ fontSize:32, marginBottom:12 }}>💳</div>
            <div style={{ fontSize:14, color:'var(--text)', marginBottom:6 }}>Get a virtual card</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Spend your USDC anywhere online</div>
          </div>
        )}

        {/* Deposit addresses */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'var(--muted)', marginBottom:12 }}>Deposit Address</div>
          <div style={{ background:'var(--bg3)', border:'1px solid rgba(201,168,76,0.1)', borderRadius:'var(--r)', padding:'14px 18px', cursor:'pointer' }} onClick={() => showToast('Copied', 'Arbitrum address copied')}>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>Arbitrum (USDC) · Free</div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:'var(--gold)', wordBreak:'break-all' }}>0x8f4e…b92d</div>
          </div>
        </div>

        {/* Earn widget */}
        <div style={{ background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.15)', borderRadius:'var(--r)', padding:'14px 18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between' }} onClick={() => goTo('earn')}>
          <div>
            <div style={{ fontSize:13, color:'var(--text)' }}>Your balance is earning</div>
            <div style={{ fontSize:22, fontFamily:'Cormorant Garamond,serif', color:'var(--gold)' }}>6.5% APY</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width={18} height={18}><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </div>
  )
}

// ── Card detail screen ────────────────────────────────────
export function CardDetailScreen() {
  const { goTo, showToast }   = useUiStore()
  const { data: card }        = useCard()
  const { data: balance }     = useBalance()
  const freezeCard            = useFreezeCard()
  const unfreezeCard          = useUnfreezeCard()
  const revealCvv             = useRevealCvv()

  const [cvv,       setCvv]       = useState<string | null>(null)
  const [cvvTimer,  setCvvTimer]  = useState(0)
  const [frozen,    setFrozen]    = useState(false)
  const [cvvPinModal, setCvvPinModal] = useState(false)
  const [cvvPin,    setCvvPin]    = useState('')
  const [cvvPinErr, setCvvPinErr] = useState(false)

  // Sync frozen state when card loads
  useEffect(() => { if (card) setFrozen(card.status === 'frozen') }, [card?.status])

  // CVV countdown
  useEffect(() => {
    if (cvvTimer <= 0) { setCvv(null); return }
    const id = setTimeout(() => setCvvTimer(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [cvvTimer])

  async function handleFreeze() {
    try {
      if (frozen) { await unfreezeCard.mutateAsync(); setFrozen(false); showToast('Card active', 'Your card is now active') }
      else         { await freezeCard.mutateAsync();   setFrozen(true);  showToast('Card frozen', 'All transactions paused') }
    } catch {}
  }

  async function handleRevealCvv() {
    // Gate behind PIN — open the PIN modal instead of calling API directly
    setCvvPin('')
    setCvvPinErr(false)
    setCvvPinModal(true)
  }

  async function submitCvvPin(entered: string) {
    if (entered.length < 4) return
    try {
      const data = await revealCvv.mutateAsync(entered)
      setCvv(data.cvv)
      setCvvTimer(30)
      setCvvPinModal(false)
      setCvvPin('')
    } catch {
      setCvvPinErr(true)
      setTimeout(() => { setCvvPinErr(false); setCvvPin('') }, 700)
    }
  }

  const usd = parseFloat(balance?.totalUSDC ?? '0')
  const { data: cardTxs, isLoading: txLoading } = useCardTransactions()

  return (
    <>
    <div className="screen active" id="screen-cardscreen">
      <ScreenHeader title="My Card" onBack={() => goTo('cards')} />
      <div className="cards-screen-wrap">

        {frozen && (
          <div className="card-frozen-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Card is frozen — spending paused
          </div>
        )}

        <div className={`virtual-card${frozen ? ' frozen' : ''}`}>
          <div className="vc-chip" />
          <div className="vc-number">•••• •••• •••• {card?.last4 ?? '4291'}</div>
          <div className="vc-row">
            <div><div className="vc-expiry-label">Expires</div><div className="vc-expiry">{card?.expiryMonth ?? '08'} / {card?.expiryYear ?? '27'}</div></div>
            <div className="vc-name">{card?.holderName ?? 'Seun Adeyemi'}</div>
            <div className="vc-network">CHEESE</div>
          </div>
        </div>

        <div className="card-stat-row">
          <div className="card-stat"><div className="card-stat-label">Available</div><div className="card-stat-val">${usd.toLocaleString('en-US', { minimumFractionDigits:2 })}</div></div>
          <div className="card-stat"><div className="card-stat-label">This Month</div><div className="card-stat-val bill" style={{ color:'var(--danger)' }}>-$127.50</div></div>
        </div>

        {/* CVV reveal */}
        {cvv && (
          <div className="cvv-reveal-box">
            <div style={{ fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'var(--muted)', marginBottom:8 }}>CVV</div>
            <div className="cvv-value">{cvv}</div>
            <div className="cvv-timer">Hides in {cvvTimer}s</div>
          </div>
        )}

        <div className="card-action-row">
          <button className="card-action-btn" onClick={handleFreeze} disabled={freezeCard.isPending || unfreezeCard.isPending}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg>
            {frozen ? 'Unfreeze' : 'Freeze'}
          </button>
          <button className="card-action-btn" onClick={handleRevealCvv} disabled={revealCvv.isPending || !!cvv}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {cvv ? 'Shown' : 'View CVV'}
          </button>
        </div>

        <div className="section-head" style={{ padding:'20px 0 12px' }}>
          <span className="section-title">Recent Charges</span>
        </div>
        <div className="tx-list" style={{ padding:'0 0 20px' }}>
          {txLoading && <SkeletonTxList count={3} />}
          {!txLoading && (cardTxs ?? []).length === 0 && (
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:13 }}>
              No card charges yet
            </div>
          )}
          {(cardTxs ?? []).map((tx: any) => {
            const merchant = tx.description ?? 'Card purchase'
            const amt      = Number(tx.amountUsdc ?? 0).toFixed(2)
            const date     = new Date(tx.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric' })
            return (
              <div key={tx.id} className="tx-item" style={{ cursor:'pointer' }}>
                <div className="tx-avatar bill">💳</div>
                <div className="tx-info">
                  <div className="tx-name">{merchant}</div>
                  <div className="tx-meta">{date}</div>
                </div>
                <div className="tx-amount">
                  <div className="tx-amt-val bill">-${amt}</div>
                  {tx.status === 'pending' && (
                    <div style={{ fontSize:9, color:'var(--gold)', letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Pending</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>

    {/* ── CVV PIN Gate ── */}
    {cvvPinModal && (
      <div style={{ position:'fixed', inset:0, background:'rgba(10,9,4,0.92)', zIndex:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ width:'100%', maxWidth:340 }}>
          <div style={{ textAlign:'center', marginBottom:12 }}>
            <div style={{ fontSize:11, letterSpacing:3, textTransform:'uppercase', color:'var(--gold)', marginBottom:4 }}>Verify PIN</div>
            <div style={{ fontSize:13, color:'var(--muted)' }}>Enter your transaction PIN to reveal CVV</div>
          </div>
          <PinPad
            value={cvvPin}
            onChange={setCvvPin}
            onComplete={submitCvvPin}
            error={cvvPinErr}
            label=""
          />
          <div
            style={{ textAlign:'center', marginTop:16, fontSize:12, color:'var(--muted)', cursor:'pointer' }}
            onClick={() => setCvvPinModal(false)}
          >
            Cancel
          </div>
        </div>
      </div>
    )}
    </>
  )
}
