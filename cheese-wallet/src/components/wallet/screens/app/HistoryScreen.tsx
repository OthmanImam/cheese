'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — History + Transaction Detail Screens
// ─────────────────────────────────────────────────────────
import { useState }             from 'react'
import { useUiStore }           from '@/lib/stores/uiStore'
import { useTransactions }      from '@/lib/hooks/useWallet'
import { SkeletonTxList, EmptyState, ScreenHeader, ErrorBanner } from '../../shared/UI'
import type { Transaction }     from '@/types'
import type { TxDetailData }    from '@/lib/stores/uiStore'

// ── History Screen ────────────────────────────────────────
export function HistoryScreen() {
  const { goTo, openTxDetail, showToast } = useUiStore()
  const [page, setPage]  = useState(1)
  const { data, isLoading, error, refetch } = useTransactions(page)

  const txs   = data?.transactions ?? []
  const total = data?.total ?? 0

  function toDetail(tx: Transaction) {
    const isIn = tx.type === 'receive'
    openTxDetail({
      type:    isIn ? 'in' : tx.type === 'card_spend' ? 'card_spend' : 'out',
      amount:  (isIn ? '+' : '-') + '$' + tx.amount.toFixed(2),
      desc:    tx.description,
      date:    new Date(tx.createdAt).toLocaleString('en-US', { dateStyle:'medium', timeStyle:'short' }),
      ref:     tx.reference,
      hash:    tx.txHash,
      network: tx.network,
      fee:     tx.fee ? `$${tx.fee.toFixed(2)}` : '$0.00 — Free',
      status:  tx.status as 'confirmed' | 'pending' | 'failed',
    })
  }

  // Group by date
  const grouped: Record<string, Transaction[]> = {}
  txs.forEach(tx => {
    const d = new Date(tx.createdAt)
    const today     = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
    const txDate    = new Date(d); txDate.setHours(0,0,0,0)
    const label     = txDate.getTime() === today.getTime()     ? 'Today'
                    : txDate.getTime() === yesterday.getTime() ? 'Yesterday'
                    : d.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })
    grouped[label] = grouped[label] ?? []
    grouped[label].push(tx)
  })

  return (
    <div className="screen active" id="screen-history">
      <div className="screen-header">
        <span className="screen-title">History</span>
        <div className="btn-icon" onClick={() => showToast('Filter', 'Filter by type, date or amount')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <div className="tx-list" style={{ paddingBottom:100 }}>
        {isLoading && <SkeletonTxList count={6} />}
        {error     && <ErrorBanner message={error.message} onRetry={refetch} />}

        {!isLoading && txs.length === 0 && (
          <EmptyState
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            title="No transactions yet"
            sub="Your transaction history will appear here once you start sending or receiving."
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

        {/* Pagination */}
        {total > txs.length && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <button
              onClick={() => setPage(p => p + 1)}
              style={{ background:'none', border:'1px solid rgba(201,168,76,0.2)', borderRadius:10, padding:'10px 24px', color:'var(--gold)', fontFamily:'Syne,sans-serif', fontSize:13, cursor:'pointer' }}
            >
              Load more
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
  const init   = (tx.description.split(' ').pop() ?? '?')[0].toUpperCase()
  return (
    <div className="tx-item" onClick={onClick} style={{ cursor:'pointer' }}>
      <div className={`tx-avatar${isIn ? ' in' : isCard ? ' bill' : ' out'}`}>
        {isCard ? '💳' : init}
      </div>
      <div className="tx-info">
        <div className="tx-name">{tx.description}</div>
        <div className="tx-meta">
          {new Date(tx.createdAt).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}
          {tx.txHash ? ` · ${tx.txHash.slice(0,6)}…${tx.txHash.slice(-4)}` : ''}
          {tx.reference ? ` · ${tx.reference}` : ''}
        </div>
      </div>
      <div className="tx-amount">
        <div className={`tx-amt-val${isIn ? ' in' : ' bill'}`}>
          {isIn ? '+' : '-'}${tx.amount.toFixed(2)}
        </div>
        {tx.status === 'pending' && <div style={{ fontSize:9, color:'var(--gold)', letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Pending</div>}
        {tx.status === 'failed'  && <div style={{ fontSize:9, color:'var(--danger)', letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Failed</div>}
      </div>
    </div>
  )
}

// ── Transaction Detail Screen ─────────────────────────────
export function TxDetailScreen() {
  const { txDetail, closeTxDetail, showToast } = useUiStore()
  const tx = txDetail

  if (!tx) return null

  function downloadReceipt() {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cheese Receipt</title>
<style>body{font-family:'Helvetica Neue',sans-serif;background:#0a0904;color:#f0e8d0;max-width:400px;margin:40px auto;padding:32px;border:1px solid rgba(201,168,76,0.25);border-radius:16px}h2{font-size:22px;font-weight:300;letter-spacing:4px;text-transform:uppercase;color:#c9a84c}p{font-size:12px;color:#7a7055;letter-spacing:2px;text-transform:uppercase;margin-bottom:32px}.row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px}.row:last-child{border:none}.k{color:#7a7055;font-size:11px;text-transform:uppercase}.v{font-family:monospace;color:#b0a480}.big .v{color:#c9a84c;font-size:16px}.ref{margin-top:24px;font-size:10px;color:#4a4535;font-family:monospace;text-align:center}@media print{body{background:#fff;color:#111;border:none}}</style></head><body>
<h2>Cheese</h2><p>Transfer Receipt</p>
<div class="row big"><span class="k">Amount</span><span class="v">${tx.amount}</span></div>
<div class="row"><span class="k">Description</span><span class="v">${tx.desc}</span></div>
<div class="row"><span class="k">Date</span><span class="v">${tx.date}</span></div>
<div class="row"><span class="k">Fee</span><span class="v">${tx.fee}</span></div>
<div class="row"><span class="k">Status</span><span class="v">${tx.status}</span></div>
${tx.hash ? `<div class="row"><span class="k">Tx Hash</span><span class="v">${tx.hash}</span></div>` : ''}
<div class="ref">${tx.ref}</div></body></html>`
    const w = window.open('', '_blank', 'width=520,height=720')
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400) }
    showToast('Receipt ready', 'Print or save as PDF')
  }

  function share() {
    if (navigator.share) navigator.share({ title:'Cheese Receipt', text:`${tx.amount} — ${tx.desc} · ${tx.ref}` })
    else showToast('Copied', tx.ref + ' copied')
  }

  const isIn = tx.type === 'in'

  return (
    <div className="screen active" id="screen-txdetail">
      <ScreenHeader
        title="Transaction"
        onBack={closeTxDetail}
        right={
          <div className="btn-icon" onClick={share}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49"/>
            </svg>
          </div>
        }
      />
      <div className="tx-detail-wrap">
        <div className="tx-detail-hero">
          <div className="tx-detail-icon" style={{ background: isIn ? 'rgba(90,158,111,0.12)' : 'rgba(184,85,85,0.12)' }}>
            {isIn ? '📥' : tx.type === 'card_spend' ? '💳' : '📤'}
          </div>
          <div className={`tx-detail-amount ${isIn ? 'in' : 'out'}`}>{tx.amount}</div>
          <div className="tx-detail-sub">{tx.desc}</div>
          <div className={`tx-status-chip ${tx.status}`}>
            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
          </div>
        </div>

        <div className="tx-detail-card">
          <div className="tx-detail-row"><span className="tx-detail-key">Date &amp; Time</span><span className="tx-detail-val plain">{tx.date}</span></div>
          <div className="tx-detail-row"><span className="tx-detail-key">Reference</span><span className="tx-detail-val">{tx.ref}</span></div>
          {tx.hash    && <div className="tx-detail-row"><span className="tx-detail-key">Tx Hash</span><span className="tx-detail-val">{tx.hash}</span></div>}
          {tx.network && <div className="tx-detail-row"><span className="tx-detail-key">Network</span><span className="tx-detail-val plain">{tx.network}</span></div>}
          <div className="tx-detail-row"><span className="tx-detail-key">Fee</span><span className="tx-detail-val plain" style={{ color:'var(--success)' }}>{tx.fee}</span></div>
        </div>

        <div className="tx-detail-actions">
          <button className="tx-detail-action-btn" onClick={downloadReceipt}>
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Receipt
          </button>
          <button className="tx-detail-action-btn" onClick={() => showToast('Repeat', 'Opening send flow…')}>
            <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.28"/></svg>
            Repeat
          </button>
        </div>
      </div>
    </div>
  )
}
