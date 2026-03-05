'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Send Screen
// Method → Recipient → Amount → Confirm → PIN → Success
// ─────────────────────────────────────────────────────────
import { useState, useEffect }     from 'react'
import { useUiStore }              from '@/lib/stores/uiStore'
import { useExchangeRate }         from '@/lib/hooks/useBanks'
import { useSendToUsername, useSendToAddress } from '@/lib/hooks/useWallet'
import { useBankTransfer }         from '@/lib/hooks/useBanks'
import { useQueryClient }          from '@tanstack/react-query'
import { QUERY_KEYS }              from '@/constants'
import { ScreenHeader, AmountNumpad, PinPad, ErrorBanner, EmptyState } from '../../shared/UI'
import type { SendMethod }         from '@/lib/stores/uiStore'

const RECENT_CONTACTS = [
  { handle: 'adaeze',   initial: 'A' },
  { handle: 'kolapo',   initial: 'K' },
  { handle: 'tobi.eth', initial: 'T' },
  { handle: 'chiamaka', initial: 'C' },
]

export function SendScreen() {
  const {
    goTo, sendFlow, setSendMethod, setSendStep, setSendRecipient,
    setSendAmount, resetSend, showToast,
  } = useUiStore()

  const { data: rate }    = useExchangeRate()
  const sendUsername      = useSendToUsername()
  const sendAddress       = useSendToAddress()
  const bankTransfer      = useBankTransfer()
  const queryClient       = useQueryClient()
  const rateVal           = rate?.effectiveRate ?? 1610

  const [evmAddr, setEvmAddr]   = useState('')
  const [pin,     setPin]       = useState('')
  const [pinErr,  setPinErr]    = useState(false)
  const [search,  setSearch]    = useState('')

  function handleBack() {
    const { step, method } = sendFlow
    if (step === 'method')    { resetSend(); goTo('home'); return }
    if (step === 'recipient') { setSendStep('method'); return }
    if (step === 'amount')    { setSendStep('recipient'); return }
    if (step === 'confirm')   { setSendStep('amount'); return }
    if (step === 'pin')       { setSendStep('confirm'); return }
    if (step === 'success')   { resetSend(); goTo('home'); return }
    setSendStep('method')
  }

  // Sub-label for amount numpad
  const isNgn   = sendFlow.method === 'account'
  const num     = parseFloat(sendFlow.amount || '0')
  const subLabel = isNgn
    ? num > 0 ? `≈ $${(num / rateVal).toFixed(2)} USDC` : '≈ $0 USDC'
    : num > 0 ? `≈ ₦${(num * rateVal).toLocaleString('en-NG', { maximumFractionDigits:0 })} NGN` : '≈ ₦0 NGN'

  // ── PIN submit ────────────────────────────────────────────
  async function submitWithPin(enteredPin: string) {
    // Prototype: accept any 4-digit PIN
    // Integration: pass pin to backend as HMAC or derive signature
    setPinErr(false)
    setSendStep('processing')
    try {
      const { method, recipient, amount } = sendFlow
      const ref = 'CHZ-' + Math.random().toString(16).slice(2,8).toUpperCase()
      if (method === 'username') {
        await sendUsername.mutateAsync({ toUsername: recipient, amount: parseFloat(amount), reference: ref })
      } else if (method === 'evm') {
        await sendAddress.mutateAsync({ toAddress: evmAddr, amount: parseFloat(amount), reference: ref })
      } else if (method === 'account') {
        await bankTransfer.mutateAsync({
          accountNumber: recipient,
          bankCode:      'mock',
          amount:        parseFloat(amount),
          currency:      'NGN',
          reference:     ref,
        })
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BALANCE })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS(1) })
      setSendStep('success')
    } catch {
      setSendStep('pin')
      setPinErr(true)
      setPin('')
    }
  }

  function handlePinComplete(p: string) { submitWithPin(p) }

  // ── Steps ─────────────────────────────────────────────────
  const { step, method, recipient, recipientName, amount } = sendFlow
  const isMutation = sendUsername.isPending || sendAddress.isPending || bankTransfer.isPending
  const mutErr     = sendUsername.error?.message ?? sendAddress.error?.message ?? bankTransfer.error?.message

  const titleMap: Record<string, string> = {
    method:'Send', recipient:'Recipient', amount:'Amount',
    confirm:'Confirm', pin:'Authorise', processing:'Sending…', success:'Done',
  }

  return (
    <div className="screen active" id="screen-send">
      <ScreenHeader
        title={titleMap[step] ?? 'Send'}
        onBack={step !== 'success' ? handleBack : undefined}
        hideBack={step === 'success'}
      />

      {/* ── Step 0: Method picker ── */}
      {step === 'method' && (
        <div className="method-picker">
          {[
            { id:'username' as SendMethod, label:'By Username',        sub:'Zero fees between Cheese users.',          icon:<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>, cls:'musername' },
            { id:'account'  as SendMethod, label:'By Account Number',  sub:'Send Naira to any Nigerian bank account.', icon:<><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18"/><path d="M9 21V9"/></>,  cls:'maccount' },
            { id:'evm'      as SendMethod, label:'EVM Wallet Address',  sub:'Send USDC on Polygon, Base, Ethereum.',   icon:<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>, cls:'mevm' },
            { id:'qr'       as SendMethod, label:'Scan QR Code',        sub:'Point at any Cheese QR code.',            icon:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/></>, cls:'mqr' },
          ].map(({ id, label, sub, icon, cls }) => (
            <div key={id} className="method-card" onClick={() => setSendMethod(id)}>
              <div className={`method-icon-wrap ${cls}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">{icon}</svg>
              </div>
              <div className="method-text"><h3>{label}</h3><p>{sub}</p></div>
              <svg className="method-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
        </div>
      )}

      {/* ── Step 1a: Username search ── */}
      {step === 'recipient' && method === 'username' && (
        <div className="send-wrap">
          <div className="recipient-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search @username…" autoFocus />
          </div>
          <div className="recent-label">Recent Contacts</div>
          <div className="recents">
            {RECENT_CONTACTS.filter(c => !search || c.handle.includes(search.replace('@',''))).map(c => (
              <div key={c.handle} className="recent-contact" onClick={() => setSendRecipient(c.handle, '@' + c.handle)}>
                <div className="recent-avatar">{c.initial}</div>
                <div className="recent-name">@{c.handle}</div>
              </div>
            ))}
            {search && !search.startsWith('@') && (
              <div className="recent-contact" onClick={() => setSendRecipient(search, '@' + search)}>
                <div className="recent-avatar">{search[0]?.toUpperCase()}</div>
                <div className="recent-name">@{search}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 1b: EVM address ── */}
      {step === 'recipient' && method === 'evm' && (
        <div className="send-wrap">
          <div className="evm-field">
            <label>Recipient Address</label>
            <textarea value={evmAddr} onChange={e => setEvmAddr(e.target.value)} rows={2} placeholder="0x…" />
          </div>
          <div className="evm-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <p>Double-check the address. Crypto sent to the wrong address <strong style={{ color:'var(--danger)' }}>cannot be recovered.</strong> Only send on supported chains: Polygon, Base, Ethereum.</p>
          </div>
          <button className="evm-continue-btn" disabled={!/^0x[a-fA-F0-9]{40}$/.test(evmAddr)} onClick={() => setSendRecipient(evmAddr, evmAddr.slice(0,6) + '…' + evmAddr.slice(-4))}>
            Confirm Address →
          </button>
        </div>
      )}

      {/* ── Step 1c: QR ── */}
      {step === 'recipient' && method === 'qr' && (
        <div className="qr-scanner-wrap">
          <div className="qr-viewfinder">
            <div className="qr-corner tl"/><div className="qr-corner tr"/>
            <div className="qr-corner bl"/><div className="qr-corner br"/>
            <div className="qr-inner-grid">
              {Array.from({length:25}).map((_,i) => <div key={i} className="qr-cell" style={{ opacity: Math.random() > 0.4 ? 1 : 0 }} />)}
            </div>
          </div>
          <p className="qr-hint">Position the QR code within the frame.<br/>It will scan automatically.</p>
          <div className="qr-or"><div className="qr-or-line"/><span>or</span><div className="qr-or-line"/></div>
          <button className="paste-btn" onClick={() => setSendRecipient('0xPasted1234', '0xPasted…1234')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
            Paste from Clipboard
          </button>
        </div>
      )}

      {/* ── Step 2: Amount ── */}
      {step === 'amount' && (
        <div className="send-wrap" style={{ flexDirection:'column', alignItems:'center' }}>
          <div className="send-recipient-tag">
            <div className="avi">{(recipientName || recipient)[0]?.toUpperCase()}</div>
            <span>{recipientName || recipient}</span>
            <span style={{ color:'var(--muted)', cursor:'pointer', fontSize:11 }} onClick={() => setSendStep('recipient')}>✕</span>
          </div>
          <AmountNumpad
            value={amount}
            onChange={setSendAmount}
            currency={isNgn ? '₦' : '$'}
            subLabel={subLabel}
          />
          <button
            className="send-btn"
            disabled={!amount || parseFloat(amount) <= 0}
            onClick={() => setSendStep('confirm')}
            style={{ width:'calc(100% - 48px)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:15, height:15 }}><polyline points="9 18 15 12 9 6"/></svg>
            Review Transfer
          </button>
        </div>
      )}

      {/* ── Step 3: Confirm ── */}
      {step === 'confirm' && (
        <div className="send-wrap" style={{ flexDirection:'column' }}>
          <div style={{ padding:'20px 24px 12px' }}>
            <div className="auth-heading" style={{ fontSize:24, marginBottom:4 }}>Confirm transfer</div>
            <div className="auth-sub" style={{ marginBottom:16 }}>Review before sending</div>
          </div>
          <div className="send-confirm-card">
            <div className="sc-row"><span className="sc-key">To</span><span className="sc-val plain" style={{ fontFamily:'Syne,sans-serif' }}>{recipientName || recipient}</span></div>
            <div className="sc-row"><span className="sc-key">Amount</span><span className="sc-val big">{isNgn ? '₦' : '$'}{parseFloat(amount).toFixed(2)}</span></div>
            <div className="sc-row"><span className="sc-key">Fee</span><span className="sc-val green">{method === 'username' ? '$0.00 — Free' : '$0.25'}</span></div>
            <div className="sc-row"><span className="sc-key">Method</span><span className="sc-val plain" style={{ fontFamily:'Syne,sans-serif' }}>{{ username:'Username', account:'Bank transfer', evm:'EVM wallet', qr:'QR code' }[method!]}</span></div>
          </div>
          <div style={{ padding:'0 24px' }}>
            <button className="send-btn" style={{ width:'100%' }} onClick={() => { setPin(''); setPinErr(false); setSendStep('pin') }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:15, height:15 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Enter PIN to authorise
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: PIN ── */}
      {step === 'pin' && (
        <div className="send-wrap" style={{ flexDirection:'column', alignItems:'center' }}>
          <div style={{ padding:'20px 0 16px', textAlign:'center' }}>
            <div className="auth-heading" style={{ fontSize:24, marginBottom:4 }}>Enter PIN</div>
          </div>
          <ErrorBanner message={pinErr ? 'Incorrect PIN. Please try again.' : null} />
          <PinPad value={pin} onChange={setPin} onComplete={handlePinComplete} error={pinErr} label="4-digit transaction PIN" />
        </div>
      )}

      {/* ── Step 5: Processing ── */}
      {step === 'processing' && (
        <div className="send-processing">
          <div className="send-spin-ring" />
          <div className="send-proc-title">Processing transaction…</div>
        </div>
      )}

      {/* ── Step 6: Success ── */}
      {step === 'success' && (
        <div className="send-processing">
          <div className="send-success-ring">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={32} height={32}><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="send-success-amount">{isNgn ? '₦' : '$'}{parseFloat(amount).toFixed(2)}</div>
          <div className="send-success-to">Sent to {recipientName || recipient}</div>
          <div className="send-ref">{'CHZ-' + Math.random().toString(16).slice(2,8).toUpperCase()}</div>
          <button className="send-done-btn" onClick={() => { resetSend(); goTo('home') }}>Done</button>
        </div>
      )}
    </div>
  )
}
