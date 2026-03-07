'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — History Screen
// ─────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { useUiStore }                   from '@/lib/stores/uiStore'
import { useTransactions }              from '@/lib/hooks/useWallet'
import { SkeletonTxList, EmptyState, ScreenHeader, ErrorBanner } from '../../shared/UI'
import type { Transaction }             from '@/types'
import type { TxType }                  from '@/types'

type FilterType = 'all' | 'receive' | 'send' | 'bank_out' | 'card_spend'
const FILTER_LABELS: { key: FilterType; label: string }[] = [
  { key: 'all',       label: 'All'      },
  { key: 'receive',   label: 'Received' },
  { key: 'send',      label: 'Sent'     },
  { key: 'bank_out',  label: 'Bank'     },
  { key: 'card_spend',label: 'Card'     },
]

// ── History Screen ────────────────────────────────────────
export function HistoryScreen() {
  const { openTxDetail } = useUiStore()
  const [page,       setPage]       = useState(1)
  const [filter,     setFilter]     = useState<FilterType>('all')
  const [accumulated, setAccumulated] = useState<Transaction[]>([])

  const { data, isLoading, isFetching, error, refetch } = useTransactions(page)

  // Accumulate pages so Load More appends rather than replaces
  useEffect(() => {
    if (!data?.items) return
    if (page === 1) {
      setAccumulated(data.items)
    } else {
      setAccumulated(prev => {
        const ids = new Set(prev.map(t => t.id))
        return [...prev, ...data.items.filter(t => !ids.has(t.id))]
      })
    }
  }, [data?.items, page])

  const total = data?.total ?? 0

  // Apply type filter
  const txs = filter === 'all'
    ? accumulated
    : accumulated.filter(tx => tx.type === filter)

  function toDetail(tx: Transaction) {
    const isIn      = tx.type === 'receive'
    const canRepeat = !isIn && tx.type !== 'card_spend'
    const method    = (tx.type === 'bank_out' ? 'account'
                    : tx.recipientAddress     ? 'evm'
                    : 'username') as 'account' | 'evm' | 'username'
    const displayAmt = Number(tx.amountUsdc ?? tx.amountNgn ?? 0).toFixed(2)
    openTxDetail({
      type:    isIn ? 'in' : tx.type === 'card_spend' ? 'card_spend' : 'out',
      amount:  (isIn ? '+' : '-') + '$' + displayAmt,
      desc:    tx.description ?? tx.recipient ?? 'Transaction',
      date:    new Date(tx.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      ref:     tx.reference,
      hash:    tx.txHash,
      network: tx.network,
      fee:     tx.fee ? `$${Number(tx.fee).toFixed(2)}` : '$0.00 — Free',
      status:  tx.status as 'confirmed' | 'pending' | 'failed',
      ...(canRepeat && (tx.recipientIdentifier ?? tx.recipient) ? {
        repeatPayload: {
          method,
          recipient:     (tx.recipientIdentifier ?? tx.recipient)!,
          recipientName: tx.recipientName ?? tx.recipient ?? '',
          amount:        String(Number(tx.amountUsdc ?? tx.amountNgn ?? 0).toFixed(2)),
        },
      } : {}),
    })
  }

  // Group by date
  const grouped: Record<string, Transaction[]> = {}
  txs.forEach(tx => {
    const d         = new Date(tx.createdAt)
    const today     = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
    const txDate    = new Date(d); txDate.setHours(0,0,0,0)
    const label     = txDate.getTime() === today.getTime()     ? 'Today'
                    : txDate.getTime() === yesterday.getTime() ? 'Yesterday'
                    : d.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })
    grouped[label]  = grouped[label] ?? []
    grouped[label].push(tx)
  })

  return (
    <div className="screen active" id="screen-history">
      <ScreenHeader title="History" />

      {/* ── Filter chips ── */}
      <div style={{ display:'flex', gap:8, padding:'0 20px 14px', overflowX:'auto' }}>
        {FILTER_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${filter === key ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`,
              background: filter === key ? 'rgba(201,168,76,0.12)' : 'transparent',
              color: filter === key ? 'var(--gold)' : 'var(--muted)',
              fontFamily: "'Syne',sans-serif",
              fontSize: 12,
              cursor: 'pointer',
              letterSpacing: '0.5px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="tx-list" style={{ paddingBottom:100 }}>
        {isLoading && <SkeletonTxList count={6} />}
        {error     && <ErrorBanner message={error.message} onRetry={refetch} />}

        {!isLoading && txs.length === 0 && (
          <EmptyState
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            title={filter === 'all' ? 'No transactions yet' : `No ${FILTER_LABELS.find(f => f.key === filter)?.label.toLowerCase()} transactions`}
            sub={filter === 'all' ? 'Your transaction history will appear here once you start sending or receiving.' : 'Try a different filter or check back later.'}
          />
        )}

        {Object.entries(grouped).map(([label, group]) => (
          <div key={label}>
            <div className="section-head" style={{ padding:'8px 0 12px' }}>
              <span className="section-title">{label}</span>
            </div>
            {group.map(tx => <HistoryRow key={tx.id} tx={tx} onClick={() => toDetail(tx)} />)}
            <div className="divider-line" style={{ margin:'12px 0' }} />
          </div>
        ))}

        {/* Load more — with spinner while fetching */}
        {accumulated.length < total && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={isFetching}
              style={{
                background: 'none',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: 10,
                padding: '10px 24px',
                color: 'var(--gold)',
                fontFamily: "'Syne',sans-serif",
                fontSize: 13,
                cursor: isFetching ? 'not-allowed' : 'pointer',
                opacity: isFetching ? 0.6 : 1,
              }}
            >
              {isFetching ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryRow({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const isIn   = tx.type === 'receive'
  const isCard = tx.type === 'card_spend'
  const label  = tx.description ?? tx.recipient ?? 'Transaction'
  const init   = (label.split(' ').pop() ?? '?')[0].toUpperCase()
  const displayAmt = tx.amountUsdc ?? tx.amountNgn ?? 0
  return (
    <div className="tx-item" onClick={onClick} style={{ cursor:'pointer' }}>
      <div className={`tx-avatar${isIn ? ' in' : isCard ? ' bill' : ' out'}`}>
        {isCard ? '💳' : init}
      </div>
      <div className="tx-info">
        <div className="tx-name">{tx.description ?? tx.recipient ?? 'Transaction'}</div>
        <div className="tx-meta">
          {new Date(tx.createdAt).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}
          {tx.txHash ? ` · ${tx.txHash.slice(0,6)}…${tx.txHash.slice(-4)}` : ''}
          {tx.reference ? ` · ${tx.reference}` : ''}
        </div>
      </div>
      <div className="tx-amount">
        <div className={`tx-amt-val${isIn ? ' in' : ' bill'}`}>
          {isIn ? '+' : '-'}${Number(displayAmt).toFixed(2)}
        </div>
        {tx.status === 'pending' && <div style={{ fontSize:9, color:'var(--gold)', letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Pending</div>}
        {tx.status === 'failed'  && <div style={{ fontSize:9, color:'var(--danger)', letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Failed</div>}
      </div>
    </div>
  )
}

