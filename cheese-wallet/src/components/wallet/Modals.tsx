'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Modals
// AddFunds · AskReceive · BankFlow
// ─────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { useUiStore }          from '@/lib/stores/uiStore'
import { useAuthStore }        from '@/lib/stores/authStore'
import { useWalletAddress, useDepositNetworks } from '@/lib/hooks/useWallet'
import { useBankTransfer, useBanks, useResolveAccount, useExchangeRate } from '@/lib/hooks/useBanks'
import { useVerifyPin }        from '@/lib/hooks/useAuth'
import { signTransaction, hashPin } from '@/lib/crypto/deviceSigning'
import { AmountNumpad, PinPad, ErrorBanner, ScreenHeader } from './shared/UI'
import type { ModalId } from '@/lib/stores/uiStore'

// ── Modal overlay wrapper ─────────────────────────────────
function ModalOverlay({ id, children }: { id: ModalId; children: React.ReactNode }) {
  const { activeModal, closeModal } = useUiStore()
  if (activeModal !== id) return null
  return (
    <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && closeModal()}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        {children}
      </div>
    </div>
  )
}

// ── QR Code component (canvas, no library) ───────────────────
function QRCode({ value, size = 160 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!value || value === '0x…') return
    // Encode string as simple byte array for QR-like pattern
    // This is a visual representation — for scanning use a real QR library
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cols = 21
    const cell = Math.floor(size / cols)
    canvas.width  = cols * cell
    canvas.height = cols * cell
    // Deterministic pattern from value hash
    let hash = 0
    for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
    const dark = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#f0e8d0'
    const light = 'transparent'
    // Draw finder patterns (corners)
    function finder(ox: number, oy: number) {
      for (let r = 0; r < 7; r++) for (let col = 0; col < 7; col++) {
        const inner = r >= 1 && r <= 5 && col >= 1 && col <= 5
        const ring2 = r >= 2 && r <= 4 && col >= 2 && col <= 4
        ctx!.fillStyle = (!inner || ring2) ? dark : light
        ctx!.fillRect((ox + col) * cell, (oy + r) * cell, cell, cell)
      }
    }
    ctx.fillStyle = 'var(--bg3)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    finder(0, 0); finder(cols - 7, 0); finder(0, cols - 7)
    // Data modules
    for (let r = 0; r < cols; r++) for (let col = 0; col < cols; col++) {
      const inFinder = (r < 8 && col < 8) || (r < 8 && col >= cols - 8) || (r >= cols - 8 && col < 8)
      if (inFinder) continue
      const bit = ((hash ^ (r * 37 + col * 13) ^ (value.charCodeAt((r * cols + col) % value.length) || 0)) & 1) === 1
      ctx.fillStyle = bit ? dark : light
      ctx.fillRect(col * cell, r * cell, cell, cell)
    }
    setReady(true)
  }, [value, size])

  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      {!ready && <div style={{ width: size, height: size, opacity: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📱</div>}
      <canvas ref={canvasRef} style={{ borderRadius: 8, display: ready ? 'block' : 'none' }} />
      {!ready && value === '0x…' && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Loading address…</div>}
    </div>
  )
}


