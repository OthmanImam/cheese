"use client";

import Link from "next/link";

export default function CTABand() {
  return (
    <div
      id="join"
      style={{ background: "var(--gold)", padding: "110px 6%", textAlign: "center", position: "relative", overflow: "hidden" }}
    >
      {/* Big bg text */}
      <div
        className="cta-bg-text"
        style={{ fontFamily: "var(--font-bebas)" }}
      >
        CHEESE
      </div>

      {/* Scarcity indicator */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.08)", padding: "8px 18px", fontSize: 12, fontWeight: 600, letterSpacing: "1px", color: "rgba(0,0,0,0.7)", marginBottom: 32, position: "relative" }}>
        <span className="blink-dot" style={{ width: 7, height: 7, background: "#C0392B", borderRadius: "50%", display: "inline-block" }} />
        Only 5,000 Early Access Spots Available
      </div>

      <h2
        style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(36px, 4.5vw, 64px)", fontWeight: 900, color: "var(--black)", lineHeight: 1.1, marginBottom: 18, position: "relative" }}
      >
        Stop watching the Naira fall.<br />
        Start holding <em style={{ fontStyle: "italic" }}>something stronger.</em>
      </h2>

      <p style={{ fontSize: 18, fontWeight: 300, color: "rgba(0,0,0,0.6)", marginBottom: 46, position: "relative" }}>
        Join thousands of smart Nigerians keeping their money in dollars — and earning on it every single week.
      </p>

      <Link
        href="/waitlist"
        style={{ background: "var(--black)", color: "var(--gold)", padding: "19px 52px", fontSize: 13, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", textDecoration: "none", display: "inline-block", position: "relative", transition: "background 0.3s, transform 0.2s" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--charcoal)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--black)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
      >
        Claim Your Early Access →
      </Link>

      <p style={{ fontSize: 11.5, color: "rgba(0,0,0,0.38)", marginTop: 20, letterSpacing: "0.8px", position: "relative" }}>
        No credit card required &nbsp;·&nbsp; Takes 2 minutes &nbsp;·&nbsp; Available on iOS & Android
      </p>
    </div>
  );
}
