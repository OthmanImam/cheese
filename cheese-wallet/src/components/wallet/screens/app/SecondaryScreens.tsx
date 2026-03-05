'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Secondary Screens
// Notifications · TxDetail · AppLock · KYC
// Security · ProfileEdit · Earn · Support
// ─────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { useAuthStore }   from '@/lib/stores/authStore'
import { useUiStore }     from '@/lib/stores/uiStore'
import { useMe }          from '@/lib/hooks/useAuth'
import { ScreenHeader, PinPad, ErrorBanner, InfoChip, AuthBtn, AuthField } from '../../shared/UI'
import type { TxDetailData } from '@/lib/stores/uiStore'

// ════════════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════════════
interface Notif {
  id:      number
  type:    'money' | 'security' | 'system'
  title:   string
  time:    string
  unread:  boolean
  onTap?:  () => void
}

export function NotificationsScreen() {
  const { goTo, openTxDetail, showToast } = useUiStore()
  const [notifs, setNotifs] = useState<Notif[]>([
    { id:1, type:'money',    title:'You received $50.00 from @adaeze',              time:'2:14 PM',  unread:true,  onTap: () => openTxDetail({ type:'in',  amount:'+$50.00',  desc:'Received from @adaeze', date:'Today, 2:14 PM',  ref:'CHZ-28941F', hash:'0xf4b2…a91c', network:'Arbitrum', fee:'$0.00 — Free', status:'confirmed' }) },
    { id:2, type:'security', title:'New device login — iPhone 16 Pro, Lagos',       time:'9:41 AM',  unread:true,  onTap: () => goTo('security') },
    { id:3, type:'money',    title:'₦41,500 sent to Adaeze Okonkwo — GTBank',       time:'Yesterday',unread:false },
    { id:4, type:'system',   title:'Rate updated — ₦1,612/$. Your next transfer uses this rate.', time:'Yesterday',unread:false },
    { id:5, type:'money',    title:'$200.00 received from @tobi.eth — Arbitrum',    time:'Mon',      unread:false, onTap: () => openTxDetail({ type:'in',  amount:'+$200.00', desc:'Received from @tobi.eth',date:'Yesterday, 3:10 PM',ref:'CHZ-71023A',hash:'0x31ae…0cc4',network:'Arbitrum',fee:'$0.00 — Free',status:'confirmed' }) },
    { id:6, type:'system',   title:'KYC approved. Gold tier is now active.',        time:'Mon',      unread:false },
  ])

  function markRead(id: number) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n))
  }
  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })))
    showToast('All read', 'Notifications marked as read')
  }

  const unreadCount = notifs.filter(n => n.unread).length
  const todayNotifs = notifs.slice(0, 2)
  const restNotifs  = notifs.slice(2)

  function NotifIcon({ type }: { type: Notif['type'] }) {
    return (
      <div className={`notif-icon type-${type}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {type === 'money'    && <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>}
          {type === 'security' && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>}
          {type === 'system'   && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
        </svg>
      </div>
    )
  }

  function NotifItem({ n }: { n: Notif }) {
    return (
      <div
        className={`notif-item${n.unread ? ' unread' : ''}`}
        onClick={() => { markRead(n.id); n.onTap?.() }}
      >
        <div style={{ position: 'relative' }}>
          <NotifIcon type={n.type} />
          {n.unread && <div className="unread-dot" />}
        </div>
        <div className="notif-body">
          <div className="notif-title">{n.title}</div>
          <div className="notif-time">{n.time}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen active" id="screen-notifications">
      <ScreenHeader
        title="Notifications"
        onBack={() => goTo('home')}
        right={
          <div className="btn-icon" onClick={markAllRead}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        }
      />
      <div className="notif-wrap">
        {unreadCount > 0 && <div className="notif-group-label">New · {unreadCount}</div>}
        {todayNotifs.map(n => <NotifItem key={n.id} n={n} />)}
        {restNotifs.length > 0 && <div className="notif-group-label" style={{ marginTop: 8 }}>Earlier</div>}
        {restNotifs.map(n  => <NotifItem key={n.id} n={n} />)}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// TRANSACTION DETAIL
// ════════════════════════════════════════════════════════
export function TxDetailScreen() {
  const { txDetail, closeTxDetail, showToast } = useUiStore()
  const tx = txDetail

  if (!tx) return null

  const isIn = tx.type === 'in'

  function downloadReceipt() {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cheese Receipt</title>
<style>body{font-family:'Helvetica Neue',sans-serif;background:#0a0904;color:#f0e8d0;max-width:400px;margin:40px auto;padding:32px;border:1px solid rgba(201,168,76,0.25);border-radius:16px}h2{font-size:22px;font-weight:300;letter-spacing:4px;text-transform:uppercase;color:#c9a84c;margin-bottom:4px}.sub{font-size:12px;color:#7a7055;margin-bottom:32px}.row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px}.key{color:#7a7055;font-size:11px;text-transform:uppercase}.val{font-family:monospace;color:#b0a480}.amt .val{color:#c9a84c;font-size:16px}.ref{margin-top:24px;font-size:10px;color:#4a4535;font-family:monospace;text-align:center}@media print{body{background:#fff;color:#111}}</style></head><body>
<h2>Cheese</h2><div class="sub">Transfer Receipt</div>
<div class="row amt"><span class="key">Amount</span><span class="val">${tx.amount}</span></div>
<div class="row"><span class="key">Description</span><span class="val">${tx.desc}</span></div>
<div class="row"><span class="key">Date</span><span class="val">${tx.date}</span></div>
<div class="row"><span class="key">Fee</span><span class="val">${tx.fee}</span></div>
<div class="row"><span class="key">Status</span><span class="val">${tx.status}</span></div>
${tx.hash ? `<div class="row"><span class="key">Tx Hash</span><span class="val">${tx.hash}</span></div>` : ''}
<div class="ref">${tx.ref}</div></body></html>`
    const w = window.open('', '_blank', 'width=520,height=720')
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400) }
    showToast('Receipt ready', 'Print or save as PDF')
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: 'Cheese Receipt', text: `${tx.amount} — ${tx.desc} · ${tx.ref}` })
    } else {
      navigator.clipboard?.writeText(tx.ref).catch(() => {})
      showToast('Copied', `${tx.ref}`)
    }
  }

  const STATUS_CLS: Record<string, string> = { confirmed: 'confirmed', pending: 'pending', failed: 'failed' }

  return (
    <div className="screen active" id="screen-txdetail">
      <ScreenHeader
        title="Transaction"
        onBack={closeTxDetail}
        right={
          <div className="btn-icon" onClick={share}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
        }
      />
      <div className="tx-detail-wrap">
        <div className="tx-detail-hero">
          <div className="tx-detail-icon" style={{ background: isIn ? 'rgba(90,158,111,0.12)' : 'rgba(184,85,85,0.1)' }}>
            {tx.type === 'card_spend' ? '💳' : isIn ? '📥' : '📤'}
          </div>
          <div className={`tx-detail-amount ${isIn ? 'in' : 'out'}`}>{tx.amount}</div>
          <div className="tx-detail-sub">{tx.desc}</div>
          <div className={`tx-status-chip ${STATUS_CLS[tx.status] ?? 'confirmed'}`}>
            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
          </div>
        </div>

        <div className="tx-detail-card">
          <div className="tx-detail-row">
            <span className="tx-detail-key">Date &amp; Time</span>
            <span className="tx-detail-val plain">{tx.date}</span>
          </div>
          <div className="tx-detail-row">
            <span className="tx-detail-key">Reference</span>
            <span className="tx-detail-val">{tx.ref}</span>
          </div>
          {tx.hash && (
            <div className="tx-detail-row">
              <span className="tx-detail-key">Tx Hash</span>
              <span className="tx-detail-val">{tx.hash}</span>
            </div>
          )}
          {tx.network && (
            <div className="tx-detail-row">
              <span className="tx-detail-key">Network</span>
              <span className="tx-detail-val plain">{tx.network}</span>
            </div>
          )}
          <div className="tx-detail-row">
            <span className="tx-detail-key">Fee</span>
            <span className="tx-detail-val plain" style={{ color: 'var(--success)' }}>{tx.fee}</span>
          </div>
        </div>

        <div className="tx-detail-actions">
          <button className="tx-detail-action-btn" onClick={downloadReceipt}>
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Receipt
          </button>
          <button className="tx-detail-action-btn" onClick={closeTxDetail}>
            <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.28"/></svg>
            Repeat
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// APP LOCK
// ════════════════════════════════════════════════════════
export function AppLockScreen() {
  const { goTo }         = useUiStore()
  const { user }         = useAuthStore()
  const [pin, setPin]    = useState('')
  const [err, setErr]    = useState(false)

  // In production: verify PIN against /auth/verify-pin endpoint
  async function handleComplete(entered: string) {
    // Prototype: any 4-digit PIN unlocks
    if (entered.length === 4) {
      setErr(false)
      setPin('')
      goTo('home')
    } else {
      setErr(true)
      setTimeout(() => { setErr(false); setPin('') }, 700)
    }
  }

  return (
    <div className="screen active" id="screen-applock">
      <div className="applock-wrap">
        <div className="applock-logo">
          <svg viewBox="0 0 52 52" fill="none">
            <path d="M36 14C36 14 33 10 26 10C17.16 10 10 17.16 10 26C10 34.84 17.16 42 26 42C33 42 36 38 36 38" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M20 20C20 20 22 18 26 18C30 18 32 20 32 23C32 26 29 27.5 26 28C23 28.5 20 30 20 33C20 36 22.5 38 26 38" stroke="#e8c97a" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
          </svg>
        </div>
        <div className="applock-title">Welcome back</div>
        <div className="applock-sub">{user?.fullName ? `Hello, ${user.fullName.split(' ')[0]}` : 'Enter your 4-digit PIN'}</div>
        <PinPad
          value={pin}
          onChange={setPin}
          onComplete={handleComplete}
          error={err}
          label=""
        />
        <div className="applock-forgot" onClick={() => goTo('login')}>
          Forgot PIN? Sign in again
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// KYC SCREEN
// ════════════════════════════════════════════════════════
export function KycScreen() {
  const { goTo, showToast } = useUiStore()
  const { user }            = useAuthStore()
  const [step, setStep]     = useState(0)
  const [bvn,  setBvn]      = useState('')
  const [nin,  setNin]      = useState('')
  const [selfie, setSelfie] = useState<'idle' | 'processing' | 'done'>('idle')
  const tier = user?.tier ?? 'silver'

  function startFlow() { setStep(1) }
  function back()       { step <= 1 ? goTo('profile') : setStep(s => s - 1) }

  function startLiveness() {
    setSelfie('processing')
    setTimeout(() => setSelfie('done'), 2000)
  }

  const tierSteps = ['Identity', 'BVN', 'NIN', 'Selfie', 'Submitted']

  return (
    <div className="screen active" id="screen-kyc">
      <ScreenHeader
        title={tierSteps[step] ?? 'Identity'}
        onBack={back}
      />
      <div style={{ padding: '0 24px 100px', flex: 1, overflowY: 'auto' }}>

        {/* Step 0: Tier picker */}
        {step === 0 && (
          <>
            <div style={{ padding: '16px 0 20px' }}>
              <div className="auth-heading" style={{ fontSize: 28 }}>Upgrade your<br /><em>tier.</em></div>
              <div className="auth-sub">Higher tiers unlock higher limits and more features.</div>
            </div>
            <div className="kyc-tier-cards">
              {[
                { name:'SILVER', badge:'Current', badgeCls:'silver', limit:'$500 / day · $2,000 / month',   benefits:'Send & receive · Bank transfers · Basic card', isCurrent: tier==='silver', onClick: undefined },
                { name:'GOLD',   badge:'Upgrade', badgeCls:'gold',   limit:'$5,000 / day · $25,000 / month', benefits:'All Silver · Higher limits · Earn yield · Priority support', isCurrent: tier==='gold', onClick: startFlow },
                { name:'BLACK',  badge:'Invite',  badgeCls:'black',  limit:'$50,000 / day · Unlimited',      benefits:'All Gold · OTC desk · Dedicated manager · Zero fees', isCurrent: false,         onClick: () => showToast('Black Tier', 'This tier is invite-only. Join the waitlist.') },
              ].map(t => (
                <div
                  key={t.name}
                  className={`kyc-tier-card${t.isCurrent ? ' current' : ''}`}
                  onClick={t.onClick}
                  style={!t.onClick ? { cursor: 'default' } : { cursor: 'pointer' }}
                >
                  <div className="kyc-tier-header">
                    <span className="kyc-tier-name" style={t.name==='GOLD' ? { color:'var(--gold)' } : {}}>{t.name}</span>
                    <span className={`kyc-tier-badge ${t.badgeCls}`}>{t.isCurrent ? 'Current' : t.badge}</span>
                  </div>
                  <div className="kyc-tier-limit">{t.limit}</div>
                  <div className="kyc-tier-benefits" style={{ marginTop: 8 }}>{t.benefits}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 1: BVN */}
        {step === 1 && (
          <>
            <div className="auth-steps" style={{ marginTop: 16 }}>
              {[0,1,2].map(i => <div key={i} className={`auth-step-bar${i < 1 ? ' done' : i === 0 ? ' active' : ''}`} style={i===0?{} : i<1?{}:{}} />)}
              <div className="auth-step-bar active" /><div className="auth-step-bar" /><div className="auth-step-bar" />
            </div>
            <div className="auth-heading" style={{ fontSize: 28, marginBottom: 8 }}>Your BVN</div>
            <div className="auth-sub">Confirms your identity with the CBN database.</div>
            <div className="kyc-field">
              <div className="kyc-field-inner">
                <div className="kyc-field-label">BVN</div>
                <input
                  type="tel" maxLength={11} placeholder="12345678901"
                  value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g,''))}
                  style={{ background:'none', border:'none', outline:'none', fontFamily:"'DM Mono',monospace", fontSize:15, color:'var(--text)', width:'100%' }}
                />
              </div>
            </div>
            <InfoChip>Your BVN is only used for identity verification. Never shared with third parties.</InfoChip>
            <AuthBtn onClick={() => setStep(2)} disabled={bvn.length !== 11}>Continue</AuthBtn>
          </>
        )}

        {/* Step 2: NIN */}
        {step === 2 && (
          <>
            <div className="auth-heading" style={{ fontSize: 28, marginBottom: 8 }}>Your NIN</div>
            <div className="auth-sub">National Identification Number — found on your NIN slip or NIMC app.</div>
            <div className="kyc-field">
              <div className="kyc-field-inner">
                <div className="kyc-field-label">NIN</div>
                <input
                  type="tel" maxLength={11} placeholder="12345678901"
                  value={nin} onChange={e => setNin(e.target.value.replace(/\D/g,''))}
                  style={{ background:'none', border:'none', outline:'none', fontFamily:"'DM Mono',monospace", fontSize:15, color:'var(--text)', width:'100%' }}
                />
              </div>
            </div>
            <AuthBtn onClick={() => setStep(3)} disabled={nin.length !== 11}>Continue</AuthBtn>
          </>
        )}

        {/* Step 3: Selfie */}
        {step === 3 && (
          <>
            <div className="auth-heading" style={{ fontSize: 28, marginBottom: 8 }}>Liveness check</div>
            <div className="auth-sub">Take a quick selfie to confirm you're a real person. Takes about 10 seconds.</div>
            <div className="kyc-selfie-area" onClick={selfie === 'idle' ? startLiveness : undefined}>
              <div className="kyc-selfie-icon">{selfie === 'done' ? '✅' : selfie === 'processing' ? '⏳' : '🤳'}</div>
              <div className="kyc-selfie-title">{selfie === 'done' ? 'Verified' : selfie === 'processing' ? 'Processing…' : 'Take selfie'}</div>
              <div className="kyc-selfie-sub">Make sure your face is clearly visible and well lit.</div>
            </div>
            <AuthBtn onClick={() => setStep(4)} disabled={selfie !== 'done'}>Submit for Review</AuthBtn>
          </>
        )}

        {/* Step 4: Pending */}
        {step === 4 && (
          <div className="kyc-status-wrap">
            <div className="kyc-status-icon pending">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="auth-heading" style={{ textAlign: 'center', fontSize: 28 }}>Under review</div>
            <div className="auth-sub" style={{ textAlign: 'center', marginBottom: 24 }}>
              We're verifying your identity. Usually 1–2 minutes, up to 24 hours.
            </div>
            <AuthBtn onClick={() => goTo('profile')}>Back to Profile</AuthBtn>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// SECURITY SCREEN
// ════════════════════════════════════════════════════════
export function SecurityScreen() {
  const { goTo, showToast, biometricEnabled, toggleBiometric, autoLockMinutes, setAutoLock } = useUiStore()
  const { logout } = useAuthStore()
  const [devices, setDevices] = useState([
    { id: 'dev1', name: 'iPhone 16 Pro',      sub: 'Lagos · Just now',   current: true },
    { id: 'dev2', name: 'Chrome on MacBook',  sub: 'Lagos · 2 days ago', current: false },
  ])

  function revokeDevice(id: string, name: string) {
    setDevices(d => d.filter(x => x.id !== id))
    showToast('Device removed', `${name} can no longer access your account`)
  }

  return (
    <div className="screen active" id="screen-security">
      <ScreenHeader title="Security" onBack={() => goTo('profile')} />
      <div className="security-wrap">

        <div className="security-section">
          <div className="security-section-title">Authentication</div>

          <div className="security-item" onClick={() => goTo('login')}>
            <div className="security-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div className="security-item-text">
              <div className="security-item-label">Change Password</div>
              <div className="security-item-sub">Last changed 30 days ago</div>
            </div>
            <div className="security-item-right">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>

          <div className="security-item" onClick={() => showToast('Change PIN', 'Enter current PIN to set a new one')}>
            <div className="security-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeWidth="3"/></svg>
            </div>
            <div className="security-item-text">
              <div className="security-item-label">Change Transaction PIN</div>
              <div className="security-item-sub">4-digit PIN for approving transfers</div>
            </div>
            <div className="security-item-right">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>

          {/* Biometric toggle */}
          <div className="security-item" style={{ cursor: 'default' }}>
            <div className="security-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div className="security-item-text">
              <div className="security-item-label">Biometric Login</div>
              <div className="security-item-sub">Face ID / Fingerprint</div>
            </div>
            <div className="security-item-right">
              <div
                className={`security-toggle${biometricEnabled ? ' on' : ''}`}
                onClick={toggleBiometric}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Auto-lock */}
          <div className="security-item" style={{ cursor: 'default' }}>
            <div className="security-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div className="security-item-text">
              <div className="security-item-label">Auto-Lock</div>
              <div className="security-item-sub">
                {autoLockMinutes === 'never' ? 'Never locks' : `Locks after ${autoLockMinutes} minute${autoLockMinutes === 1 ? '' : 's'}`}
              </div>
            </div>
            <div className="security-item-right">
              <select
                value={String(autoLockMinutes)}
                onChange={e => setAutoLock(e.target.value === 'never' ? 'never' : parseInt(e.target.value))}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontFamily: "'Syne',sans-serif", fontSize: 12, outline: 'none', cursor: 'pointer' }}
              >
                <option value="1">1 min</option>
                <option value="5">5 min</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </div>

        <div className="security-section">
          <div className="security-section-title">Active Devices</div>
          {devices.map(dev => (
            <div key={dev.id} className="device-item">
              <div className="device-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {dev.name.includes('MacBook')
                    ? <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>
                    : <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeWidth="3"/></>}
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className="device-item-name">{dev.name}</div>
                <div className="device-item-sub">{dev.sub}</div>
                {dev.current && <div className="device-item-current">This device</div>}
              </div>
              {!dev.current && (
                <div className="device-revoke" onClick={() => revokeDevice(dev.id, dev.name)}>
                  Revoke
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="security-section">
          <div className="security-section-title">Danger Zone</div>
          <div
            className="security-item"
            style={{ borderColor: 'rgba(184,85,85,0.2)', cursor: 'pointer' }}
            onClick={() => showToast('Delete Account', 'Contact support@cheesewallet.app to close your account')}
          >
            <div className="security-item-icon" style={{ background: 'rgba(184,85,85,0.1)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.5">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </div>
            <div className="security-item-text">
              <div className="security-item-label" style={{ color: 'var(--danger)' }}>Delete Account</div>
              <div className="security-item-sub">Permanently close your Cheese account</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// PROFILE EDIT
// ════════════════════════════════════════════════════════
export function ProfileEditScreen() {
  const { goTo, showToast } = useUiStore()
  const { user }            = useAuthStore()
  const { data: me }        = useMe()

  const displayUser = me ?? user
  const [name,     setName]    = useState(displayUser?.fullName  ?? '')
  const [username, setUsername]= useState(displayUser?.username  ?? '')
  const [phone,    setPhone]   = useState(displayUser?.phone     ?? '')

  const initials = (name || displayUser?.fullName || 'OA').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  function handleSave() {
    // TODO: call PATCH /users/profile endpoint
    showToast('Profile saved', `${name} — changes applied`)
    setTimeout(() => goTo('profile'), 800)
  }

  return (
    <div className="screen active" id="screen-profile-edit">
      <ScreenHeader title="Edit Profile" onBack={() => goTo('profile')} />
      <div className="profile-edit-wrap">
        <div className="profile-avatar-edit">
          <div className="pe-avatar" onClick={() => showToast('Avatar', 'Photo upload coming soon')}>
            {initials}
            <div className="pe-avatar-edit-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
          </div>
        </div>

        {[
          { label: 'Full Name',     value: name,     onChange: setName,     type: 'text'  },
          { label: 'Username',      value: username, onChange: setUsername, type: 'text'  },
          { label: 'Phone Number',  value: phone,    onChange: setPhone,    type: 'tel'   },
        ].map(f => (
          <div key={f.label} className="pe-field">
            <div className="pe-field-inner">
              <div className="pe-field-label">{f.label.toUpperCase()}</div>
              <input
                type={f.type} value={f.value}
                onChange={e => f.onChange(e.target.value)}
                style={{ background:'none', border:'none', outline:'none', fontFamily:"'Syne',sans-serif", fontSize:15, color:'var(--text)', width:'100%' }}
              />
            </div>
          </div>
        ))}

        {/* Email locked */}
        <div className="pe-field" style={{ opacity: 0.5 }}>
          <div className="pe-field-inner">
            <div className="pe-field-label">EMAIL ADDRESS</div>
            <input
              type="email" value={displayUser?.email ?? ''} disabled
              style={{ background:'none', border:'none', outline:'none', fontFamily:"'Syne',sans-serif", fontSize:15, color:'var(--text)', width:'100%', cursor:'not-allowed' }}
            />
          </div>
          <span style={{ fontSize:11, color:'var(--muted)', flexShrink:0, marginLeft:8 }}>Locked</span>
        </div>

        <button className="pe-save-btn" onClick={handleSave}>Save Changes</button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// EARN SCREEN
// ════════════════════════════════════════════════════════
export function EarnScreen() {
  const { goTo, showToast } = useUiStore()
  // TODO: replace with useYield() hook when backend is ready
  const apy       = 6.5
  const balance   = 1247.83
  const earned    = 6.74

  return (
    <div className="screen active" id="screen-earn">
      <ScreenHeader title="Earn" onBack={() => goTo('home')} />
      <div className="earn-wrap">
        <div className="earn-hero-card">
          <div className="earn-apy">{apy}%</div>
          <div className="earn-apy-label">Annual Percentage Yield</div>
          <div className="earn-your-yield">
            <div>
              <div className="earn-stat-label">Your Balance</div>
              <div className="earn-stat-val">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="earn-stat-label">Earned This Month</div>
              <div className="earn-stat-val pos">+${earned.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="earn-info-rows">
          {[
            ['Protocol',    'Aave v3 — Polygon'],
            ['APY Type',    'Variable'],
            ['Compounding', 'Daily'],
            ['Min. Balance','$10.00'],
            ['Withdrawal',  'Instant'],
          ].map(([k, v]) => (
            <div key={k} className="earn-info-row">
              <span className="earn-info-key">{k}</span>
              <span className="earn-info-val">{v}</span>
            </div>
          ))}
        </div>

        <InfoChip>
          Your USDC earns yield automatically. No lock-ups, no minimums. APY fluctuates with protocol utilisation.
        </InfoChip>

        <button className="earn-action-btn" onClick={() => showToast('Yield History', 'Detailed breakdown coming soon')}>
          View Yield History
        </button>
        <button className="earn-action-btn outline" onClick={() => showToast('Withdrawal', 'Yield pays continuously into your main balance')}>
          Withdraw Yield
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// SUPPORT SCREEN
// ════════════════════════════════════════════════════════
const FAQS = [
  { q: 'How do I add money to my wallet?',   a: 'Deposit USDC from any EVM wallet on supported networks (Arbitrum is free). You can also ask a contact to send to your @username.' },
  { q: 'How long do bank transfers take?',   a: 'Bank transfers via NIP typically arrive in 2–5 minutes during business hours. Guaranteed within 24 hours.' },
  { q: 'What is the exchange rate?',         a: 'Cheese uses the live mid-market rate plus a ₦20 spread per dollar. This is shown transparently before every transfer.' },
  { q: 'Is my money safe?',                  a: 'Customer USDC is held in regulated custody. Every transaction requires a cryptographic signature from your registered device.' },
]

export function SupportScreen() {
  const { goTo, showToast } = useUiStore()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="screen active" id="screen-support">
      <ScreenHeader title="Support" onBack={() => goTo('profile')} />
      <div className="support-wrap">
        <div className="support-hero">
          <div className="support-hero-icon">👋</div>
          <div className="support-hero-title">How can we help?</div>
          <div className="support-hero-sub">Mon–Sat, 8 AM – 10 PM WAT. Average reply under 3 minutes.</div>
        </div>

        <div className="security-section-title" style={{ padding: '0 0 12px' }}>Contact Us</div>

        {[
          { label:'Live Chat',    sub:'Typical reply under 3 min', icon:<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,                  action:() => showToast('Live Chat','Connecting you to an agent…') },
          { label:'Email',        sub:'support@cheesewallet.app',   icon:<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>, action:() => showToast('Email','support@cheesewallet.app') },
          { label:'Twitter / X',  sub:'@CheeseWalletNG',            icon:<path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>, action:() => showToast('Twitter','@CheeseWalletNG') },
        ].map(item => (
          <div key={item.label} className="support-item" onClick={item.action}>
            <div className="support-item-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">{item.icon}</svg>
            </div>
            <div className="support-item-text">
              <div className="support-item-label">{item.label}</div>
              <div className="support-item-sub">{item.sub}</div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width:14, height:14, stroke:'var(--dim)', flexShrink:0 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        ))}

        <div className="security-section-title" style={{ padding: '20px 0 12px' }}>FAQ</div>
        {FAQS.map((faq, i) => (
          <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
            <div className="faq-q">
              <span>{faq.q}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {openFaq === i && <div className="faq-a">{faq.a}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
