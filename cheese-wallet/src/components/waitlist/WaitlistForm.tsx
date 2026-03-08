'use client'

import { useCallback, useState } from 'react'
import UsernameField              from './UsernameField'
import { submitWaitlist, UsernameStatus, WaitlistResult } from '@/lib/waitlist'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface WaitlistFormProps {
  onSuccess: (username: string, email: string, position?: number) => void
}

export default function WaitlistForm({ onSuccess }: WaitlistFormProps) {
  const [email, setEmail]                   = useState('')
  const [username, setUsername]             = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [emailTouched, setEmailTouched]     = useState(false)
  const [submitting, setSubmitting]         = useState(false)
  const [serverError, setServerError]       = useState<string | null>(null)

  const emailValid = EMAIL_RE.test(email)
  const emailError = emailTouched && !emailValid ? 'Enter a valid email address' : null
  const formReady  = emailValid && usernameStatus === 'available' && !submitting

  const handleUsernameStatus = useCallback((s: UsernameStatus) => setUsernameStatus(s), [])

  const handleSubmit = async () => {
    if (!formReady) return
    setSubmitting(true); setServerError(null)
    try {
      const result: WaitlistResult = await submitWaitlist({ email, username })
      if (result.success) onSuccess(username, email, result.position)
      else setServerError('Something went wrong. Please try again.')
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const emailBorder = emailError ? 'rgba(224,92,92,0.5)'
    : emailValid && emailTouched ? 'rgba(60,184,122,0.4)'
    : 'rgba(201,168,76,0.2)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(245,238,216,0.5)', marginBottom: 10 }}>
          Email Address
        </label>
        <input
          type="email" value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="you@example.com" autoComplete="email"
          style={{ width: '100%', background: 'var(--charcoal)', border: `1px solid ${emailBorder}`, color: 'var(--cream)', padding: '15px 16px', fontSize: 15, fontFamily: 'var(--font-syne)', outline: 'none', transition: 'border-color 0.25s', display: 'block' }}
          onFocus={(e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = 'var(--gold)')}
          onBlur={(e: React.FocusEvent<HTMLInputElement>)  => { setEmailTouched(true); e.currentTarget.style.borderColor = emailBorder }}
        />
        {emailError && <p style={{ fontSize: 12, color: '#E05C5C', marginTop: 7, letterSpacing: '0.3px' }}>{emailError}</p>}
      </div>

      <UsernameField value={username} onChange={setUsername} onStatusChange={handleUsernameStatus} />

      {serverError && (
        <div style={{ padding: '14px 16px', background: 'rgba(224,92,92,0.07)', border: '1px solid rgba(224,92,92,0.25)', fontSize: 13, color: '#E05C5C', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {serverError}
        </div>
      )}

      <button onClick={handleSubmit} disabled={!formReady}
        style={{ width: '100%', background: formReady ? 'var(--gold)' : 'rgba(201,168,76,0.2)', color: formReady ? 'var(--black)' : 'rgba(245,238,216,0.3)', border: 'none', padding: '18px 24px', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', cursor: formReady ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background 0.3s, color 0.3s', fontFamily: 'var(--font-syne)' }}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { if (formReady) (e.currentTarget as HTMLElement).style.background = 'var(--gold-light)' }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { if (formReady) (e.currentTarget as HTMLElement).style.background = 'var(--gold)' }}
      >
        {submitting ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Securing your spot…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            {!emailValid && username.length < 4 ? 'Fill in your details'
              : usernameStatus === 'checking' ? 'Checking username…'
              : usernameStatus === 'taken'    ? 'Choose a different username'
              : !emailValid                   ? 'Enter a valid email'
              : 'Reserve My Spot'}
          </>
        )}
      </button>

      <p style={{ fontSize: 11.5, color: 'rgba(245,238,216,0.25)', textAlign: 'center', letterSpacing: '0.3px', lineHeight: 1.6 }}>
        No spam. No credit card. Unsubscribe anytime.
      </p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
