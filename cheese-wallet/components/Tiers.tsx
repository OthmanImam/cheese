"use client";
import Link from "next/link";
import SectionLabel from "./SectionLabel";

const tiers = [
  {
    name: "SILVER",
    nameColor: "#C0C0C0",
    min: "Starting from ₦200,000",
    features: [
      "USDC wallet with live Naira rate",
      "Send & receive in US dollars",
      "QR code merchant payments",
      "Virtual Cheese card",
      "Standard yield on your balance",
      "In-app support",
    ],
    btnLabel: "Join Waitlist",
    btnStyle: "outline",
    featured: false,
    featuredBadge: "",
  },
  {
    name: "GOLD",
    nameColor: "var(--gold)",
    min: "Starting from ₦1,000,000",
    features: [
      "Everything in Silver, elevated",
      "Premium virtual Gold card design",
      "Priority support — real humans, fast responses",
      "Higher yield rate on your full balance",
      "First-fund cashback of up to ₦10,000",
      "Merchant cashback 2–3% at partners",
      "Launch promo: +0.5% extra yield (first 5,000)",
    ],
    btnLabel: "Get Gold Access",
    btnStyle: "fill",
    featured: true,
    featuredBadge: "Most Popular",
  },
  {
    name: "BLACK",
    nameColor: "var(--cream)",
    min: "By Invitation or Referral Only",
    features: [
      "Everything in Gold, maximised",
      "Exclusive Black card — physical + virtual",
      "Highest available yield rate",
      "5% cashback at all luxury partner merchants",
      "Milestone ₦20,000 yield boost credits",
      "Limited-edition Black badge status",
      "Concierge-level support, 24/7",
    ],
    btnLabel: "Request Black Access",
    btnStyle: "outline",
    featured: false,
    featuredBadge: "",
  },
];


export default function Tiers() {
  return (
    <div
      id="tiers"
      style={{ background: "var(--charcoal)", padding: "120px 6%", position: "relative", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 75% 60%, rgba(201,168,76,0.07) 0%, transparent 55%)", pointerEvents: "none" }} />

      <SectionLabel>Access Tiers</SectionLabel>
      <h2
        className="reveal reveal-d1"
        style={{ fontFamily: "var(--font-playfair)", fontSize: "clamp(36px, 4.2vw, 62px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 16, position: "relative" }}
      >
        Pick your tier.<br />
        <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Own your level.</em>
      </h2>
      <p
        className="reveal reveal-d2"
        style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.75, color: "var(--cream-dim)", maxWidth: 580, marginBottom: 64, position: "relative" }}
      >
        Cheese isn&apos;t for everybody — yet. Three tiers, three levels of access, each with more power than the last. The question is: where do you belong?
      </p>

      <div
        className="tiers-responsive"
        style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22, position: "relative" }}
      >
        {tiers.map((t, i) => (
          <div
            key={t.name}
            className={`tier-card-base reveal reveal-d${i + 1} ${t.featured ? "tier-card-featured" : ""}`}
          >
            {t.featured && (
              <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", background: "var(--gold)", color: "var(--black)", fontSize: 9.5, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", padding: "5px 20px", whiteSpace: "nowrap" }}>
                {t.featuredBadge}
              </div>
            )}
            <div style={{ fontFamily: "var(--font-bebas)", fontSize: 52, letterSpacing: 5, lineHeight: 1, marginBottom: 6, color: t.nameColor }}>
              {t.name}
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(245,238,216,0.35)", letterSpacing: "1px", marginBottom: 34 }}>{t.min}</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
              {t.features.map((f) => (
                <li key={f} style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.6, color: "rgba(245,238,216,0.72)", display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: "var(--gold)", flexShrink: 0 }}>—</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/waitlist"
              className="tier-btn"
              style={
                t.btnStyle === "fill"
                  ? { display: "block", marginTop: 38, padding: 14, textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", textDecoration: "none", background: "var(--gold)", color: "var(--black)", transition: "background 0.3s" }
                  : { display: "block", marginTop: 38, padding: 14, textAlign: "center", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", textDecoration: "none", border: "1px solid rgba(201,168,76,0.35)", color: "var(--gold)", transition: "background 0.3s" }
              }
              onMouseEnter={(e) => {
                if (t.btnStyle === "fill") (e.currentTarget as HTMLElement).style.background = "var(--gold-light)";
                else (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.08)";
              }}
              onMouseLeave={(e) => {
                if (t.btnStyle === "fill") (e.currentTarget as HTMLElement).style.background = "var(--gold)";
                else (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {t.btnLabel}
            </Link>
          </div>
        ))}
      </div>
      <style>{`@media(max-width:960px){.tiers-responsive{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