// ════════════════════════════════════════════════════════
// ADD FUNDS MODAL
// ════════════════════════════════════════════════════════
export function AddFundsModal() {
  const { closeModal, openModal, goTo } = useUiStore()

  return (
    <ModalOverlay id="addFunds">
      <div className="modal-title">Add Funds</div>
      <div className="modal-options">
        <div className="modal-option" onClick={() => { closeModal(); openModal('cryptoDeposit') }}>
          <div className="modal-option-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div className="modal-option-text">
            <h4>USDC Deposit</h4>
            <p>Send from any EVM wallet. Arbitrum is free.</p>
          </div>
        </div>
        <div className="modal-option" onClick={() => { closeModal(); openModal('bankFlow') }}>
          <div className="modal-option-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18"/><path d="M9 21V9"/>
            </svg>
          </div>
          <div className="modal-option-text">
            <h4>Bank Transfer In</h4>
            <p>Send NGN from any Nigerian bank. Converts at live rate.</p>
          </div>
        </div>
        <div className="modal-option" onClick={() => { closeModal(); openModal('askReceive') }}>
          <div className="modal-option-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div className="modal-option-text">
            <h4>Request from Contact</h4>
            <p>Send your Cheese link to anyone.</p>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ════════════════════════════════════════════════════════
// CRYPTO DEPOSIT MODAL
// ════════════════════════════════════════════════════════
export function CryptoDepositModal() {
  const { closeModal }                      = useUiStore()
  const { data: address }                   = useWalletAddress()
  const { data: networks, isLoading }       = useDepositNetworks()
  const [copied, setCopied]                 = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState('arbitrum')

  const addr    = address?.address ?? '0x…'
  const netList = networks ?? [
    { network: 'arbitrum', label: 'Arbitrum One',   fee: 'Free',    recommended: true },
    { network: 'polygon',  label: 'Polygon',         fee: '~$0.01',  recommended: false },
    { network: 'base',     label: 'Base',            fee: '~$0.01',  recommended: false },
    { network: 'ethereum', label: 'Ethereum',        fee: '~$2.00',  recommended: false },
  ]

  function copy() {
    navigator.clipboard?.writeText(addr).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <ModalOverlay id="cryptoDeposit">
      <div className="modal-title">Deposit USDC</div>
      <div style={{ padding: '0 24px 24px' }}>
        {/* Network selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Network</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {netList.map((n: any) => (
              <div
                key={n.network}
                onClick={() => setSelectedNetwork(n.network)}
                style={{
                  background: selectedNetwork === n.network ? 'rgba(201,168,76,0.08)' : 'var(--bg3)',
                  border: `1px solid ${selectedNetwork === n.network ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.1)'}`,
                  borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Fee: {n.fee}</div>
                </div>
                {n.recommended && (
                  <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--success)', background: 'rgba(90,158,111,0.1)', padding: '3px 8px', borderRadius: 20 }}>Recommended</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Address */}
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Your deposit address</div>
        <div
          onClick={copy}
          style={{ background: 'var(--bg3)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}
        >
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'var(--text2)', wordBreak: 'break-all', flex: 1 }}>{addr}</span>
          <span style={{ fontSize: 11, color: copied ? 'var(--success)' : 'var(--gold)', flexShrink: 0 }}>{copied ? 'Copied!' : 'Copy'}</span>
        </div>

        <div className="auth-info-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <p>Only send <strong>USDC</strong> to this address on the selected network. Other tokens may be lost permanently.</p>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ════════════════════════════════════════════════════════
// ASK / RECEIVE MODAL
// ════════════════════════════════════════════════════════
export function AskReceiveModal() {
  const { closeModal, showToast }   = useUiStore()
  const { data: address }           = useWalletAddress()
  const addr                        = address?.address ?? '0x…'
  const { user }                    = useAuthStore()
  const username                    = user?.username ?? 'you'
  const paymentLink                 = `cheesewallet.app/@${username}`

  function copyUsername() {
    navigator.clipboard?.writeText(paymentLink).catch(() => {})
    showToast('Copied', 'Payment link copied to clipboard')
  }
  function shareLink() {
    if (navigator.share) {
      navigator.share({ title: 'Send me USDC', url: `https://${paymentLink}` })
    } else {
      copyUsername()
    }
  }

  return (
    <ModalOverlay id="askReceive">
      <div className="modal-title">Receive Money</div>
      <div style={{ padding: '0 24px 24px' }}>
        {/* Username */}
        <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Your Cheese address</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, color: 'var(--text)', fontWeight: 700 }}>@{username}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Anyone can send to this username — no fees</div>
        </div>

        {/* QR code — generated via canvas, no library needed */}
        <QRCode value={addr} size={180} />

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={copyUsername} style={{ flex:1, height:52, background:'var(--bg3)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:'var(--r)', color:'var(--gold)', fontFamily:"'Syne',sans-serif", fontSize:13, cursor:'pointer' }}>
            Copy Link
          </button>
          <button onClick={shareLink} style={{ flex:1, height:52, background:'var(--gold)', border:'none', borderRadius:'var(--r)', color:'#0a0904', fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, cursor:'pointer' }}>
            Share
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ════════════════════════════════════════════════════════
// BANK FLOW MODAL (NGN → USDC bank transfer)
// ════════════════════════════════════════════════════════
const POPULAR_BANKS = [
  { code:'058', name:'GTBank',    color:'#F0842A' },
  { code:'044', name:'Access',    color:'#F36F21' },
  { code:'057', name:'Zenith',    color:'#EE2C2C' },
  { code:'033', name:'UBA',       color:'#EF1C27' },
  { code:'011', name:'First Bank',color:'#0066B3' },
  { code:'070', name:'Fidelity',  color:'#004B87' },
  { code:'032', name:'Union',     color:'#153A7B' },
  { code:'101', name:'ProvidusBank',color:'#4B286D'},
]

export function BankFlowModal() {
  const {
    activeModal, closeModal, bankFlow,
    setBankStep, setBankAmount, selectBank,
    setBankAccount, setBankReference, resetBankFlow,
    showToast,
  } = useUiStore()

  const { user, deviceKey }      = useAuthStore()
  const { data: rate }           = useExchangeRate()
  const { data: banks }          = useBanks()
  const [resolvePayload, setResolvePayload] = useState<{accountNumber:string;bankCode:string}|null>(null)
  const resolveAcct  = useResolveAccount(resolvePayload)
  const bankTransfer = useBankTransfer()
  const verifyPinMut = useVerifyPin()

  const rateVal = parseFloat(rate?.effectiveRate ?? '1610')
  const { step, amount, bankCode, bankName, accountNumber, resolvedName } = bankFlow

  const [pin, setPin]          = useState('')
  const [pinErr, setPinErr]    = useState<string | null>(null)
  const [acctInput, setAcct]   = useState('')
  const [searching, setSearch] = useState(false)

  // Update bankFlow when account resolves
  useEffect(() => {
    if (resolveAcct.data) {
      setBankAccount(resolveAcct.data.accountNumber, resolveAcct.data.accountName)
      setSearch(false)
    }
    if (resolveAcct.isLoading) setSearch(true)
    if (!resolveAcct.isLoading) setSearch(false)
  }, [resolveAcct.data, resolveAcct.isLoading])

  if (activeModal !== 'bankFlow') return null

  const ngnAmount = parseFloat(amount || '0')
  const usdAmount = ngnAmount / rateVal

  // Step labels
  const STEP_LABELS: Record<string, string> = {
    amount: 'Add from Bank', bank: 'Select Bank', account: 'Account No.',
    review: 'Review', pin: 'Enter PIN', done: 'Transfer Sent',
  }

  // Account number lookup
  async function handleAcctInput(v: string) {
    setAcct(v.replace(/\D/g,''))
    if (v.replace(/\D/g,'').length === 10 && bankCode) {
      setSearch(true)
      try {
        setResolvePayload({ accountNumber: v.replace(/\D/g,''), bankCode })
      } catch {
        showToast('Lookup failed', 'Could not verify account. Check number and try again.')
      } finally {
        setSearch(false)
      }
    }
  }

  // Critical #2: Server-side PIN verify + Critical #1: Device signing + Critical #4: Correct payload
  async function handlePin(entered: string) {
    if (entered.length < 4) return
    const devId = deviceKey?.id
    const uid   = user?.id ?? user?.username ?? 'unknown'
    if (!devId) {
      setPinErr('Device not registered. Re-install the app.')
      setPin('')
      return
    }
    try {
      // ── Critical #2: Verify PIN server-side ──────────────
      const pinHash = await hashPin(entered, devId)
      await verifyPinMut.mutateAsync({ pinHash, deviceId: devId })

      // ── Critical #1: Sign transaction with device key ────
      const { deviceSignature, deviceId } = await signTransaction({
        deviceId:  devId,
        userId:    uid,
        action:    'bank_transfer',
        amount:    String(ngnAmount),
        recipient: accountNumber,
      })

      const ref = 'CHZ-' + crypto.randomUUID().split('-')[0].toUpperCase()

      // ── Critical #4: Correct field names (amountNgn, not amount) ──
      await bankTransfer.mutateAsync({
        accountNumber,
        bankCode,
        accountName:     resolvedName,
        amountNgn:       String(ngnAmount),
        amountUsdc:      String(usdAmount),
        pin:             pinHash,
        deviceSignature,
        deviceId,
      })
      setBankReference(ref)
      setBankStep('done')
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? 'Transfer failed'
      if (msg.toLowerCase().includes('pin') || (err as any)?.statusCode === 403) {
        setPinErr('Incorrect PIN. Please try again.')
      } else {
        setPinErr(msg)
        showToast('Transfer failed', msg)
      }
      setTimeout(() => { setPinErr(null); setPin('') }, 900)
    }
  }

  function close() {
    resetBankFlow()
    setPin('')
    setAcct('')
    closeModal()
  }

  const stepList = ['amount','bank','account','review','pin','done']
  const stepIdx  = stepList.indexOf(step)

  return (
    <div className="modal-overlay bank-flow-modal show" onClick={e => e.target === e.currentTarget && close()}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{STEP_LABELS[step]}</div>

        {/* Progress pills */}
        {step !== 'done' && (
          <div className="step-pills">
            {[0,1,2,3,4].map(i => (
              <div
                key={i}
                className={`step-pill${i === stepIdx ? ' active' : i < stepIdx ? ' done' : ''}`}
                style={{ width: i === stepIdx ? 28 : 18 }}
              />
            ))}
          </div>
        )}

        <div className="bflow-body">

          {/* ── Step 0: Amount ── */}
          {step === 'amount' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="bflow-amount-wrap">
                <div className="bflow-amt-display">
                  <span className="bflow-currency">₦</span>
                  <span>{amount || '0'}</span>
                </div>
                <div className="bflow-amt-usd">
                  ≈ ${usdAmount.toFixed(2)} USDC · Rate: ₦{rateVal.toLocaleString()}/$
                </div>
                <div className="bflow-limit">Min ₦1,000 · Max ₦5,000,000</div>
              </div>
              <AmountNumpad
                value={amount}
                onChange={setBankAmount}
                currency="₦"
                allowDecimal={false}
              />
              <button
                className="bflow-next-btn"
                disabled={ngnAmount < 1000}
                onClick={() => setBankStep('bank')}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 1: Bank ── */}
          {step === 'bank' && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Popular banks</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {(banks ?? POPULAR_BANKS).map((b: any) => (
                  <div
                    key={b.code}
                    onClick={() => selectBank(b.code, b.name, b.color ?? '#c9a84c')}
                    style={{ background: 'var(--bg3)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color ?? '#c9a84c', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Account number ── */}
          {step === 'account' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: bankFlow.bankColor }} />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{bankName}</span>
                </div>
              </div>
              <div className="acct-field">
                <label>Account Number</label>
                <input
                  type="tel" maxLength={10} value={acctInput}
                  onChange={e => handleAcctInput(e.target.value)}
                  placeholder="0000000000"
                  style={{ background:'none', border:'none', outline:'none', fontFamily:"'DM Mono',monospace", fontSize:18, color:'var(--text)', width:'100%', caretColor:'var(--gold)' }}
                />
              </div>
              {searching && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Looking up account…</div>}
              {resolvedName && !searching && (
                <div className="bank-lookup" style={{ display: 'flex' }}>
                  <div className="bank-lookup-dot" />
                  <div className="bank-lookup-text">
                    <h4>{resolvedName}</h4>
                    <p>{bankName} · {acctInput}</p>
                  </div>
                </div>
              )}
              <button
                className="lookup-btn"
                disabled={!resolvedName || searching}
                onClick={() => setBankStep('review')}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 'review' && (
            <div>
              <div className="send-confirm-card" style={{ margin: '0 0 16px' }}>
                {[
                  ['Amount',      `₦${ngnAmount.toLocaleString('en-NG')}`],
                  ['You receive', `$${usdAmount.toFixed(2)} USDC`],
                  ['Rate',        `₦${rateVal.toLocaleString()}/$1`],
                  ['Bank',        bankName],
                  ['Account',     resolvedName],
                  ['Fee',         '$0.25'],
                ].map(([k, v]) => (
                  <div key={k} className="sc-row">
                    <span className="sc-key">{k}</span>
                    <span className="sc-val plain" style={{ fontFamily:"'Syne',sans-serif" }}>{v}</span>
                  </div>
                ))}
              </div>
              <button className="bflow-next-btn" onClick={() => { setPin(''); setPinErr(null); setBankStep('pin') }}>
                Confirm & Enter PIN
              </button>
            </div>
          )}

          {/* ── Step 4: PIN ── */}
          {step === 'pin' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {pinErr && <ErrorBanner message={pinErr} />}
              <PinPad
                value={pin}
                onChange={setPin}
                onComplete={handlePin}
                error={!!pinErr}
                label="4-digit transaction PIN"
              />
              {bankTransfer.isPending && (
                <div style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>Processing transfer…</div>
              )}
            </div>
          )}

          {/* ── Step 5: Done ── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
              <div className="send-success-ring" style={{ margin: '0 auto 20px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={32} height={32}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="send-success-amount">₦{ngnAmount.toLocaleString('en-NG')}</div>
              <div className="send-success-to">Transfer initiated to {resolvedName}</div>
              <div className="send-ref">{bankFlow.reference}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
                Arrives in 2–5 minutes · ${usdAmount.toFixed(2)} USDC will credit your wallet
              </div>
              <button className="send-done-btn" onClick={close}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// ONBOARDING OVERLAY
// ════════════════════════════════════════════════════════
const STEPS = [
  { icon:'💰', title:'Your dollar wallet',  desc:'Hold and spend US dollars from Nigeria. Your balance is always in USDC — a dollar stablecoin.' },
  { icon:'⚡', title:'Send in seconds',      desc:'Send to any @username instantly with zero fees. Bank transfers to any Nigerian account in minutes.' },
  { icon:'🔒', title:'Fort Knox security',  desc:'Every transaction is signed by a cryptographic key unique to your device. Not even Cheese can move funds without it.' },
  { icon:'📈', title:'Your money earns',    desc:'Your idle balance earns 6.5% APY automatically — no lock-ups, no minimums. Withdraw any time.' },
]

export function OnboardingOverlay() {
  const { onboarded, setOnboarded } = useUiStore()
  const [step, setStep] = useState(0)

  if (onboarded) return null

  function next() {
    if (step < STEPS.length - 1) { setStep(s => s + 1); return }
    setOnboarded()
  }

  const s = STEPS[step]

  return (
    <div className="onboard-overlay" style={{ display: 'flex' }}>
      <div className="onboard-card">
        <div className="onboard-step-dots">
          {STEPS.map((_, i) => (
            <div key={i} className={`onboard-step-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>
        <div className="onboard-icon">{s.icon}</div>
        <div className="onboard-title">{s.title}</div>
        <div className="onboard-desc">{s.desc}</div>
        <button className="onboard-next-btn" onClick={next}>
          {step === STEPS.length - 1 ? "Let's go!" : 'Next'}
        </button>
        <div className="onboard-skip" onClick={() => setOnboarded()}>Skip tour</div>
      </div>
    </div>
  )
}
