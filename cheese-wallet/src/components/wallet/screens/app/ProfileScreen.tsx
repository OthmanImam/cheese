'use client'
// ─────────────────────────────────────────────────────────
// CHEESE WALLET — Profile Screen
// ─────────────────────────────────────────────────────────
import { useAuthStore } from '@/lib/stores/authStore'
import { useUiStore }   from '@/lib/stores/uiStore'
import { useMe }        from '@/lib/hooks/useAuth'
import { useReferral }  from '@/lib/hooks/useWallet'
import { ScreenHeader } from '../../shared/UI'

const TIER_LABEL: Record<string, string> = {
  silver: '◈ Silver Member',
  gold:   '◆ Gold Member',
  black:  '◆ Black Member',
}

interface MenuItem {
  icon:    React.ReactNode
  label:   string
  sub:     string
  onClick: () => void
  danger?: boolean
}

function MenuGroup({ items }: { items: MenuItem[] }) {
  return (
    <div className="menu-group">
      {items.map((item, i) => (
        <div
          key={i}
          className="menu-item"
          onClick={item.onClick}
          style={item.danger ? { cursor: 'pointer' } : { cursor: 'pointer' }}
        >
          <div className="menu-item-icon" style={item.danger ? { background: 'rgba(184,85,85,0.1)' } : {}}>
            {item.icon}
          </div>
          <div className="menu-item-text">
            <h4 style={item.danger ? { color: 'var(--danger)' } : {}}>{item.label}</h4>
            <p>{item.sub}</p>
          </div>
          <svg className="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      ))}
    </div>
  )
}

function Ico({ d }: { d: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  )
}

export function ProfileScreen() {
  const { user, logout }          = useAuthStore()
  const { goTo, showToast }       = useUiStore()
  const { data: me }              = useMe()

  const displayUser = me ?? user
  const tier        = 'silver'
  const initials    = (displayUser?.fullName ? displayUser.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'OA')

  const { data: referral } = useReferral()

  function handleReferral() {
    const link = referral?.link ?? `https://cheesewallet.app/r/${displayUser?.username ?? ''}`
    if (navigator.share) {
      navigator.share({ title: 'Join Cheese Wallet', text: 'Get $5 when you sign up', url: link }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(link).catch(() => {})
      const earned = referral?.paidReward?.toFixed(2) ?? '0.00'
      const total  = referral?.totalReferrals ?? 0
      showToast('Referral link copied', `${total} referral${total === 1 ? '' : 's'} · $${earned} earned`)
    }
  }

  const limitLabel: Record<string, string> = {
    silver: 'Silver — $500 / day',
    gold:   'Gold — $5,000 / day',
    black:  'Black — $50,000 / day',
  }

  function handleLogout() {
    logout()
    showToast('Signed out', 'Come back soon 👋')
  }

  return (
    <div className="screen active" id="screen-profile">
      <div className="screen-header">
        <span className="screen-title">Profile</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="btn-icon" onClick={() => goTo('profile-edit')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div className="btn-icon" onClick={() => showToast('Share', 'Profile link copied!')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="profile-wrap">
        {/* Hero */}
        <div className="profile-hero">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-name">{displayUser ? `${displayUser.fullName}` : '—'}</div>
          <div className="profile-username">@{displayUser?.username ?? '—'}</div>
          <div className="profile-tier">
            <span style={{ color: 'var(--gold)' }}>◆</span>{' '}
            {TIER_LABEL[tier] ?? 'Silver Member'}
          </div>
        </div>

        {/* Menu */}
        <div className="profile-menu">
          <MenuGroup items={[
            {
              label:   'Verify Identity',
              sub:     'Complete KYC to unlock higher limits',
              icon:    <Ico d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>} />,
              onClick: () => goTo('kyc'),
            },
            {
              label:   'Security',
              sub:     'PIN, biometrics, active devices',
              icon:    <Ico d={<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />,
              onClick: () => goTo('security'),
            },
          ]} />

          <MenuGroup items={[
            {
              label:   'Transaction Limits',
              sub:     limitLabel[tier] ?? 'Silver — $500 / day',
              icon:    <Ico d={<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>} />,
              onClick: () => showToast('Limits', `${limitLabel[tier]}. Upgrade tier to increase.`),
            },
            {
              label:   'Referrals',
              sub:     'Invite friends · Earn $5 each',
              icon:    <Ico d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />,
              onClick: () => handleReferral(),
            },
            {
              label:   'Earn',
              sub:     '6.5% APY on your balance',
              icon:    <Ico d={<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>} />,
              onClick: () => goTo('earn'),
            },
          ]} />

          <MenuGroup items={[
            {
              label:   'Support',
              sub:     'Live chat · Help centre · FAQ',
              icon:    <Ico d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} />,
              onClick: () => goTo('support'),
            },
            {
              label:   'Sign Out',
              sub:     displayUser?.email ?? '',
              icon:    <Ico d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>} />,
              onClick: handleLogout,
            },
          ]} />
        </div>
      </div>
    </div>
  )
}
