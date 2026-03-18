'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Send Screen
// Method → Recipient → Amount → Confirm → PIN → Success
//
// Critical fixes:
//   [C1] Device signature via Web Crypto ECDSA (signTransaction)
//   [C2] PIN verified server-side before mutation fires
//   [C3] Payload shapes match API contract exactly
//   [C4] amountNgn used for bank transfers
// ─────────────────────────────────────────────────────────
import { useState, useEffect, useRef }          from 'react'
import { useUiStore }                           from '@/lib/stores/uiStore'
import { useExchangeRate }                      from '@/lib/hooks/useBanks'
import { useSendToUsername, useSendToAddress, useResolveUsername } from '@/lib/hooks/useWallet'
import { useVerifyPin }                         from '@/lib/hooks/useAuth'
import { useBankTransfer }                      from '@/lib/hooks/useBanks'
import { useAuthStore }                         from '@/lib/stores/authStore'
import { useQueryClient }                       from '@tanstack/react-query'
import { QUERY_KEYS }                           from '@/constants'
import { signTransaction, hashPin }             from '@/lib/crypto/deviceSigning'
import { ScreenHeader, AmountNumpad, PinPad, ErrorBanner } from '../../shared/UI'
import type { SendMethod }                      from '@/lib/stores/uiStore'

// ── QR Scanner ─────────────────────────────────────────────
// Uses BarcodeDetector (Chrome 88+, Android Chrome, Safari 17.4+).
// Falls back to manual paste on unsupported browsers.
function QRScannerStep({
  onResult,
  onPaste,
}: {
  onResult: (raw: string) => void
  onPaste: () => void
}) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [active,  setActive]  = useState(false)
  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    if (!hasBarcodeDetector) return
    let rafId = 0
    let stopped = false

    async function start() {
      // @ts-expect-error BarcodeDetector not yet in TS lib
      const detector = new BarcodeDetector({ formats: ['qr_code'] })

      async function scan() {
        if (stopped || !videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0) {
            stopped = true
            onResult(codes[0].rawValue)
            return
          }
        } catch { /* frame not ready */ }
        rafId = requestAnimationFrame(scan)
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setActive(true)
        }
        scan()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Camera unavailable')
      }
    }
    start()

    return () => {
      stopped = true
      cancelAnimationFrame(rafId)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <div className="qr-scanner-wrap">
      {hasBarcodeDetector && !error && (
        <div className="qr-viewfinder" style={{ position:'relative', overflow:'hidden' }}>
          <div className="qr-corner tl"/><div className="qr-corner tr"/>
          <div className="qr-corner bl"/><div className="qr-corner br"/>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width:'100%', height:'100%', objectFit:'cover', display: active ? 'block' : 'none' }}
          />
          {!active && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', color:'var(--muted)', fontSize:12 }}>
              Starting camera…
            </div>
          )}
        </div>
      )}

      {(!hasBarcodeDetector || error) && (
        <div style={{ background:'rgba(184,85,85,0.08)', border:'1px solid rgba(184,85,85,0.2)', borderRadius:12, padding:'14px 16px', fontSize:12, color:'var(--muted)', marginBottom:12 }}>
          {error ?? 'Camera scanning not supported on this browser.'}
        </div>
      )}

      <p className="qr-hint">
        {hasBarcodeDetector && !error
          ? 'Position the QR code within the frame. It will scan automatically.'
          : 'Paste a Cheese @username or EVM address instead.'}
      </p>
      <div className="qr-or"><div className="qr-or-line"/><span>or</span><div className="qr-or-line"/></div>
      <button className="paste-btn" onClick={onPaste}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
        Paste from Clipboard
      </button>
    </div>
  )
}

const RECENT_CONTACTS = [
  { handle: 'adaeze',   initial: 'A' },
  { handle: 'kolapo',   initial: 'K' },
  { handle: 'tobi.eth', initial: 'T' },
  { handle: 'chiamaka', initial: 'C' },
]

