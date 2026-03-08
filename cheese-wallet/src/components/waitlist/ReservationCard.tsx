export default function ReservationCard() {
  return (
    <div style={{
      background: 'linear-gradient(160deg, rgba(201,168,76,0.07) 0%, rgba(201,168,76,0.02) 100%)',
      border: '1px solid rgba(201,168,76,0.22)',
      padding: '36px 32px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 64, height: 64,
        borderLeft: '1px solid rgba(201,168,76,0.15)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
      }} />

      <div style={{ marginBottom: 20, color: 'var(--gold)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
        Identity Reservation
      </div>

      <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(18px, 2.2vw, 22px)', fontWeight: 700, lineHeight: 1.25, marginBottom: 14 }}>
        Secure Your Identity<br />Before Launch
      </h3>

      <p style={{ fontSize: 14, lineHeight: 1.8, fontWeight: 300, color: 'var(--cream-dim)', marginBottom: 24 }}>
        Your reserved username is exclusively yours for the first 3 months after we launch.
        If not claimed within that period, it will be released to the public.
      </p>

      {[
        { icon: 'shield', label: 'Exclusive 3-month lock' },
        { icon: 'finger', label: 'Identity tied to your account' },
        { icon: 'clock',  label: 'Released if unclaimed at 90 days' },
      ].map((point) => (
        <div key={point.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ color: 'var(--gold)', flexShrink: 0 }}>
            {point.icon === 'shield' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            )}
            {point.icon === 'finger' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33" />
              </svg>
            )}
            {point.icon === 'clock' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            )}
          </div>
          <span style={{ fontSize: 13, color: 'rgba(245,238,216,0.6)', fontWeight: 400 }}>{point.label}</span>
        </div>
      ))}
    </div>
  )
}
