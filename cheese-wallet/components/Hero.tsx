"use client";

import Link from "next/link";
import { IconArrowUp, IconArrowDown, IconTrendingUp } from "./Icons";

const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  if (href.startsWith("#")) {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
};

export default function Hero() {
  return (
    <section
      id="home"
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "55fr 45fr",
        alignItems: "center",
        padding: "130px 6% 80px",
        position: "relative",
        overflow: "hidden",
        gap: "40px",
      }}
    >
      {/* Background glows */}
      <div style={{ position: "absolute", top: -100, right: -150, width: 700, height: 700, background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -200, left: -100, width: 500, height: 500, background: "radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 65%)", pointerEvents: "none" }} />

      {/* ── Left: content ── */}
      <div>
        <div
          className="hero-anim-1 label-line"
          style={{ fontSize: 10.5, letterSpacing: "3.5px", textTransform: "uppercase", color: "var(--gold)", fontWeight: 600, display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}
        >
          Your Dollar Wallet for Everyday Nigeria
        </div>

        <h1
          className="hero-anim-2"
          style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(52px, 6vw, 88px)", fontWeight: 900, lineHeight: 1.03, marginBottom: 28 }}
        >
          Your money,<br />
          <span style={{ color: "var(--gold)", fontStyle: "italic" }}>stronger</span><br />
          <span style={{ color: "rgba(245,238,216,0.22)" }}>than the Naira.</span>
        </h1>

        <p
          className="hero-anim-3"
          style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.75, color: "var(--cream-dim)", maxWidth: 500, marginBottom: 44 }}
        >
          Cheese holds your money in USDC — digital US dollars — so ₦1M today stays ₦1M tomorrow.
          Fund it, spend it, earn yield on it. No dollar scarcity. No banking wahala.
        </p>

        <div className="hero-anim-4" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Link
            href="/waitlist"
            className="btn-gold-shimmer"
            style={{ background: "var(--gold)", color: "var(--black)", padding: "17px 40px", fontSize: 13, fontWeight: 700, letterSpacing: "1.8px", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10, transition: "transform 0.2s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")}
          >
            Claim Your Spot →
          </Link>
          <a
            href="#how"
            onClick={(e) => handleAnchor(e, "#how")}
            style={{ color: "var(--cream-faint)", fontSize: 13, fontWeight: 500, letterSpacing: "1px", textDecoration: "none", display: "flex", alignItems: "center", gap: 8, transition: "color 0.3s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--cream-faint)")}
          >
            See How It Works ↓
          </a>
        </div>

        <div
          className="hero-anim-5"
          style={{ display: "flex", gap: 48, marginTop: 60, paddingTop: 40, borderTop: "1px solid rgba(201,168,76,0.18)", flexWrap: "wrap" }}
        >
          {[
            { n: "$1", l: "Always = $1 USDC" },
            { n: "5,000", l: "Early Access Spots" },
            { n: "3", l: "Exclusive Tiers" },
          ].map((s) => (
            <div key={s.l}>
              <div style={{ fontFamily: "var(--font-playfair)", fontSize: 42, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 10.5, letterSpacing: "1.8px", textTransform: "uppercase", color: "rgba(245,238,216,0.35)", marginTop: 7 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: phone mockup ── */}
      <div className="hero-visual-anim" style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
        {/* Pulse rings */}
        {[
          { size: 360, color: "rgba(201,168,76,0.14)", delay: "0s" },
          { size: 460, color: "rgba(201,168,76,0.07)", delay: "1.3s" },
          { size: 560, color: "rgba(201,168,76,0.04)", delay: "2.6s" },
        ].map((r, i) => (
          <div
            key={i}
            className="ring-pulse"
            style={{ position: "absolute", width: r.size, height: r.size, borderRadius: "50%", border: `1px solid ${r.color}`, animationDelay: r.delay }}
          />
        ))}

        {/* Phone frame */}
        <div
          className="phone-float"
          style={{ width: 272, height: 558, background: "var(--charcoal-2)", borderRadius: 42, border: "2px solid rgba(201,168,76,0.28)", position: "relative", overflow: "hidden", boxShadow: "0 0 0 1px rgba(201,168,76,0.06), 0 50px 140px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07)" }}
        >
          {/* Notch */}
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 92, height: 26, background: "var(--black)", borderRadius: "0 0 18px 18px", zIndex: 10 }} />

          {/* Screen content */}
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(170deg, #141414 0%, #0a0a0a 100%)", padding: "44px 18px 24px", display: "flex", flexDirection: "column", gap: 12, fontSize: 11 }}>

            {/* Greeting */}
            <div style={{ color: "rgba(245,238,216,0.38)", letterSpacing: "0.8px" }}>Good morning, Temi</div>

            {/* Balance */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontFamily: "var(--font-playfair)", fontSize: 38, fontWeight: 700, color: "var(--cream)", lineHeight: 1 }}>
                <sup style={{ fontSize: 18, color: "var(--gold)", fontStyle: "italic", marginRight: 2 }}>$</sup>
                4,280<span style={{ fontSize: 20, color: "rgba(245,238,216,0.45)" }}>.50</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(245,238,216,0.3)", marginTop: 3 }}>≈ ₦6,847,680 today</div>
            </div>

            {/* Yield indicator — Heroicon trending-up */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--green)", fontWeight: 600 }}>
              <IconTrendingUp size={14} color="var(--green)" />
              +0.8% yield this week
            </div>

            {/* Card */}
            <div style={{ background: "linear-gradient(135deg, #BF9540 0%, #7A5D18 100%)", borderRadius: 14, padding: "16px 16px 32px", position: "relative", overflow: "hidden", marginTop: 2 }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 90, height: 90, background: "rgba(255,255,255,0.1)", borderRadius: "50%" }} />
              <div style={{ fontSize: 8.5, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(0,0,0,0.55)", fontWeight: 700 }}>Cheese Card</div>
              <div style={{ fontFamily: "var(--font-bebas)", fontSize: 24, letterSpacing: 3, color: "var(--black)", marginTop: 2 }}>GOLD TIER</div>
              <div style={{ fontSize: 9, color: "rgba(0,0,0,0.4)", letterSpacing: "2px", position: "absolute", bottom: 12, left: 16 }}>**** **** **** 8291</div>
            </div>

            {/* Action buttons — Heroicon arrows */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 2 }}>
              {[
                { Icon: IconArrowUp, lbl: "Send" },
                { Icon: IconArrowDown, lbl: "Fund" },
              ].map((a) => (
                <div key={a.lbl} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 10, padding: 10, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <a.Icon size={16} color="var(--gold)" />
                  <div style={{ fontSize: 8.5, color: "rgba(245,238,216,0.4)", letterSpacing: "1px", textTransform: "uppercase" }}>{a.lbl}</div>
                </div>
              ))}
            </div>

            {/* Recent label */}
            <div style={{ fontSize: 9.5, color: "rgba(245,238,216,0.25)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>Recent</div>

            {/* Transactions */}
            {[
              { n: "Merchant Pay — Lekki", t: "2 min ago", a: "−$18.00", green: false },
              { n: "Weekly Yield Credit", t: "Today", a: "+$3.42", green: true },
              { n: "Referral Bonus", t: "Yesterday", a: "+$6.25", green: true },
            ].map((tx) => (
              <div key={tx.n} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 9, padding: "9px 11px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "rgba(245,238,216,0.7)" }}>{tx.n}</div>
                  <div style={{ fontSize: 9, color: "rgba(245,238,216,0.25)", marginTop: 1 }}>{tx.t}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: tx.green ? "var(--green)" : "var(--gold)" }}>{tx.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: hide phone mockup */}
      <style>{`@media(max-width:960px){#home{grid-template-columns:1fr!important}.hero-visual-anim{display:none!important}}`}</style>
    </section>
  );
}
