"use client";

import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Download App", href: "/waitlist" },
    { label: "How It Works", href: "#how" },
    { label: "Tiers & Pricing", href: "#tiers" },
    { label: "Merchant Partners", href: "#offers" },
  ],
  Company: [
    { label: "About Cheese", href: "/about" },
    { label: "Security", href: "#trust" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
  ],
  Connect: [
    { label: "WhatsApp Community", href: "https://wa.me/" },
    { label: "Telegram Channel", href: "https://t.me/" },
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "Support", href: "/support" },
  ],
};

function FooterLink({ label, href }: { label: string; href: string }) {
  const isAnchor = href.startsWith("#");
  const isExternal = href.startsWith("http");

  const style: React.CSSProperties = { color: "rgba(245,238,216,0.5)", textDecoration: "none", fontSize: 14, display: "block", transition: "color 0.3s" };

  const hover = (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = "var(--gold)");
  const unhover = (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = "rgba(245,238,216,0.5)");

  if (isAnchor) {
    return (
      <a
        href={href}
        style={style}
        onMouseEnter={hover}
        onMouseLeave={unhover}
        onClick={(e) => {
          e.preventDefault();
          const el = document.querySelector(href);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      >
        {label}
      </a>
    );
  }

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style} onMouseEnter={hover} onMouseLeave={unhover}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} style={style} onMouseEnter={hover} onMouseLeave={unhover}>
      {label}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer style={{ background: "var(--black)", borderTop: "1px solid rgba(201,168,76,0.1)", padding: "70px 6% 40px" }}>
      <div
        className="footer-grid"
        style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr", gap: 60, marginBottom: 60 }}
      >
        {/* Brand */}
        <div>
          <Link
            href="/"
            style={{ fontFamily: "var(--font-bebas)", fontSize: 34, letterSpacing: 4, color: "var(--gold)", textDecoration: "none", display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 1 }}>
              <path d="M2 20h20L12 3 2 20z" />
              <circle cx="9.5" cy="15" r="1.25" strokeWidth={1.5} />
              <circle cx="14.5" cy="13.5" r="1" strokeWidth={1.5} />
              <circle cx="12" cy="18" r="0.875" strokeWidth={1.5} />
            </svg>
            CHEESE
            <span style={{ width: 7, height: 7, background: "var(--cream)", borderRadius: "50%", display: "inline-block", marginBottom: 2 }} />
          </Link>
          <p style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(245,238,216,0.35)", maxWidth: 270 }}>
            A simple, secure wallet that holds your money in US dollars — so it stays strong no matter what happens to the Naira. Built for Lagos. Abuja. Port Harcourt. Nigeria.
          </p>
        </div>

        {/* Link columns */}
        {Object.entries(footerLinks).map(([col, links]) => (
          <div key={col}>
            <div style={{ fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase", color: "rgba(245,238,216,0.3)", fontWeight: 600, marginBottom: 20 }}>
              {col}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {links.map((l) => (
                <FooterLink key={l.label} label={l.label} href={l.href} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid rgba(201,168,76,0.08)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div style={{ fontSize: 12, color: "rgba(245,238,216,0.22)", letterSpacing: "0.5px" }}>
          © {new Date().getFullYear()} Cheese Wallet. All rights reserved.
        </div>
        <div style={{ fontSize: 11, color: "rgba(245,238,216,0.18)", maxWidth: 540, lineHeight: 1.65 }}>
          Cheese Wallet is a digital dollar wallet powered by USDC — a fully-reserved stablecoin redeemable 1:1 for US dollars. Yield rates are variable and not guaranteed. Cheese Wallet is not a licensed bank. Please read our Terms of Service and Privacy Policy before use.
        </div>
      </div>
      <style>{`@media(max-width:960px){.footer-grid{grid-template-columns:1fr 1fr!important;gap:40px!important}}`}</style>
    </footer>
  );
}
