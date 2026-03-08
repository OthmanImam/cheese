"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const links = [
  { label: "Offers",       href: "/#offers" },
  { label: "Tiers",        href: "/#tiers" },
  { label: "How It Works", href: "/#how" },
  { label: "Security",     href: "/#trust" },
];

export default function Navbar() {
  const [shrunk, setShrunk]       = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setShrunk(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`nav-base${shrunk ? " nav-shrunk" : ""}`}
      style={{ zIndex: 200 }}
    >
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <div style={{
          width: 32, height: 32,
          background: "linear-gradient(135deg, var(--gold), #A8822C)",
          clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} />
        <span style={{
          fontFamily: "var(--font-bebas)", fontSize: 22, letterSpacing: 3,
          color: "var(--cream)",
        }}>
          CHEESE
        </span>
      </Link>

      {/* Desktop links */}
      <ul style={{
        display: "flex", gap: 36, listStyle: "none", margin: 0, padding: 0,
        alignItems: "center",
      }}
        className="nav-links-desktop"
      >
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              style={{
                fontSize: 13, fontWeight: 500, letterSpacing: "0.5px",
                color: "rgba(245,238,216,0.55)", textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--cream)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(245,238,216,0.55)")}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href="/waitlist"
        className="btn-gold-shimmer"
        style={{
          background: "var(--gold)", color: "var(--black)",
          padding: "10px 22px", fontSize: 13, fontWeight: 700,
          letterSpacing: "1.5px", textTransform: "uppercase",
          textDecoration: "none",
          transition: "background 0.3s",
        }}
      >
        Join Waitlist
      </Link>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          display: "none", background: "none", border: "none",
          cursor: "pointer", padding: 4, color: "var(--cream)",
        }}
        className="nav-hamburger"
        aria-label="Toggle menu"
      >
        {menuOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "var(--charcoal)",
          borderBottom: "1px solid rgba(201,168,76,0.12)",
          padding: "20px 6%",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {links.map((l) => (
            <Link
              key={l.label} href={l.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontSize: 15, color: "var(--cream-dim)", textDecoration: "none",
                fontWeight: 500, letterSpacing: "0.5px",
              }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/waitlist"
            onClick={() => setMenuOpen(false)}
            style={{
              background: "var(--gold)", color: "var(--black)",
              padding: "12px 20px", fontSize: 13, fontWeight: 700,
              letterSpacing: "1.5px", textTransform: "uppercase",
              textDecoration: "none", textAlign: "center", marginTop: 8,
            }}
          >
            Join Waitlist
          </Link>
        </div>
      )}
    </nav>
  );
}