export function SendScreen() {
  const {
    goTo, sendFlow, setSendMethod, setSendStep,
    setSendRecipient, setSendAmount, resetSend, showToast,
  } = useUiStore()

  const { user, deviceKey }  = useAuthStore()
  const { data: rate }       = useExchangeRate()
  const sendUsername         = useSendToUsername()
  const sendAddress          = useSendToAddress()
  const bankTransfer         = useBankTransfer()
  const verifyPin            = useVerifyPin()
  const queryClient          = useQueryClient()
  const rateVal              = parseFloat(rate?.effectiveRate ?? '1610')

  const [evmAddr, setEvmAddr]   = useState('')
  const [pin,     setPin]       = useState('')
  const [pinErr,  setPinErr]    = useState<string | null>(null)
  const [search,  setSearch]    = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = search.replace('@', '')
    if (q.length >= 3) {
      debounceRef.current = setTimeout(() => setDebouncedSearch(q), 350)
    } else {
      setDebouncedSearch('')
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const usernameQuery = useResolveUsername(debouncedSearch)

  function handleBack() {
    const { step } = sendFlow
    if (step === 'method')    { resetSend(); goTo('home'); return }
    if (step === 'recipient') { setSendStep('method');    return }
    if (step === 'amount')    { setSendStep('recipient'); return }
    if (step === 'confirm')   { setSendStep('amount');    return }
    if (step === 'pin')       { setSendStep('confirm');   return }
    if (step === 'success')   { resetSend(); goTo('home'); return }
    setSendStep('method')
  }

  const isNgn    = sendFlow.method === 'account'
  const num      = parseFloat(sendFlow.amount || '0')
  const subLabel = isNgn
    ? num > 0 ? `\u2248 $${(num / rateVal).toFixed(2)} USDC` : '\u2248 $0 USDC'
    : num > 0 ? `\u2248 \u20a6${(num * rateVal).toLocaleString('en-NG', { maximumFractionDigits: 0 })} NGN` : '\u2248 \u20a60 NGN'

  // ── PIN submit ────────────────────────────────────────────
  // [C2] Verify PIN server-side first. [C1] Sign with device key. [C3/C4] Correct payload fields.
  async function submitWithPin(enteredPin: string) {
    setPinErr(null)
    setSendStep('processing')
    try {
      const pinHash = await hashPin(enteredPin, deviceKey?.id ?? '')
      const { valid } = await verifyPin.mutateAsync({ pinHash, deviceId: deviceKey?.id ?? '' })
      if (!valid) {
        setSendStep('pin')
        setPinErr('Incorrect PIN. Please try again.')
        setPin('')
        return
      }
      if (!deviceKey?.id) {
        setSendStep('pin')
        setPinErr('Device key missing. Go to Security \u2192 Register Device.')
        setPin('')
        return
      }
      const { method, recipient, amount } = sendFlow
      const finalRecipient = method === 'evm' ? evmAddr : recipient
      const amountStr      = parseFloat(amount).toFixed(isNgn ? 0 : 6)
      const sigData = await signTransaction({
        deviceId:  deviceKey.id,
        userId:    user?.id ?? '',
        action:    method === 'username' ? 'send_username'
                 : method === 'evm'      ? 'send_address'
                 :                        'bank_transfer',
        amount:    amountStr,
        recipient: finalRecipient,
      })
      if (method === 'username') {
        // [C3] username/amountUsdc — not toUsername/amount
        await sendUsername.mutateAsync({
          username:        recipient,
          amountUsdc:      amountStr,
          pin:             enteredPin,
          deviceSignature: sigData.deviceSignature,
          deviceId:        sigData.deviceId,
        })
      } else if (method === 'evm') {
        // [C3] address/amountUsdc — not toAddress/amount
        await sendAddress.mutateAsync({
          address:         evmAddr,
          amountUsdc:      amountStr,
          network:         'arbitrum',
          pin:             enteredPin,
          deviceSignature: sigData.deviceSignature,
          deviceId:        sigData.deviceId,
        })
      } else if (method === 'account') {
        // [C4] amountNgn — not amount
        await bankTransfer.mutateAsync({
          accountNumber:   recipient,
          bankCode:        'mock',
          accountName:     recipientName,
          amountNgn:       amount,
          amountUsdc:      (parseFloat(amount) / parseFloat(rate?.effectiveRate ?? '1610')).toFixed(6),
          pin:             enteredPin,
          deviceSignature: sigData.deviceSignature,
          deviceId:        sigData.deviceId,
        })
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BALANCE })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS(1) })
      setSendStep('success')
    } catch (err: unknown) {
      setSendStep('pin')
      setPinErr(err instanceof Error ? err.message : 'Transaction failed. Please try again.')
      setPin('')
    }
  }

  const { step, method, recipient, recipientName, amount } = sendFlow
  const isPending = verifyPin.isPending || sendUsername.isPending || sendAddress.isPending || bankTransfer.isPending

  const titleMap: Record<string, string> = {
    method: 'Send', recipient: 'Recipient', amount: 'Amount',
    confirm: 'Confirm', pin: 'Authorise', processing: 'Sending\u2026', success: 'Done',
  }

  const methodLabel: Record<string, string> = {
    username: 'Username transfer',
    account:  'Bank transfer (NGN)',
    evm:      'EVM wallet',
    qr:       'QR code',
  }

  return (
    <div className="screen active" id="screen-send">
      <ScreenHeader
        title={titleMap[step] ?? 'Send'}
        onBack={step !== 'success' && step !== 'processing' ? handleBack : undefined}
        hideBack={step === 'success' || step === 'processing'}
      />

      {/* ── Step 0: Method ── */}
      {step === 'method' && (
        <div className="method-picker">
          {([
            { id:'username' as SendMethod, label:'By Username',       sub:'Zero fees between Cheese users.',          icon:<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>,  cls:'musername' },
            { id:'account'  as SendMethod, label:'By Account Number', sub:'Send Naira to any Nigerian bank account.', icon:<><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18"/><path d="M9 21V9"/></>,  cls:'maccount' },
            { id:'evm'      as SendMethod, label:'EVM Wallet Address', sub:'Send USDC on Polygon, Base, Ethereum.',   icon:<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>, cls:'mevm' },
            { id:'qr'       as SendMethod, label:'Scan QR Code',       sub:'Point at any Cheese QR code.',            icon:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/></>, cls:'mqr' },
          ] as const).map(({ id, label, sub, icon, cls }) => (
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

       {/* ── Step 1a: Username (debounced lookup) ── */}
      {step === 'recipient' && method === 'username' && (
        <div className="send-wrap">
          <div className="recipient-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search @username…"
              autoFocus
            />
            {usernameQuery.isFetching && (
              <span style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>…</span>
            )}
          </div>

          {/* Verified live result */}
          {usernameQuery.data && (
            <div
              className="recent-contact"
              style={{ margin:'8px 0 4px', background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:12 }}
              onClick={() => setSendRecipient(usernameQuery.data!.username, '@' + usernameQuery.data!.username)}
            >
              <div className="recent-avatar" style={{ background:'var(--gold)', color:'#0a0904' }}>
                {usernameQuery.data.username[0]?.toUpperCase()}
              </div>
              <div>
                <div className="recent-name">@{usernameQuery.data.username}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>Verified Cheese user</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:14,height:14,stroke:'var(--success)',marginLeft:'auto',flexShrink:0 }}><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          )}

          {/* Not found */}
          {usernameQuery.isError && debouncedSearch && (
            <div style={{ fontSize:12, color:'var(--danger)', padding:'6px 4px' }}>
              @{debouncedSearch} not found on Cheese
            </div>
          )}

          {/* Recent contacts (hidden while searching) */}
          {!debouncedSearch && (
            <>
              <div className="recent-label">Recent Contacts</div>
              <div className="recents">
                {RECENT_CONTACTS
                  .filter(rc => !search || rc.handle.includes(search.replace('@', '')))
                  .map(rc => (
                    <div key={rc.handle} className="recent-contact" onClick={() => setSendRecipient(rc.handle, '@' + rc.handle)}>
                      <div className="recent-avatar">{rc.initial}</div>
                      <div className="recent-name">@{rc.handle}</div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}    {/* ── Step 1a: Username ── */}
      {step === 'recipient' && method === 'username' && (
        <div className="send-wrap">
          <div className="recipient-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search @username\u2026" autoFocus />
          </div>
          <div className="recent-label">Recent Contacts</div>
          <div className="recents">
            {RECENT_CONTACTS.filter(c => !search || c.handle.includes(search.replace('@', ''))).map(c => (
              <div key={c.handle} className="recent-contact" onClick={() => setSendRecipient(c.handle, '@' + c.handle)}>
                <div className="recent-avatar">{c.initial}</div>
                <div className="recent-name">@{c.handle}</div>
              </div>
            ))}
            {search && (
              <div className="recent-contact" onClick={() => setSendRecipient(search.replace('@',''), '@' + search.replace('@',''))}>
                <div className="recent-avatar">{search.replace('@','')[0]?.toUpperCase()}</div>
                <div className="recent-name">@{search.replace('@','')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 1b: EVM ── */}
      {step === 'recipient' && method === 'evm' && (
        <div className="send-wrap">
          <div className="evm-field">
            <label>Recipient Address</label>
            <textarea value={evmAddr} onChange={e => setEvmAddr(e.target.value.trim())} rows={2} placeholder="0x\u2026" />
          </div>
          <div className="evm-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <p>Double-check the address. Crypto sent to the wrong address <strong style={{ color:'var(--danger)' }}>cannot be recovered.</strong></p>
          </div>
          {evmAddr && !/^0x[a-fA-F0-9]{40}$/.test(evmAddr) && (
            <div style={{ fontSize:12, color:'var(--danger)', padding:'0 4px 12px' }}>Invalid \u2014 must be 0x + 40 hex characters</div>
          )}
          <button className="evm-continue-btn" disabled={!/^0x[a-fA-F0-9]{40}$/.test(evmAddr)} onClick={() => setSendRecipient(evmAddr, evmAddr.slice(0,6) + '\u2026' + evmAddr.slice(-4))}>
            Confirm Address \u2192
          </button>
        </div>
      )}

      {/* ── Step 1c: QR Scanner ── */}
      {step === 'recipient' && method === 'qr' && (
        <QRScannerStep
          onResult={(raw) => {
            const t = raw.trim()
            // EVM address (bare or EIP-681 URI)
            const evmMatch = t.match(/^(?:ethereum:|usdcpay:|cheese:)?(0x[a-fA-F0-9]{40})/)
            if (evmMatch) {
              setSendRecipient(evmMatch[1], evmMatch[1].slice(0,6) + '\u2026' + evmMatch[1].slice(-4))
              return
            }
            // @username or cheesewallet.app/@username deep link
            const userMatch = t.match(/(?:cheesewallet\.app\/)?@([a-zA-Z0-9_.]{3,30})$/)
            if (userMatch) {
              setSendRecipient(userMatch[1], '@' + userMatch[1])
              return
            }
            // Bare alphanumeric — treat as username (last resort)
            if (/^[a-zA-Z0-9_.]{3,30}$/.test(t)) {
              setSendRecipient(t, '@' + t)
              return
            }
            showToast('Unknown QR code', 'Scan a Cheese @username or EVM wallet address')
          }}
          onPaste={async () => {
            try {
              const text = await navigator.clipboard.readText()
              const t = text.trim()
              if (/^0x[a-fA-F0-9]{40}$/.test(t)) {
                setSendRecipient(t, t.slice(0,6) + '\u2026' + t.slice(-4))
              } else if (/^[a-zA-Z0-9_.]{3,30}$/.test(t.replace('@',''))) {
                const u = t.replace('@','')
                setSendRecipient(u, '@' + u)
              } else {
                showToast('Invalid input', 'Paste an EVM address or @username')
              }
            } catch {
              showToast('Permission denied', 'Allow clipboard access and try again')
            }
          }}
        />
      )}

      {/* ── Step 2: Amount ── */}
      {step === 'amount' && (
        <div className="send-wrap" style={{ flexDirection:'column', alignItems:'center' }}>
          <div className="send-recipient-tag">
            <div className="avi">{(recipientName || recipient)[0]?.toUpperCase()}</div>
            <span>{recipientName || recipient}</span>
            <span style={{ color:'var(--muted)', cursor:'pointer', fontSize:11 }} onClick={() => setSendStep('recipient')}>\u2715</span>
          </div>
          <AmountNumpad value={amount} onChange={setSendAmount} currency={isNgn ? '\u20a6' : '$'} subLabel={subLabel} />
          <button className="send-btn" disabled={!amount || parseFloat(amount) <= 0} onClick={() => setSendStep('confirm')} style={{ width:'calc(100% - 48px)' }}>
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
            <div className="auth-sub" style={{ marginBottom:16 }}>Review carefully before sending</div>
          </div>
          <div className="send-confirm-card">
            <div className="sc-row"><span className="sc-key">To</span><span className="sc-val plain">{recipientName || recipient}</span></div>
            <div className="sc-row"><span className="sc-key">Amount</span><span className="sc-val big">{isNgn ? '\u20a6' : '$'}{parseFloat(amount).toFixed(isNgn ? 0 : 2)}</span></div>
            <div className="sc-row"><span className="sc-key">Fee</span><span className="sc-val green">{method === 'username' ? '$0.00 \u2014 Free' : '$0.25'}</span></div>
            <div className="sc-row"><span className="sc-key">Method</span><span className="sc-val plain">{method ? (methodLabel[method] ?? method) : ''}</span></div>
            {!deviceKey?.id && (
              <div style={{ background:'rgba(184,85,85,0.1)', border:'1px solid rgba(184,85,85,0.2)', borderRadius:10, padding:'10px 14px', marginTop:12, fontSize:12, color:'var(--danger)' }}>
                \u26a0 No device key found. Go to Security \u2192 Register Device before sending.
              </div>
            )}
          </div>
          <div style={{ padding:'0 24px' }}>
            <button className="send-btn" style={{ width:'100%' }} disabled={!deviceKey?.id}
              onClick={() => { setPin(''); setPinErr(null); setSendStep('pin') }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:15, height:15 }}>
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Enter PIN to authorise
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: PIN ── */}
      {step === 'pin' && (
        <div className="send-wrap" style={{ flexDirection:'column', alignItems:'center' }}>
          <div style={{ padding:'20px 0 8px', textAlign:'center' }}>
            <div className="auth-heading" style={{ fontSize:24, marginBottom:4 }}>Enter PIN</div>
            <div className="auth-sub">Verified securely on server</div>
          </div>
          <ErrorBanner message={pinErr} />
          <PinPad value={pin} onChange={setPin} onComplete={submitWithPin} error={!!pinErr} label="4-digit transaction PIN" />
          {isPending && <div style={{ fontSize:12, color:'var(--muted)', marginTop:12 }}>Verifying\u2026</div>}
        </div>
      )}

      {/* ── Step 5: Processing ── */}
      {step === 'processing' && (
        <div className="send-processing">
          <div className="send-spin-ring" />
          <div className="send-proc-title">Processing transaction\u2026</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:8, letterSpacing:1 }}>Signing with device key</div>
        </div>
      )}

      {/* ── Step 6: Success ── */}
      {step === 'success' && (
        <div className="send-processing">
          <div className="send-success-ring">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={32} height={32}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="send-success-amount">{isNgn ? '\u20a6' : '$'}{parseFloat(amount).toFixed(isNgn ? 0 : 2)}</div>
          <div className="send-success-to">Sent to {recipientName || recipient}</div>
          <div className="send-ref">CHZ-{Math.random().toString(16).slice(2,8).toUpperCase()}</div>
          <button className="send-done-btn" onClick={() => { resetSend(); goTo('home') }}>Done</button>
        </div>
      )}
    </div>
  )
}
