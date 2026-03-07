'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Home Screen
// ─────────────────────────────────────────────────────────
import { useAuthStore }        from '@/lib/stores/authStore'
import { useUiStore }          from '@/lib/stores/uiStore'
import { useBalance }          from '@/lib/hooks/useWallet'
import { useExchangeRate }     from '@/lib/hooks/useBanks'
import { useTransactions }     from '@/lib/hooks/useWallet'
import { SkeletonBalance, SkeletonTxList, EmptyState, ThemeToggle } from '../../shared/UI'
import type { Transaction }    from '@/types'

const EYE_OPEN  = <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
const EYE_SHUT  = <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>

export function HomeScreen() {
  const { user }              = useAuthStore()
  const { balanceVisible, toggleBalance, goTo, openModal, openTxDetail, showToast } = useUiStore()
  const { data: balance, isLoading: balLoading, refetch: refetchBal } = useBalance()
  const { data: rate }        = useExchangeRate()
  const { data: txData, isLoading: txLoading } = useTransactions(1)

  const usd  = parseFloat(balance?.usdc ?? '0')
  const ngn  = parseFloat(balance?.ngnEquivalent ?? '0')
  const txs  = txData?.items  ?? []
  const rateVal = rate?.effectiveRate ?? 1610

  const tierMap: Record<string, string> = { silver: '◈ Silver', gold: '◆ Gold', black: '◆ Black' }
  const tier = user?.tier ?? 'silver'

  function handleTxTap(tx: Transaction) {
    const isIn = tx.type === 'receive'
    const canRepeat = !isIn && tx.type !== 'card_spend'
    const method = tx.type === 'bank_out' ? 'account' : tx.recipientAddress ? 'evm' : 'username'
    openTxDetail({
      type:    isIn ? 'in' : tx.type === 'card_spend' ? 'card_spend' : 'out',
      amount:  (isIn ? '+' : '-') + '$' + Number(tx.amountUsdc).toFixed(2),
      desc:    tx.description ?? tx.recipient ?? 'Transaction',
      date:    new Date(tx.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }),
      ref:     tx.reference,
      hash:    tx.txHash,
      network: tx.network,
      fee:     tx.fee ? `$${Number(tx.fee).toFixed(2)}` : '$0.00 — Free',
      status:  tx.status as 'confirmed' | 'pending' | 'failed',
      ...(canRepeat && (tx.recipientIdentifier ?? tx.recipient) ? {
        repeatPayload: {
          method:        method as 'username' | 'evm' | 'account',
          recipient:     (tx.recipientIdentifier ?? tx.recipient)!,
          recipientName: tx.recipientName ?? tx.recipient ?? '',
          amount:        tx.amountUsdc,
        }
      } : {}),
    })
  }

  return (
    <div className="screen active" id="screen-home">
      {/* ── Header ── */}
      <div className="screen-header" style={{ justifyContent:'space-between' }}>
        <span className="app-logo">Cheese</span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* Bell */}
          <div className="btn-icon" style={{ position:'relative' }} onClick={() => goTo('notifications')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <div style={{ position:'absolute', top:2, right:2, width:7, height:7, borderRadius:'50%', background:'var(--gold)', border:'1.5px solid var(--bg)' }} />
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* ── Balance hero ── */}
      <div className="home-hero">
        <div className="hero-card">
          <div className="hero-card-inner">
            <div className="hero-tier">{tierMap[tier] ?? '◈ Silver'}</div>
            <div className="hero-name">{user?.fullName ?? 'Loading…'}</div>
            <div className="hero-username">@{user?.username ?? '—'}</div>

            <div className="hero-balance-row">
              {balLoading
                ? <SkeletonBalance />
                : <>
                    <div className={`hero-balance${balanceVisible ? '' : ' hidden'}`} id="balanceDisplay">
                      ${usd.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}
                    </div>
                    <button className="balance-eye" onClick={toggleBalance}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        {balanceVisible ? EYE_OPEN : EYE_SHUT}
                      </svg>
                    </button>
                  </>}
            </div>

            {!balLoading && (
              <div className={`hero-ngn${balanceVisible ? '' : ' hidden'}`} id="balanceNgn">
                ≈ ₦{ngn.toLocaleString('en-NG', { maximumFractionDigits:0 })} · ₦{rateVal.toLocaleString()}/$
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="quick-actions">
        <div className="qa-btn" onClick={() => openModal('addFunds')}>
          <div className="qa-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
          <span>Add</span>
        </div>
        <div className="qa-btn" onClick={() => goTo('send')}>
          <div className="qa-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>
          <span>Send</span>
        </div>
        <div className="qa-btn" onClick={() => openModal('askReceive')}>
          <div className="qa-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
          <span>Receive</span>
        </div>
        <div className="qa-btn" onClick={() => goTo('paylink')}>
          <div className="qa-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
          <span>Request</span>
        </div>
      </div>

      {/* ── Transactions ── */}
      <div className="section-head">
        <span className="section-title">Recent Activity</span>
        <span className="section-link" onClick={() => goTo('history')}>See all</span>
      </div>

      <div className="tx-list" style={{ paddingBottom: 100 }}>
        {txLoading && <SkeletonTxList count={4} />}

        {!txLoading && txs.length === 0 && (
          <EmptyState
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            title="No transactions yet"
            sub="Send or receive USDC to see your activity here."
            ctaLabel="Add Funds"
            onCta={() => openModal('addFunds')}
          />
        )}

        {!txLoading && txs.slice(0, 6).map((tx) => (
          <TxRow key={tx.id} tx={tx} onClick={() => handleTxTap(tx)} />
        ))}
      </div>
    </div>
  )
}

// ── Transaction row ───────────────────────────────────────
function TxRow({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const isIn   = tx.type === 'receive'
  const isCard = tx.type === 'card_spend'
  const emoji  = isCard ? '💳' : isIn ? null : null
  const initial= ((tx.description ?? tx.recipient ?? '?').split(' ').pop() ?? '?')[0].toUpperCase()

  return (
    <div className="tx-item" onClick={onClick} style={{ cursor:'pointer' }}>
      <div className={`tx-avatar${isIn ? ' in' : isCard ? ' bill' : ' out'}`}>
        {emoji ?? initial}
      </div>
      <div className="tx-info">
        <div className="tx-name">{tx.description ?? tx.recipient ?? 'Transaction'}</div>
        <div className="tx-meta">
          {new Date(tx.createdAt).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}
          {tx.txHash ? ` · ${tx.txHash.slice(0,6)}…${tx.txHash.slice(-4)}` : ''}
        </div>
      </div>
      <div className="tx-amount">
        <div className={`tx-amt-val${isIn ? ' in' : ' bill'}`}>
          {isIn ? '+' : '-'}${Number(tx.amountUsdc).toFixed(2)}
        </div>
      </div>
    </div>
  )
}
