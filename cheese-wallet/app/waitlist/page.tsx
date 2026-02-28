"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import WaitlistForm from "@/components/waitlist/WaitlistForm";
import ReservationCard from "@/components/waitlist/ReservationCard";
import SuccessModal from "@/components/waitlist/SuccessModal";

const SOCIAL_PROOF = [
  { n: "4,831", l: "Spots claimed" },
  { n: "169", l: "Remaining" },
  { n: "3 mo", l: "Username lock" },
];

export default function WaitlistPage() {
  const [successData, setSuccessData] = useState<{ username: string; email: string } | null>(null);

  const handleSuccess = (username: string, email: string) => {
    setSuccessData({ username, email });
  };

  return (
    <>
      <Navbar />

      <main style={{ minHeight: "100vh", paddingTop: 90, background: "var(--black)", position: "relative", overflow: "hidden" }}>

        {/* Ambient background glows */}
        <div style={{ position: "absolute", top: -160, right: -200, width: 700, height: 700, background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: -150, width: 600, height: 600, background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 65%)", pointerEvents: "none" }} />

        {/* ── Top strip: spot counter ── */}
        <div style={{
          background: "var(--charcoal)",
          borderBottom: "1px solid rgba(201,168,76,0.1)",
          padding: "14px 6%",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 48, flexWrap: "wrap",
        }}>
          {SOCIAL_PROOF.map((s) => (
            <div key={s.l} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-bebas)", fontSize: 22, letterSpacing: 2, color: "var(--gold)" }}>{s.n}</span>
              <span style={{ fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(245,238,216,0.35)" }}>{s.l}</span>
            </div>
          ))}
          {/* Live dot */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(245,238,216,0.4)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3CB87A", display: "inline-block", animation: "blink 1.5s ease-in-out infinite" }} />
            List open
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "80px 6% 120px" }}>

          {/* Back link */}
          <Link
            href="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 12, fontWeight: 500, letterSpacing: "1.5px",
              textTransform: "uppercase", color: "rgba(245,238,216,0.35)",
              textDecoration: "none", marginBottom: 56,
              transition: "color 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(245,238,216,0.35)")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>

          {/* Two-column layout */}
          <div className="waitlist-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>

            {/* ── Left: copy ── */}
            <div>
              {/* Eyebrow */}
              <div style={{ fontSize: 10.5, letterSpacing: "3.5px", textTransform: "uppercase", color: "var(--gold)", fontWeight: 600, display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
                <span style={{ width: 36, height: 1, background: "var(--gold)", flexShrink: 0, display: "block" }} />
                Pre-Launch Waitlist
              </div>

              {/* Headline */}
              <h1 style={{
                fontFamily: "var(--font-playfair)",
                fontSize: "clamp(42px, 5vw, 68px)",
                fontWeight: 900, lineHeight: 1.05,
                marginBottom: 24,
              }}>
                Be first in.<br />
                <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Claim your name</em><br />
                <span style={{ color: "rgba(245,238,216,0.28)" }}>before they do.</span>
              </h1>

              {/* Body */}
              <p style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.75, color: "var(--cream-dim)", marginBottom: 40, maxWidth: 460 }}>
                Cheese launches soon. The first 5,000 people on this list get Gold benefits free for 90 days — and the username they reserve stays theirs, locked, the moment we go live.
              </p>

              {/* Offer pills */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 48 }}>
                {[
                  { icon: "bolt", text: "First 5,000 get Gold benefits free for 90 days" },
                  { icon: "lock", text: "Reserved username locked exclusively to you" },
                  { icon: "chart", text: "+0.5% extra yield stacked on top of standard rate" },
                ].map((item) => (
                  <div key={item.text} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{
                      width: 32, height: 32, border: "1px solid rgba(201,168,76,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, color: "var(--gold)",
                      background: "rgba(201,168,76,0.05)",
                    }}>
                      {item.icon === "bolt" && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                        </svg>
                      )}
                      {item.icon === "lock" && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      )}
                      {item.icon === "chart" && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(245,238,216,0.65)", fontWeight: 300, paddingTop: 6 }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Reservation info card */}
              <ReservationCard />
            </div>

            {/* ── Right: form ── */}
            <div>
              <div style={{
                background: "var(--charcoal-2)",
                border: "1px solid rgba(201,168,76,0.15)",
                padding: "48px 40px",
                position: "relative",
              }}>
                {/* Gold top bar */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--gold), var(--gold-light))" }} />

                {/* Form header */}
                <div style={{ marginBottom: 36 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 20h20L12 3 2 20z" />
                      <circle cx="9.5" cy="15" r="1.25" strokeWidth={1.5} />
                      <circle cx="14.5" cy="13.5" r="1" strokeWidth={1.5} />
                      <circle cx="12" cy="18" r="0.875" strokeWidth={1.5} />
                    </svg>
                    <span style={{ fontFamily: "var(--font-bebas)", fontSize: 18, letterSpacing: 3, color: "var(--gold)" }}>CHEESE</span>
                  </div>
                  <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
                    Reserve your spot
                  </h2>
                  <p style={{ fontSize: 14, color: "rgba(245,238,216,0.45)", fontWeight: 300, lineHeight: 1.6 }}>
                    169 spots remaining. The list closes when it&apos;s full.
                  </p>
                </div>

                <WaitlistForm onSuccess={handleSuccess} />
              </div>

              {/* Trust strip below form */}
              <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 20, flexWrap: "wrap" }}>
                {[
                  { icon: "shield", text: "No spam, ever" },
                  { icon: "lock", text: "Data encrypted" },
                  { icon: "check", text: "Cancel anytime" },
                ].map((t) => (
                  <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "rgba(245,238,216,0.28)", letterSpacing: "0.5px" }}>
                    {t.icon === "shield" && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                      </svg>
                    )}
                    {t.icon === "lock" && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                    )}
                    {t.icon === "check" && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    )}
                    {t.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer strip ── */}
        <div style={{
          borderTop: "1px solid rgba(201,168,76,0.08)",
          padding: "28px 6%",
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 12,
        }}>
          <span style={{ fontSize: 12, color: "rgba(245,238,216,0.2)" }}>
            © {new Date().getFullYear()} Cheese Wallet. All rights reserved.
          </span>
          <span style={{ fontSize: 11, color: "rgba(245,238,216,0.15)", maxWidth: 500, lineHeight: 1.6 }}>
            Cheese Wallet is not a licensed bank. USDC yield rates are variable and not guaranteed.
          </span>
        </div>

        <style>{`
          @media (max-width: 860px) {
            .waitlist-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </main>

      {/* Success modal */}
      {successData && (
        <SuccessModal
          username={successData.username}
          email={successData.email}
          onClose={() => setSuccessData(null)}
        />
      )}
    </>
  );
}
